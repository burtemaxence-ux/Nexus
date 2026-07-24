// Pure logic for the shift editor (no React). Extracted from shift-modal so it
// can be unit-tested in isolation and reused. Compliance is delegated to the
// single source of truth in lib/compliance/rules.ts.
import type { Shift } from '@/types'
import { toISODate } from '@/lib/utils/dates'
import { grossShiftMinutes } from '@/lib/hours'
import { checkCompliance, type ShiftRecord, type EmployeeMeta, type Violation, type ComplianceConfig } from '@/lib/compliance/rules'

// ── Establishment-configurable shift duration bounds ───────────────────────────
// Break (break_missing) and daily rest (rest_daily) are judged authoritatively
// by checkCompliance against the legal thresholds, not duplicated here.
export interface PlanningRules {
  minShiftMinutes: number
  maxShiftMinutes: number
}

export const DEFAULT_RULES: PlanningRules = {
  minShiftMinutes: 30,
  maxShiftMinutes: 600,
}

export function parseRules(data: Record<string, string>): PlanningRules {
  return {
    minShiftMinutes: parseInt(data.min_shift_duration ?? '30', 10),
    maxShiftMinutes: parseInt(data.max_shift_duration ?? '600', 10),
  }
}

export function fmtMins(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return min > 0 ? `${h}h${String(min).padStart(2, '0')}` : `${h}h`
}

// Gross shift duration in minutes, handling overnight shifts (end <= start).
// Alias vers le helper partagé lib/hours (source unique de vérité), conservé
// pour les appelants qui importent calcDurationMinutes.
export const calcDurationMinutes = grossShiftMinutes

// Establishment-specific duration warnings only (min/max shift length).
export function computeDurationWarnings(
  startTime: string,
  endTime: string,
  breakMins: number,
  rules: PlanningRules,
): string[] {
  const warnings: string[] = []
  const netDuration = calcDurationMinutes(startTime, endTime) - breakMins

  if (netDuration > 0 && netDuration < rules.minShiftMinutes) {
    warnings.push(`Créneau trop court — minimum requis : ${fmtMins(rules.minShiftMinutes)}`)
  }
  if (netDuration > rules.maxShiftMinutes) {
    warnings.push(`Créneau trop long — maximum autorisé : ${fmtMins(rules.maxShiftMinutes)}`)
  }
  return warnings
}

// Legal compliance violations introduced by a proposed/edited shift, relative
// to the employee's other shifts. Diffs against a baseline so only the NEW
// violations caused by this shift are returned.
export function computeComplianceViolations(
  startTime: string,
  endTime: string,
  breakMins: number,
  employeeId: string,
  date: Date,
  allShifts: Shift[],
  excludeShiftId?: string,
  employeeMeta?: EmployeeMeta,
  config?: ComplianceConfig,
): Violation[] {
  const dateStr = toISODate(date)

  const existing: ShiftRecord[] = allShifts
    .filter(s => s.employee_id === employeeId && s.id !== (excludeShiftId ?? ''))
    .map(s => ({
      id: s.id,
      employeeId: s.employee_id,
      date: s.date,
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time.slice(0, 5),
      breakMinutes: s.break_minutes,
    }))

  const proposed: ShiftRecord = {
    id: 'proposed',
    employeeId,
    date: dateStr,
    startTime,
    endTime,
    breakMinutes: breakMins,
  }

  // Métadonnées employé → active les règles mineurs / temps partiel / contrat
  // dès la saisie dans le modal (aperçu avant sauvegarde).
  const employees = employeeMeta ? [employeeMeta] : undefined
  const baseline = checkCompliance(existing, employees, config)
  const withProposed = checkCompliance([...existing, proposed], employees, config)

  return withProposed.filter(v =>
    !baseline.some(b => b.ruleId === v.ruleId && b.employeeId === v.employeeId && b.date === v.date)
  )
}

export const BREAK_OPTIONS = [
  { value: '0', label: 'Aucune' },
  { value: '15', label: '15 min' },
  { value: '20', label: '20 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1h' },
]

// Ensure the currently-selected break value (e.g. a poste's custom break_minutes
// like 25) always has a matching option, otherwise the Select renders empty.
export function breakOptions(current: string) {
  if (BREAK_OPTIONS.some(o => o.value === current)) return BREAK_OPTIONS
  return [...BREAK_OPTIONS, { value: current, label: `${current} min` }]
    .sort((a, b) => Number(a.value) - Number(b.value))
}
