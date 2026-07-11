import { describe, it, expect } from 'vitest'
import { solvePlanning, type SolverEmployee } from './solver'
import { repairPlan, ACTIONABLE } from './repair'
import { checkCompliance, type ShiftRecord, RULES } from '@/lib/compliance/rules'
import { ShiftSchema } from '@/lib/validations'

// Vérification de bout en bout de la génération par ALGORITHME, qui reproduit
// les bugs signalés :
//   1. « rien n'est publié ni vérifiable » → en réalité les inserts /api/shifts
//      étaient rejetés (422) car le payload (notes:null…) ne passait pas
//      ShiftSchema. On revalide ici chaque créneau avec le MÊME schéma.
//   2. « il ne devrait pas y avoir d'infraction » → on passe la sortie dans
//      checkCompliance et on exige zéro violation actionnable.
//   3. « il faut respecter le contrat » → on vérifie que chaque employé est
//      planifié au plus à son contrat et proche de celui-ci.

// Scénario réel : Le Bistrot Parisien (6 employés, contrats variés).
const EMPLOYEES: SolverEmployee[] = [
  { id: '11111111-1111-4111-8111-111111111111', full_name: 'Antoine M.', position: 'Chef de rang', weekly_hours: 31.5 },
  { id: '22222222-2222-4222-8222-222222222222', full_name: 'Emma R.',    position: 'Serveur/Serveuse', weekly_hours: 16 },
  { id: '33333333-3333-4333-8333-333333333333', full_name: 'Lucas P.',   position: 'Plongeur', weekly_hours: 24 },
  { id: '44444444-4444-4444-8444-444444444444', full_name: 'Marie D.',   position: 'Serveur/Serveuse', weekly_hours: 32 },
  { id: '55555555-5555-4555-8555-555555555555', full_name: 'Sophie B.',  position: 'Serveur/Serveuse', weekly_hours: 24 },
  { id: '66666666-6666-4666-8666-666666666666', full_name: 'Thomas M.',  position: 'Cuisinier', weekly_hours: 24 },
]
const WEEK = ['2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26', '2026-06-27', '2026-06-28']

function netHours(s: { start_time: string; end_time: string; break_minutes: number }): number {
  const [sh, sm] = s.start_time.split(':').map(Number)
  const [eh, em] = s.end_time.split(':').map(Number)
  let end = eh * 60 + em
  const start = sh * 60 + sm
  if (end <= start) end += 1440
  return (end - start - s.break_minutes) / 60
}

function generate(closingTime = '23:00') {
  const { shifts } = solvePlanning({
    weekDays: WEEK,
    openingTime: '11:00',
    closingTime,
    closedDaysIdx: [],
    employees: EMPLOYEES,
    leaveByEmployee: {},
    existingShifts: [],
    forecast: null,
    targetPct: null,
    rateMap: {},
    breakTriggerMinutes: 360,
  })
  return repairPlan(shifts).shifts
}

describe('génération algorithme — pipeline complet (Bistrot Parisien)', () => {
  const shifts = generate()

  it('génère des créneaux', () => {
    expect(shifts.length).toBeGreaterThan(0)
  })

  it('CHAQUE créneau passe ShiftSchema → sera bien persisté (plus de 422)', () => {
    for (const s of shifts) {
      // Payload EXACT envoyé par applyShifts (composants/planning/ai-plan-modal).
      const payload = {
        employee_id: s.employee_id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        break_minutes: s.break_minutes,
        poste_id: s.poste_id,   // null pour l'algo
        position: s.position,
        notes: s.notes,         // null
        status: 'draft',
      }
      const r = ShiftSchema.safeParse(payload)
      expect(r.success, r.success ? '' : JSON.stringify(r.error!.issues)).toBe(true)
    }
  })

  it('aucune infraction actionnable au Code du travail', () => {
    const records: ShiftRecord[] = shifts.map((s, i) => ({
      id: `s${i}`, employeeId: s.employee_id, date: s.date,
      startTime: s.start_time, endTime: s.end_time, breakMinutes: s.break_minutes,
    }))
    const actionable = checkCompliance(records).filter(v => ACTIONABLE.has(v.ruleId))
    expect(actionable).toEqual([])
  })

  it('respecte le contrat de chaque employé (proche, jamais au-dessus)', () => {
    for (const emp of EMPLOYEES) {
      const total = shifts.filter(s => s.employee_id === emp.id).reduce((sum, s) => sum + netHours(s), 0)
      const contract = emp.weekly_hours!
      expect(total, `${emp.full_name}: ${total}h > contrat ${contract}h`).toBeLessThanOrEqual(contract + 0.01)
      // Proche du contrat : au moins 80 % couvert (le reste = ajustement manager).
      expect(total, `${emp.full_name}: ${total}h trop loin du contrat ${contract}h`).toBeGreaterThanOrEqual(contract * 0.8)
    }
  })

  it('couvre tous les jours ouvrés', () => {
    const daysCovered = new Set(shifts.map(s => s.date))
    expect(daysCovered.size).toBe(WEEK.length)
  })

  it('zéro infraction CRITIQUE même avec fermeture tardive (23:00)', () => {
    const records: ShiftRecord[] = shifts.map((s, i) => ({
      id: `s${i}`, employeeId: s.employee_id, date: s.date,
      startTime: s.start_time, endTime: s.end_time, breakMinutes: s.break_minutes,
    }))
    const critical = checkCompliance(records).filter(v => RULES[v.ruleId].severity === 'critical')
    expect(critical).toEqual([])
  })
})
