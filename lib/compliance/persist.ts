import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkCompliance, RULES, type ShiftRecord, type Severity } from '@/lib/compliance/rules'
import { getMondayOfWeek, addDays, toISODate } from '@/lib/utils/dates'

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

    const { data: shifts } = await supabaseAdmin
      .from('shifts')
      .select('id, employee_id, date, start_time, end_time, break_minutes')
      .eq('employee_id', employeeId)
      .gte('date', monday)
      .lte('date', sunday)
      .is('deleted_at', null)

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

    const violations = checkCompliance(records)

    // Remplacement idempotent de l'instantané de la semaine pour cet employé.
    await supabaseAdmin
      .from('compliance_alerts')
      .delete()
      .eq('establishment_id', establishmentId)
      .eq('employee_id', employeeId)
      .eq('type', 'planning_conformity')
      .eq('options->>week_monday', monday)

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
