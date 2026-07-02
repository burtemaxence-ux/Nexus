import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkCompliance, RULES, type ShiftRecord, type EmployeeMeta, type Severity } from '@/lib/compliance/rules'
import { getMondayOfWeek, addDays, toISODate } from '@/lib/utils/dates'
import { notifyManagers } from '@/lib/notifications/notify'

const SEVERITY_TO_LEVEL: Record<Severity, 'CRITICAL' | 'WARNING' | 'INFO'> = {
  critical: 'CRITICAL',
  warning: 'WARNING',
  info: 'INFO',
}

/**
 * Recalcule la conformité planning d'un employé sur la semaine ISO (lun→dim)
 * contenant `anyDateInWeek`, et persiste un instantané dans compliance_alerts
 * (type='planning_conformity').
 *
 * Politique "stocker, ne pas bloquer" : on trace les violations côté serveur au
 * moment de l'écriture, sans jamais empêcher la sauvegarde du shift.
 *
 * - Idempotent par (établissement, employé, semaine) : l'instantané précédent
 *   est remplacé, donc rejouer la synchro ne crée pas de doublons et les
 *   violations résolues (shift corrigé) disparaissent.
 * - Non bloquant : toute erreur (dont la migration 071 non encore appliquée →
 *   violation de contrainte CHECK) est loguée puis avalée. NE JETTE JAMAIS.
 * - Écriture via service-role (comme le cron compliance-check).
 *
 * Note : l'instantané est borné à la semaine ISO éditée. Les infractions de
 * repos quotidien exactement à la frontière dimanche→lundi entre deux semaines
 * ne sont pas rattachées ici (elles le sont lors de l'édition de la semaine
 * voisine) — c'est un compromis assumé pour éviter les doublons inter-semaines.
 */
export async function syncPlanningConformity(opts: {
  establishmentId: string
  employeeId: string
  anyDateInWeek: string // 'YYYY-MM-DD'
}): Promise<void> {
  const { establishmentId, employeeId, anyDateInWeek } = opts
  try {
    const monday = toISODate(getMondayOfWeek(new Date(anyDateInWeek + 'T00:00:00')))
    const sunday = toISODate(addDays(new Date(monday + 'T00:00:00'), 6))

    const [{ data: shifts }, { data: profile }, { data: prevRows }] = await Promise.all([
      supabaseAdmin
        .from('shifts')
        .select('id, employee_id, date, start_time, end_time, break_minutes')
        .eq('employee_id', employeeId)
        .gte('date', monday)
        .lte('date', sunday)
        .is('deleted_at', null),
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, birth_date, contract_type, weekly_hours')
        .eq('id', employeeId)
        .maybeSingle(),
      // Instantané précédent : pour ne notifier que les NOUVELLES infractions.
      supabaseAdmin
        .from('compliance_alerts')
        .select('level, options')
        .eq('establishment_id', establishmentId)
        .eq('employee_id', employeeId)
        .eq('type', 'planning_conformity')
        .eq('options->>week_monday', monday),
    ])

    const employees: EmployeeMeta[] = profile
      ? [{
          id: profile.id,
          birthDate: profile.birth_date ?? null,
          contractType: profile.contract_type ?? null,
          weeklyHours: profile.weekly_hours ?? null,
        }]
      : []

    const records: ShiftRecord[] = (shifts ?? []).map((s: {
      id: string; employee_id: string; date: string
      start_time: string; end_time: string; break_minutes: number | null
    }) => ({
      id: s.id,
      employeeId: s.employee_id,
      date: s.date,
      startTime: String(s.start_time).slice(0, 5),
      endTime: String(s.end_time).slice(0, 5),
      breakMinutes: s.break_minutes ?? 0,
    }))

    const violations = checkCompliance(records, employees)

    // Clés des infractions critiques déjà connues sur cette semaine (rule+date),
    // pour ne notifier que ce qui vient d'apparaître (anti-spam sur ré-éditions).
    const prevCriticalKeys = new Set<string>(
      ((prevRows ?? []) as { level: string; options: { rule_id?: string; date?: string } | null }[])
        .filter(r => r.level === 'CRITICAL' && r.options?.rule_id && r.options?.date)
        .map(r => `${r.options!.rule_id}__${r.options!.date}`)
    )
    const newCriticals = violations.filter(
      v => RULES[v.ruleId].severity === 'critical' && !prevCriticalKeys.has(`${v.ruleId}__${v.date}`)
    )

    // Remplacement idempotent de l'instantané de la semaine pour cet employé.
    await supabaseAdmin
      .from('compliance_alerts')
      .delete()
      .eq('establishment_id', establishmentId)
      .eq('employee_id', employeeId)
      .eq('type', 'planning_conformity')
      .eq('options->>week_monday', monday)

    // Notif temps réel aux managers sur les nouvelles infractions critiques.
    if (newCriticals.length > 0) {
      await notifyNewCriticals({
        establishmentId,
        employeeName: profile?.full_name ?? null,
        weekMonday: monday,
        ruleNames: Array.from(new Set(newCriticals.map(v => RULES[v.ruleId].name))),
        count: newCriticals.length,
      })
    }

    if (violations.length === 0) return

    const rows = violations.map((v) => {
      const rule = RULES[v.ruleId]
      return {
        establishment_id: establishmentId,
        employee_id: employeeId,
        type: 'planning_conformity',
        level: SEVERITY_TO_LEVEL[rule.severity],
        title: rule.name,
        message: v.description,
        options: {
          week_monday: monday,
          rule_id: v.ruleId,
          date: v.date,
          legal_ref: rule.legalRef,
          suggested_fix: v.suggestedFix ?? null,
        },
        status: 'active',
      }
    })

    await supabaseAdmin.from('compliance_alerts').insert(rows)
  } catch (e) {
    console.error('[syncPlanningConformity] non-bloquant:', e instanceof Error ? e.message : e)
  }
}

/**
 * Notifie les managers de l'établissement (in-app + push) qu'une modification
 * de planning vient d'introduire des infractions critiques au Code du travail.
 * Best-effort ; l'appelant est déjà protégé par un try/catch.
 */
async function notifyNewCriticals(opts: {
  establishmentId: string
  employeeName: string | null
  weekMonday: string
  ruleNames: string[]
  count: number
}): Promise<void> {
  const { establishmentId, employeeName, weekMonday, ruleNames, count } = opts

  const { data: managers } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'manager')
    .eq('archived', false)
    .or(`establishment_id.eq.${establishmentId},active_establishment_id.eq.${establishmentId}`)

  const managerIds = (managers ?? []).map((m: { id: string }) => m.id)
  if (managerIds.length === 0) return

  const who = employeeName ?? 'Un employé'
  const first = who.split(' ')[0]
  const weekLabel = new Date(weekMonday + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const rulesLabel = ruleNames.slice(0, 3).join(', ')

  await notifyManagers({
    managerIds,
    establishmentId,
    type: 'compliance_planning_critical',
    title: `Infraction critique — ${who}`,
    body: `${count} infraction(s) critique(s) au Code du travail sur la semaine du ${weekLabel} : ${rulesLabel}.`,
    data: { employee_name: who, week_monday: weekMonday, rules: ruleNames },
    actionUrl: '/manager/planning',
    pushTitle: `⚠️ Conformité — ${first}`,
    pushBody: rulesLabel,
  })
}
