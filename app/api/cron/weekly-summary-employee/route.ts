import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications/create'
import { sendPushToUser } from '@/lib/push'
import { getThisWeekBounds, addDays } from '@/lib/utils/dates'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { captureError } from '@/lib/logger'

// Cron RETIRÉ de vercel.json (décision M4, audit 2026-06-16) : coût IA sans
// preuve d'usage. Route conservée pour déclenchement manuel (Bearer CRON_SECRET).
// Pour réactiver : { "path": "/api/cron/weekly-summary-employee", "schedule": "0 18 * * 5" }

const anthropic = new Anthropic()

// ── Congés acquis estimés (2,5j / mois × mois travaillés) ────────────────────

function estimatedLeaveBalance(startDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const now = new Date()
  const monthsWorked = Math.max(0,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  )
  return Math.round(monthsWorked * 2.5 * 10) / 10
}

// ── Génération résumé via Claude Haiku ────────────────────────────────────────

async function generateSummary(ctx: string): Promise<string> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 160,
      messages: [{
        role: 'user',
        content: `Tu es un assistant RH bienveillant. Rédige 2 à 3 phrases courtes et encourageantes pour un employé résumant sa semaine de travail.
Ton : positif, humain, jamais culpabilisant. Utilise "tu". Pas de bullet points. Pas d'emojis sauf si explicitement demandé.
Si zéro retard → ajoute "🌟 Aucun retard cette semaine — parfait !"
Si congés estimés disponibles → mentionne-les.

Données :
${ctx}

Réponds uniquement avec les 2-3 phrases, directement.`,
      }],
    })
    const block = msg.content[0]
    return block.type === 'text' ? block.text.trim() : 'Belle semaine — bravo pour ton engagement !'
  } catch {
    return 'Merci pour cette semaine de travail. À la semaine prochaine !'
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const { start: weekStart } = getThisWeekBounds(now)
  const monday = weekStart.toISOString().slice(0, 10)
  const friday = addDays(weekStart, 4).toISOString().slice(0, 10)
  const results = { establishments: 0, summaries_sent: 0, errors: 0 }

  try {
  const { data: establishments } = await supabaseAdmin
    .from('establishments')
    .select('id, name')
    .eq('is_active', true)

  if (!establishments?.length) {
    return NextResponse.json({ message: 'Aucun établissement actif', ...results })
  }

  for (const est of establishments) {
    try {
      results.establishments++

      // Employés actifs de l'établissement
      const { data: employees } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'employee')
        .eq('archived', false)
        .or(`establishment_id.eq.${est.id},active_establishment_id.eq.${est.id}`)

      if (!employees?.length) continue

      const employeeIds = employees.map((e: { id: string }) => e.id)

      // Données semaine pour tous les employés (requêtes groupées)
      const [
        { data: presences },
        { data: latenessRecords },
        { data: approvedLeaves },
        { data: contracts },
      ] = await Promise.all([
        supabaseAdmin
          .from('presences')
          .select('employee_id, date, clock_in, clock_out, break_start, break_end')
          .in('employee_id', employeeIds)
          .gte('date', monday)
          .lte('date', friday)
          .not('clock_in', 'is', null),
        supabaseAdmin
          .from('lateness_records')
          .select('employee_id, late_minutes, justified')
          .in('employee_id', employeeIds)
          .gte('date', monday)
          .lte('date', friday),
        supabaseAdmin
          .from('leave_requests')
          .select('employee_id, type, start_date, end_date')
          .in('employee_id', employeeIds)
          .eq('status', 'approved')
          .lte('start_date', friday)
          .gte('end_date', monday),
        supabaseAdmin
          .from('contracts')
          .select('employee_id, start_date')
          .in('employee_id', employeeIds)
          .order('created_at', { ascending: false }),
      ])

      // Index par employé
      type PresenceRow = { employee_id: string; date: string; clock_in: string | null; clock_out: string | null; break_start: string | null; break_end: string | null }
      type LatenessRow = { employee_id: string; late_minutes: number; justified: boolean }
      type LeaveRow = { employee_id: string; type: string; start_date: string; end_date: string }
      type ContractRow = { employee_id: string; start_date: string }

      const presencesByEmp = new Map<string, PresenceRow[]>()
      for (const p of (presences ?? []) as PresenceRow[]) {
        const arr = presencesByEmp.get(p.employee_id) ?? []
        arr.push(p)
        presencesByEmp.set(p.employee_id, arr)
      }

      const latenessByEmp = new Map<string, LatenessRow[]>()
      for (const l of (latenessRecords ?? []) as LatenessRow[]) {
        const arr = latenessByEmp.get(l.employee_id) ?? []
        arr.push(l)
        latenessByEmp.set(l.employee_id, arr)
      }

      const leavesByEmp = new Map<string, LeaveRow[]>()
      for (const l of (approvedLeaves ?? []) as LeaveRow[]) {
        const arr = leavesByEmp.get(l.employee_id) ?? []
        arr.push(l)
        leavesByEmp.set(l.employee_id, arr)
      }

      // Contrat le plus récent par employé
      const contractByEmp = new Map<string, ContractRow>()
      for (const c of (contracts ?? []) as ContractRow[]) {
        if (!contractByEmp.has(c.employee_id)) {
          contractByEmp.set(c.employee_id, c)
        }
      }

      // Traiter chaque employé
      await Promise.allSettled(
        (employees as { id: string; full_name: string | null }[]).map(async (emp) => {
          const firstName = emp.full_name?.split(' ')[0] ?? 'toi'
          const empPresences = presencesByEmp.get(emp.id) ?? []
          const empLateness = latenessByEmp.get(emp.id) ?? []
          const empLeaves = leavesByEmp.get(emp.id) ?? []
          const contract = contractByEmp.get(emp.id)

          // Heures travaillées réelles
          let totalHours = 0
          let workedDays = 0
          for (const p of empPresences) {
            if (!p.clock_in || !p.clock_out) continue
            const h = (new Date(p.clock_out).getTime() - new Date(p.clock_in).getTime()) / 3600000
            const breakH = (p.break_start && p.break_end)
              ? (new Date(p.break_end).getTime() - new Date(p.break_start).getTime()) / 3600000
              : 0
            totalHours += Math.max(0, h - breakH)
            workedDays++
          }

          // Retards
          const retardsNonJustifies = empLateness.filter(l => !l.justified)
          const retardsMinutes = retardsNonJustifies.reduce((a, l) => a + l.late_minutes, 0)

          // Congés acquis estimés
          const leaveBalance = contract ? estimatedLeaveBalance(contract.start_date) : null

          // Skip si aucune activité cette semaine
          if (workedDays === 0 && empLeaves.length === 0) return

          // Contexte pour Claude
          const ctxLines = [
            `Prénom : ${firstName}`,
            `Heures travaillées : ${totalHours.toFixed(1)}h en ${workedDays} jour(s)`,
            retardsNonJustifies.length > 0
              ? `Retards : ${retardsNonJustifies.length} retard(s) non justifié(s), total ${retardsMinutes} min`
              : `Retards : aucun`,
            empLeaves.length > 0
              ? `Congés cette semaine : ${empLeaves.map(l => l.type).join(', ')}`
              : '',
            leaveBalance !== null
              ? `Congés acquis estimés : ${leaveBalance} jours`
              : '',
          ].filter(Boolean).join('\n')

          const summaryText = await generateSummary(ctxLines)

          // Notification in-app uniquement (pas d'email pour les employés)
          await createNotification({
            user_ids: [emp.id],
            establishment_id: est.id,
            type: 'weekly_summary',
            title: '📊 Ta semaine en chiffres',
            body: summaryText.slice(0, 200),
            action_url: '/employee',
          })

          // Push best-effort
          sendPushToUser(supabaseAdmin, emp.id, {
            title: '📊 Ta semaine en chiffres',
            body: summaryText.split('.')[0].slice(0, 100) + '.',
            url: '/employee',
          }).catch(console.error)

          results.summaries_sent++
        })
      )

      console.log(`[weekly-summary] ${est.name} → ${results.summaries_sent} résumés envoyés`)
    } catch (err) {
      captureError(err, { cron: 'weekly-summary-employee', establishment_id: est.id })
      results.errors++
    }
  }

  console.log('[weekly-summary-employee] done:', results)
  return NextResponse.json(results)
  } catch (err) {
    captureError(err, { cron: 'weekly-summary-employee', fatal: true })
    return NextResponse.json({ error: 'Erreur serveur', ...results }, { status: 500 })
  }
}
