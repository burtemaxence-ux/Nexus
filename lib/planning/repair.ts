// Réparateur de conformité, appliqué à la sortie des DEUX moteurs de planning
// (IA et algorithme) pour garantir qu'aucun créneau proposé n'enfreint le Code
// du travail. On ne modifie PAS les règles de conformité : on retire les
// créneaux fautifs (en commençant par la fin de semaine) jusqu'à ce que le
// planning soit propre. Le manager complète/ajuste ensuite.
//
// Les règles « contextuelles » (travail de nuit, dimanche) ne sont pas
// réparables par l'ordonnancement — elles découlent des horaires/jours
// d'ouverture — donc on ne supprime pas de créneaux pour elles.

import { checkCompliance, type ShiftRecord, type RuleId } from '@/lib/compliance/rules'
import type { ProposedShift } from './solver'

const ACTIONABLE = new Set<RuleId>([
  'rest_daily',
  'hours_daily_max',
  'hours_weekly_max',
  'break_missing',
  'days_consecutive',
  'weekly_rest_missing',
  'amplitude_max',
])

function toRecords(shifts: ProposedShift[]): ShiftRecord[] {
  return shifts.map((s, i) => ({
    id: String(i),
    employeeId: s.employee_id,
    date: s.date,
    startTime: s.start_time.slice(0, 5),
    endTime: s.end_time.slice(0, 5),
    breakMinutes: s.break_minutes ?? 0,
  }))
}

export function actionableViolationCount(shifts: ProposedShift[]): number {
  return checkCompliance(toRecords(shifts)).filter(v => ACTIONABLE.has(v.ruleId)).length
}

// Retire les créneaux en infraction jusqu'à obtenir un planning conforme.
// Converge : chaque tour supprime au moins un créneau (ou s'arrête).
export function repairPlan(shifts: ProposedShift[]): { shifts: ProposedShift[]; dropped: number } {
  let current = [...shifts]
  let dropped = 0

  for (let iter = 0; iter < 100 && current.length > 0; iter++) {
    const violations = checkCompliance(toRecords(current)).filter(v => ACTIONABLE.has(v.ruleId))
    if (violations.length === 0) break

    // Pour chaque employé concerné, on cible la date la PLUS TARDIVE en
    // infraction (repos/jours consécutifs/hebdo pointent la fin de la série) :
    // retirer la queue préserve les créneaux de début de semaine.
    const latestByEmp = new Map<string, string>()
    for (const v of violations) {
      const cur = latestByEmp.get(v.employeeId)
      if (!cur || v.date > cur) latestByEmp.set(v.employeeId, v.date)
    }
    const dropKeys = new Set<string>()
    for (const [emp, date] of Array.from(latestByEmp.entries())) dropKeys.add(`${emp}__${date}`)

    const before = current.length
    current = current.filter(s => !dropKeys.has(`${s.employee_id}__${s.date}`))
    dropped += before - current.length
    if (before === current.length) break // garde-fou anti-boucle
  }

  return { shifts: current, dropped }
}
