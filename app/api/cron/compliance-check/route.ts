import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifyManagers } from '@/lib/notifications/notify'
import { getISOWeekString } from '@/lib/utils/dates'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { captureError } from '@/lib/logger'
import { sendSlackMessage } from '@/lib/integrations/slack'

const anthropic = new Anthropic()

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertType = 'hours_exceeded' | 'trial_ending' | 'cdd_ending' | 'requalification_risk'
type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL'

interface DetectedAlert {
  employee_id: string
  establishment_id: string
  type: AlertType
  level: AlertLevel
  title: string
  contextForClaude: string
  options?: Record<string, unknown>
}

interface EmployeeRow {
  id: string
  full_name: string
  establishment_id: string
}

interface ContractRow {
  id: string
  employee_id: string
  type: string
  weekly_hours: number
  start_date: string
  end_date: string | null
  hourly_rate: number | null
  trial_period_days: number | null
}

interface PresenceRow {
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  break_start: string | null
  break_end: string | null
}

interface ShiftRow {
  employee_id: string
  date: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────


function presenceHours(p: PresenceRow): number {
  if (!p.clock_in || !p.clock_out) return 0
  const workedMs = new Date(p.clock_out).getTime() - new Date(p.clock_in).getTime()
  let breakMs = 0
  if (p.break_start && p.break_end) {
    breakMs = new Date(p.break_end).getTime() - new Date(p.break_start).getTime()
  }
  return Math.max(0, (workedMs - breakMs) / 3600000)
}

async function generateMessage(contextForClaude: string): Promise<string> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: `Tu es assistant RH. Rédige exactement 2 phrases en français direct et professionnel résumant cette situation pour un manager. Pas de jargon, pas de bullet points, juste 2 phrases.\n\nSituation : ${contextForClaude}`,
      }],
    })
    const block = msg.content[0]
    return block.type === 'text' ? block.text.trim() : contextForClaude
  } catch {
    return contextForClaude
  }
}

function buildActiveAlertSet(alerts: { employee_id: string; type: string }[]): Set<string> {
  return new Set(alerts.map(a => `${a.employee_id}__${a.type}`))
}

// Priorité du contrat « principal » (référence pour le calcul heures réelles vs
// contractuelles, qui suppose un seul contrat) : CDI > CDD > Apprentissage >
// Stage > Extra. Les types sont libres (« CDI 35h », « CDD »…) → match par préfixe.
function contractRank(type: string): number {
  const t = (type || '').toLowerCase()
  if (t.startsWith('cdi')) return 0
  if (t.startsWith('cdd')) return 1
  if (t.startsWith('appren')) return 2
  if (t.startsWith('stage')) return 3
  if (t.startsWith('extra')) return 4
  return 5
}

async function getManagerIds(establishment_id: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'manager')
    .eq('archived', false)
    .or(`establishment_id.eq.${establishment_id},active_establishment_id.eq.${establishment_id}`)
  return (data ?? []).map((p: { id: string }) => p.id)
}

// ─── Analyse A — Dépassement heures contrat ───────────────────────────────────

async function analyseHoursExceeded(
  employee: EmployeeRow,
  contract: ContractRow,
  presences: PresenceRow[],
): Promise<DetectedAlert | null> {
  // Group presences by ISO week
  const weekMap = new Map<string, number>()
  for (const p of presences) {
    const week = getISOWeekString(new Date(p.date))
    weekMap.set(week, (weekMap.get(week) ?? 0) + presenceHours(p))
  }

  const weeks = Array.from(weekMap.keys()).sort()
  if (weeks.length < 6) return null

  const threshold = contract.weekly_hours * 1.1

  // Count trailing consecutive exceeding weeks
  let consecutive = 0
  for (let i = weeks.length - 1; i >= 0; i--) {
    if ((weekMap.get(weeks[i]) ?? 0) > threshold) {
      consecutive++
    } else {
      break
    }
  }

  if (consecutive < 6) return null

  const totalHours = Array.from(weekMap.values()).reduce((a, b) => a + b, 0)
  const avgHours = totalHours / weeks.length
  const semRestantes = Math.max(0, 12 - consecutive)
  const level: AlertLevel = consecutive >= 10 ? 'CRITICAL' : 'WARNING'

  const firstName = employee.full_name.split(' ')[0]
  const context = `${firstName} — contrat ${contract.type} ${contract.weekly_hours}h/sem. Heures réelles moyennes : ${avgHours.toFixed(1)}h/sem sur ${weeks.length} semaines. ${consecutive} semaines consécutives de dépassement (>10%). Risque de requalification dans ${semRestantes} semaine(s).`

  return {
    employee_id: employee.id,
    establishment_id: employee.establishment_id,
    type: 'hours_exceeded',
    level,
    title: `Dépassement heures — ${employee.full_name}`,
    contextForClaude: context,
    options: {
      consecutive_weeks: consecutive,
      avg_hours: parseFloat(avgHours.toFixed(2)),
      contract_hours: contract.weekly_hours,
      weeks_before_risk: semRestantes,
    },
  }
}

// ─── Analyse B — Fin de période d'essai ──────────────────────────────────────

async function analyseTrialEnding(
  employee: EmployeeRow,
  contract: ContractRow,
  now: Date,
): Promise<DetectedAlert | null> {
  if (!contract.trial_period_days) return null

  const startDate = new Date(contract.start_date)
  const trialEnd = new Date(startDate.getTime() + contract.trial_period_days * 86400000)

  const diffMs = trialEnd.getTime() - now.getTime()
  const diffDays = diffMs / 86400000

  let level: AlertLevel

  if (diffDays < 0) {
    // Période dépassée — vérifier qu'il n'y a pas d'alerte resolved de ce type
    const { data: resolved } = await supabaseAdmin
      .from('compliance_alerts')
      .select('id')
      .eq('employee_id', employee.id)
      .eq('type', 'trial_ending')
      .eq('status', 'resolved')
      .limit(1)
    if (resolved?.length) return null
    level = 'CRITICAL'
  } else if (diffDays < 5) {
    level = 'WARNING'
  } else if (diffDays < 14) {
    level = 'INFO'
  } else {
    return null
  }

  const firstName = employee.full_name.split(' ')[0]
  const trialEndStr = trialEnd.toLocaleDateString('fr-FR')
  const context = diffDays < 0
    ? `${firstName} — La période d'essai (${contract.trial_period_days}j) est terminée depuis ${Math.abs(Math.round(diffDays))} jour(s) sans décision formalisée.`
    : `${firstName} — Période d'essai (${contract.trial_period_days}j) se termine le ${trialEndStr}, dans ${Math.round(diffDays)} jour(s). Décision à prendre.`

  return {
    employee_id: employee.id,
    establishment_id: employee.establishment_id,
    type: 'trial_ending',
    level,
    title: `Période d'essai — ${employee.full_name}`,
    contextForClaude: context,
    options: {
      trial_end_date: trialEnd.toISOString(),
      days_remaining: Math.round(diffDays),
      trial_period_days: contract.trial_period_days,
    },
  }
}

// ─── Analyse C — Fin de CDD approchante ──────────────────────────────────────

async function analyseCddEnding(
  employee: EmployeeRow,
  contract: ContractRow,
  now: Date,
): Promise<DetectedAlert | null> {
  if (!contract.end_date) return null

  const endDate = new Date(contract.end_date)
  const diffMs = endDate.getTime() - now.getTime()
  const diffDays = diffMs / 86400000

  let level: AlertLevel
  if (diffDays < 0) {
    level = 'CRITICAL'
  } else if (diffDays < 7) {
    level = 'WARNING'
  } else if (diffDays < 30) {
    level = 'INFO'
  } else {
    return null
  }

  const firstName = employee.full_name.split(' ')[0]
  const endStr = endDate.toLocaleDateString('fr-FR')
  const context = diffDays < 0
    ? `${firstName} — CDD ${contract.weekly_hours}h terminé depuis ${Math.abs(Math.round(diffDays))} jour(s) (échéance : ${endStr}). Situation à régulariser.`
    : `${firstName} — CDD ${contract.weekly_hours}h se termine le ${endStr} dans ${Math.round(diffDays)} jour(s). Renouvellement ou fin de contrat à décider.`

  return {
    employee_id: employee.id,
    establishment_id: employee.establishment_id,
    type: 'cdd_ending',
    level,
    title: `Fin de CDD — ${employee.full_name}`,
    contextForClaude: context,
    options: {
      end_date: contract.end_date,
      days_remaining: Math.round(diffDays),
      contract_type: contract.type,
      weekly_hours: contract.weekly_hours,
    },
  }
}

// ─── Analyse D — Risque requalification Extra ─────────────────────────────────

async function analyseRequalificationRisk(
  employee: EmployeeRow,
  contract: ContractRow,
  shifts: ShiftRow[],
  now: Date,
): Promise<DetectedAlert | null> {
  if (contract.type !== 'Extra') return null

  // Shifts des 56 derniers jours
  const cutoff = new Date(now.getTime() - 56 * 86400000)
  const recentShifts = shifts.filter(s => new Date(s.date) >= cutoff)

  if (!recentShifts.length) return null

  // Count distinct weeks with presence
  const weeksPresent = new Set(recentShifts.map(s => getISOWeekString(new Date(s.date))))
  if (weeksPresent.size < 6) return null

  // Check recurring day patterns (same weekday 3+ times)
  const dayCount = new Map<number, number>()
  for (const s of recentShifts) {
    const day = new Date(s.date).getDay()
    dayCount.set(day, (dayCount.get(day) ?? 0) + 1)
  }
  const hasPattern = Array.from(dayCount.values()).some(c => c >= 3)
  if (!hasPattern) return null

  const firstName = employee.full_name.split(' ')[0]
  const context = `${firstName} — Contrat Extra mais présences régulières sur ${weeksPresent.size} semaines sur les 8 dernières avec patterns récurrents. Risque de requalification en CDI (Art. L1245-1 Code du travail).`

  return {
    employee_id: employee.id,
    establishment_id: employee.establishment_id,
    type: 'requalification_risk',
    level: 'WARNING',
    title: `Risque requalification Extra — ${employee.full_name}`,
    contextForClaude: context,
    options: {
      weeks_present: weeksPresent.size,
      recent_shifts_count: recentShifts.length,
    },
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = { establishments: 0, alerts_created: 0, errors: 0 }

  try {
    const { data: establishments, error: estErr } = await supabaseAdmin
      .from('establishments')
      .select('id, name')
      .eq('is_active', true)

    if (estErr || !establishments?.length) {
      return NextResponse.json({ error: estErr?.message ?? 'No establishments', ...results }, { status: 500 })
    }

    for (const est of establishments) {
      try {
        results.establishments++

        // Récupérer les employés actifs de cet établissement
        const { data: employees } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, establishment_id')
          .eq('role', 'employee')
          .eq('archived', false)
          .or(`establishment_id.eq.${est.id},active_establishment_id.eq.${est.id}`)

        if (!employees?.length) continue

        const employeeIds = employees.map((e: EmployeeRow) => e.id)

        // Récupérer les contrats actifs
        const { data: contracts } = await supabaseAdmin
          .from('contracts')
          .select('id, employee_id, type, weekly_hours, start_date, end_date, hourly_rate, trial_period_days')
          .in('employee_id', employeeIds)
          .or('end_date.is.null,end_date.gte.' + now.toISOString().slice(0, 10))
          .order('created_at', { ascending: false })

        if (!contracts?.length) continue

        // Tous les contrats actifs par employé (un employé peut en avoir plusieurs
        // simultanément : ex. CDI + Extra). On les analyse tous pour ne rien masquer.
        const contractsByEmployee = new Map<string, ContractRow[]>()
        for (const c of contracts as ContractRow[]) {
          const arr = contractsByEmployee.get(c.employee_id) ?? []
          arr.push(c)
          contractsByEmployee.set(c.employee_id, arr)
        }

        // Presences des 12 dernières semaines
        const since84days = new Date(now.getTime() - 84 * 86400000).toISOString().slice(0, 10)
        const { data: presences } = await supabaseAdmin
          .from('presences')
          .select('employee_id, date, clock_in, clock_out, break_start, break_end')
          .in('employee_id', employeeIds)
          .gte('date', since84days)

        const presencesByEmployee = new Map<string, PresenceRow[]>()
        for (const p of (presences ?? []) as PresenceRow[]) {
          const arr = presencesByEmployee.get(p.employee_id) ?? []
          arr.push(p)
          presencesByEmployee.set(p.employee_id, arr)
        }

        // Shifts des 56 derniers jours (pour analyse D)
        const since56days = new Date(now.getTime() - 56 * 86400000).toISOString().slice(0, 10)
        const { data: shifts } = await supabaseAdmin
          .from('shifts')
          .select('employee_id, date')
          .in('employee_id', employeeIds)
          .gte('date', since56days)
          .eq('status', 'published')

        const shiftsByEmployee = new Map<string, ShiftRow[]>()
        for (const s of (shifts ?? []) as ShiftRow[]) {
          const arr = shiftsByEmployee.get(s.employee_id) ?? []
          arr.push(s)
          shiftsByEmployee.set(s.employee_id, arr)
        }

        // Managers à notifier
        const managerIds = await getManagerIds(est.id)

        // Pré-fetch de toutes les alertes actives en un seul batch (évite N+1)
        const { data: existingAlerts } = await supabaseAdmin
          .from('compliance_alerts')
          .select('employee_id, type')
          .eq('establishment_id', est.id)
          .eq('status', 'active')
          .in('employee_id', employeeIds)

        const activeAlertSet = buildActiveAlertSet(existingAlerts ?? [])

        // Analyser chaque employé
        for (const employee of employees as EmployeeRow[]) {
          // Forcer l'establishment_id de l'itération courante
          const emp = { ...employee, establishment_id: est.id }
          const empContracts = contractsByEmployee.get(emp.id) ?? []
          if (empContracts.length === 0) continue

          // Contrat de référence (priorité CDI > CDD > Apprentissage > Stage > Extra)
          // pour le calcul heures réelles vs contractuelles.
          const primaryContract = empContracts
            .slice()
            .sort((a, b) => contractRank(a.type) - contractRank(b.type))[0]

          const empPresences = presencesByEmployee.get(emp.id) ?? []
          const empShifts = shiftsByEmployee.get(emp.id) ?? []

          // Heures vs contrat : une seule fois sur le contrat de référence.
          // Essai / fin de contrat / requalification : par contrat (spécifiques au
          // type) afin de ne masquer aucune alerte d'un employé multi-contrats.
          const candidates: Array<DetectedAlert | null> = [
            await analyseHoursExceeded(emp, primaryContract, empPresences),
          ]
          for (const c of empContracts) {
            candidates.push(await analyseTrialEnding(emp, c, now))
            candidates.push(await analyseCddEnding(emp, c, now))
            candidates.push(await analyseRequalificationRisk(emp, c, empShifts, now))
          }

          for (const alert of candidates) {
            if (!alert) continue

            // Anti-doublon : check en mémoire depuis le batch pré-fetché
            const exists = activeAlertSet.has(`${alert.employee_id}__${alert.type}`)
            if (exists) continue

            // Générer le message via Claude Haiku
            const message = await generateMessage(alert.contextForClaude)

            // Insérer l'alerte
            const { error: insertErr } = await supabaseAdmin
              .from('compliance_alerts')
              .insert({
                establishment_id: alert.establishment_id,
                employee_id: alert.employee_id,
                type: alert.type,
                level: alert.level,
                title: alert.title,
                message,
                options: alert.options ?? {},
                status: 'active',
              })

            if (insertErr) {
              console.error('[compliance-check] insert error:', insertErr.message)
              results.errors++
              continue
            }

            results.alerts_created++
            // Dédup intra-run : un employé multi-contrats ne doit pas générer
            // deux alertes du même type dans la même exécution.
            activeAlertSet.add(`${alert.employee_id}__${alert.type}`)

            // Notifier les managers
            if (managerIds.length) {
              const firstName = alert.title.split('—')[1]?.trim() ?? ''
              await notifyManagers({
                managerIds,
                establishmentId: alert.establishment_id,
                type: 'compliance_alert',
                title: alert.title,
                body: message.slice(0, 160),
                data: { alert_type: alert.type, level: alert.level, employee_id: alert.employee_id },
                actionUrl: '/manager/alertes',
                pushTitle: `⚠️ Alerte conformité${firstName ? ` — ${firstName}` : ''}`,
                pushBody: message.slice(0, 80),
              })
            }

            if (alert.level === 'CRITICAL') {
              const webhookUrl = process.env.SLACK_WEBHOOK_URL
              if (webhookUrl) {
                const slackMsg = `🔴 Alerte contractuelle — ${est.name} : ${message} (Employé : ${emp.full_name})`
                await sendSlackMessage(webhookUrl, slackMsg).catch(e => console.error('Slack:', e))
              }
            }
          }
        }
      } catch (estErr) {
        captureError(estErr, { cron: 'compliance-check', establishment_id: est.id })
        results.errors++
      }
    }

    console.log(`[compliance-check] done:`, results)
    return NextResponse.json(results)
  } catch (err) {
    captureError(err, { cron: 'compliance-check', fatal: true })
    return NextResponse.json({ error: 'Erreur serveur', ...results }, { status: 500 })
  }
}
