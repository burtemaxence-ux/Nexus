import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifyManagers } from '@/lib/notifications/notify'
import { getISOWeekNumber, getLastWeekBounds, getThisWeekBounds, addDays } from '@/lib/utils/dates'
import { sendWeeklyBriefEmail } from '@/lib/email/weekly-brief-email'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { captureError } from '@/lib/logger'

// Vercel Cron : tous les lundis à 07h00 UTC  →  "0 7 * * 1"

const anthropic = new Anthropic()

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoWeekLabel(monday: Date): string {
  const weekNum = getISOWeekNumber(monday)
  const year = monday.getFullYear()
  return `Semaine ${weekNum} (${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${addDays(monday, 6).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })})`
}

// ── Brief generation (Claude Haiku) ──────────────────────────────────────────

async function generateBrief(contextData: string): Promise<string> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 280,
      messages: [{
        role: 'user',
        content: `Tu es un collègue RH qui fait le point hebdomadaire à un manager de restauration/commerce.
Rédige exactement 5 phrases en français direct, SANS titre, SANS bullet points, SANS mise en forme.
Chaque phrase tient sur une ligne.

Structure :
- Phrase 1 : bilan présence (chiffre + comparaison semaine précédente si disponible)
- Phrase 2 : point d'attention si anomalie (absence imprévue, retard récurrent, dépassement budget) — si aucune anomalie, phrase positive sur la régularité
- Phrase 3 : alerte légale si active (conformité contractuelle) — sinon "Aucune alerte contractuelle active cette semaine."
- Phrase 4 : point positif si existant — sinon "Semaine dans les normes."
- Phrase 5 : 1 recommandation concrète et courte pour la semaine

Données :
${contextData}

Réponds uniquement avec les 5 phrases, séparées par un saut de ligne. Pas de numérotation.`,
      }],
    })
    const block = msg.content[0]
    return block.type === 'text' ? block.text.trim() : contextData
  } catch {
    return 'Brief non disponible cette semaine — données collectées et disponibles dans Nexus.'
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const { start: lastStart, end: lastEnd } = getLastWeekBounds(now)
  const { start: thisStart, end: thisEnd } = getThisWeekBounds(now)
  const lastMon = lastStart.toISOString().slice(0, 10)
  const lastSun = lastEnd.toISOString().slice(0, 10)
  const thisMon = thisStart.toISOString().slice(0, 10)
  const thisSun = thisEnd.toISOString().slice(0, 10)
  const lastMonDate = new Date(lastMon + 'T00:00:00')
  const weekLabel = isoWeekLabel(lastMonDate)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const results = { establishments: 0, briefs_sent: 0, errors: 0 }

  try {
  // Récupérer tous les établissements actifs
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

      // ── Managers avec email ─────────────────────────────────────────────
      const { data: managers } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'manager')
        .eq('archived', false)
        .or(`establishment_id.eq.${est.id},active_establishment_id.eq.${est.id}`)
        .not('email', 'is', null)

      if (!managers?.length) continue

      // ── Employés actifs ─────────────────────────────────────────────────
      const { data: employees } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'employee')
        .eq('archived', false)
        .or(`establishment_id.eq.${est.id},active_establishment_id.eq.${est.id}`)

      const employeeIds = (employees ?? []).map((e: { id: string }) => e.id)
      if (!employeeIds.length) continue

      // ── Données semaine écoulée ─────────────────────────────────────────

      const [
        { data: shiftsLastWeek },
        { data: presencesLastWeek },
        { data: latenessLastWeek },
        { data: leavesLastWeek },
        { count: complianceCount },
        { count: pendingLeavesCount },
        { data: shiftsThisWeek },
        { data: leavesThisWeek },
      ] = await Promise.all([
        // Shifts publiés semaine passée
        supabaseAdmin.from('shifts').select('id, employee_id, start_time, end_time, break_minutes').in('employee_id', employeeIds).gte('date', lastMon).lte('date', lastSun).eq('status', 'published'),
        // Présences semaine passée (avec pointage)
        supabaseAdmin.from('presences').select('employee_id, clock_in, clock_out, break_start, break_end').in('employee_id', employeeIds).gte('date', lastMon).lte('date', lastSun).not('clock_in', 'is', null),
        // Retards semaine passée
        supabaseAdmin.from('lateness_records').select('late_minutes, justified').in('employee_id', employeeIds).gte('date', lastMon).lte('date', lastSun),
        // Congés approuvés semaine passée
        supabaseAdmin.from('leave_requests').select('id').in('employee_id', employeeIds).eq('status', 'approved').lte('start_date', lastSun).gte('end_date', lastMon),
        // Alertes conformité actives
        supabaseAdmin.from('compliance_alerts').select('id', { count: 'exact', head: true }).eq('establishment_id', est.id).eq('status', 'active'),
        // Congés en attente
        supabaseAdmin.from('leave_requests').select('id', { count: 'exact', head: true }).in('employee_id', employeeIds).eq('status', 'pending'),
        // Shifts semaine en cours
        supabaseAdmin.from('shifts').select('id, employee_id').in('employee_id', employeeIds).gte('date', thisMon).lte('date', thisSun).eq('status', 'published'),
        // Congés approuvés semaine en cours
        supabaseAdmin.from('leave_requests').select('id, employee_id').in('employee_id', employeeIds).eq('status', 'approved').lte('start_date', thisSun).gte('end_date', thisMon),
      ])

      const totalShifts = shiftsLastWeek?.length ?? 0

      // Pas de données — on n'envoie pas
      if (totalShifts === 0 && !(presencesLastWeek?.length)) continue

      // ── Calculs semaine passée ──────────────────────────────────────────

      const presentEmployees = new Set((presencesLastWeek ?? []).map((p: { employee_id: string }) => p.employee_id))
      const presenceRate = totalShifts > 0
        ? Math.round((presentEmployees.size / new Set((shiftsLastWeek ?? []).map((s: { employee_id: string }) => s.employee_id)).size) * 100)
        : 0

      const absencesImprevues = totalShifts - (presencesLastWeek?.length ?? 0)
      const latenessRecords = (latenessLastWeek ?? []) as { late_minutes: number; justified: boolean }[]
      const retardsCount = latenessRecords.filter(l => !l.justified).length
      const retardsMinutesTotal = latenessRecords.filter(l => !l.justified).reduce((a, l) => a + l.late_minutes, 0)

      // Masse salariale estimée (si heures réelles dispo)
      let masseSalarialeReal = 0
      for (const p of (presencesLastWeek ?? []) as { employee_id: string; clock_in: string | null; clock_out: string | null; break_start: string | null; break_end: string | null }[]) {
        if (!p.clock_in || !p.clock_out) continue
        const h = (new Date(p.clock_out).getTime() - new Date(p.clock_in).getTime()) / 3600000
        const breakH = (p.break_start && p.break_end)
          ? (new Date(p.break_end).getTime() - new Date(p.break_start).getTime()) / 3600000
          : 0
        masseSalarialeReal += Math.max(0, h - breakH)
      }

      // ── Données semaine en cours ────────────────────────────────────────
      const shiftsThisCount = shiftsThisWeek?.length ?? 0
      const leavesThisCount = new Set((leavesThisWeek ?? []).map((l: { employee_id: string }) => l.employee_id)).size

      // ── Contexte pour Claude ────────────────────────────────────────────
      const contextLines = [
        `Établissement : ${est.name}`,
        `Semaine analysée : ${weekLabel}`,
        ``,
        `=== SEMAINE ÉCOULÉE ===`,
        `Shifts planifiés : ${totalShifts}`,
        `Employés ayant pointé : ${presentEmployees.size}`,
        `Taux de présence estimé : ${presenceRate}%`,
        `Absences imprévues (shift sans pointage) : ${Math.max(0, absencesImprevues)}`,
        `Retards non justifiés : ${retardsCount} (total ${retardsMinutesTotal} min)`,
        `Congés approuvés cette semaine : ${leavesLastWeek?.length ?? 0}`,
        `Heures réelles travaillées (tous employés) : ${masseSalarialeReal.toFixed(1)}h`,
        `Alertes de conformité contractuelle actives : ${complianceCount ?? 0}`,
        ``,
        `=== SEMAINE EN COURS ===`,
        `Shifts planifiés cette semaine : ${shiftsThisCount}`,
        `Employés en congé approuvé : ${leavesThisCount}`,
        `Congés en attente de validation : ${pendingLeavesCount ?? 0}`,
      ].join('\n')

      // ── Génération brief via Claude ─────────────────────────────────────
      const briefText = await generateBrief(contextLines)

      // ── Envoi email + notification pour chaque manager ──────────────────
      const managerIds = managers.map((m: { id: string }) => m.id)

      await Promise.allSettled(
        (managers as { id: string; full_name: string | null; email: string }[]).map(async (manager) => {
          const firstName = manager.full_name?.split(' ')[0] ?? 'Manager'

          // Email Resend
          if (manager.email) {
            await sendWeeklyBriefEmail(manager.email, {
              managerFirstName: firstName,
              establishmentName: est.name,
              weekLabel,
              briefText,
              siteUrl,
            }).catch(e => console.error('[weekly-brief] email error:', e.message))
          }
        })
      )

      // Notification in-app + push (groupée pour tous les managers)
      await notifyManagers({
        managerIds,
        establishmentId: est.id,
        type: 'weekly_brief',
        title: `📊 Brief ${weekLabel}`,
        body: briefText.split('\n')[0].slice(0, 160),
        actionUrl: '/manager',
        pushTitle: `📊 Brief semaine disponible`,
        pushBody: briefText.split('\n')[0].slice(0, 100),
      })

      results.briefs_sent++
      console.log(`[weekly-brief] ${est.name} → brief envoyé à ${managers.length} manager(s)`)
    } catch (err) {
      captureError(err, { cron: 'weekly-brief-manager', establishment_id: est.id })
      results.errors++
    }
  }

  console.log('[weekly-brief-manager] done:', results)
  return NextResponse.json(results)
  } catch (err) {
    captureError(err, { cron: 'weekly-brief-manager', fatal: true })
    return NextResponse.json({ error: 'Erreur serveur', ...results }, { status: 500 })
  }
}
