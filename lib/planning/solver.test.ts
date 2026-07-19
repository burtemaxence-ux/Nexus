import { describe, it, expect } from 'vitest'
import { solvePlanning, type SolverInput, type SolverEmployee } from './solver'
import { checkCompliance, type ShiftRecord, RULES } from '@/lib/compliance/rules'

// Semaine du 2026-06-15 (lundi) au 2026-06-21 (dimanche).
const WEEK = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21']

function emp(id: string, weekly_hours: number | null = 35, position: string | null = 'Serveur'): SolverEmployee {
  return { id, full_name: `Emp ${id}`, position, weekly_hours }
}

function withDefaults(overrides: Partial<SolverInput> = {}): SolverInput {
  return {
    weekDays: WEEK,
    openingTime: '07:00',
    closingTime: '23:00',
    closedDaysIdx: [],
    employees: [emp('A'), emp('B'), emp('C')],
    leaveByEmployee: {},
    availabilityByEmployee: {},
    existingShifts: [],
    forecast: null,
    breakTriggerMinutes: 360,
    ...overrides,
  }
}

function toRecords(shifts: ReturnType<typeof solvePlanning>['shifts']): ShiftRecord[] {
  return shifts.map((s, i) => ({
    id: `s${i}`, employeeId: s.employee_id, date: s.date,
    startTime: s.start_time, endTime: s.end_time, breakMinutes: s.break_minutes,
  }))
}

// Règles « actionnables » : celles que l'ordonnancement peut et doit éviter.
// night_work (warning) et sunday_work (info) sont contextuels — inhérents aux
// horaires d'ouverture / jours d'ouverture choisis par le manager — donc exclus.
const ACTIONABLE = new Set([
  'rest_daily', 'hours_daily_max', 'hours_weekly_max',
  'break_missing', 'days_consecutive', 'weekly_rest_missing', 'amplitude_max',
])
function actionableViolations(shifts: ReturnType<typeof solvePlanning>['shifts']) {
  return checkCompliance(toRecords(shifts)).filter(v => ACTIONABLE.has(v.ruleId))
}

function netHours(s: { start_time: string; end_time: string; break_minutes: number }): number {
  const [sh, sm] = s.start_time.split(':').map(Number)
  const [eh, em] = s.end_time.split(':').map(Number)
  let end = eh * 60 + em
  const start = sh * 60 + sm
  if (end <= start) end += 1440
  return (end - start - s.break_minutes) / 60
}

// ── Conformité par construction (exigence n°1) ───────────────────────────────

describe('solvePlanning — zéro infraction actionnable', () => {
  it('ne produit aucune violation pour un cas standard (07:00–21:00)', () => {
    const { shifts } = solvePlanning(withDefaults({
      openingTime: '07:00', closingTime: '21:00',
      employees: [emp('A', 35), emp('B', 35), emp('C', 24)],
    }))
    expect(shifts.length).toBeGreaterThan(0)
    expect(actionableViolations(shifts)).toEqual([])
  })

  it('ne produit aucune violation actionnable avec amplitude large et contrats variés', () => {
    const { shifts } = solvePlanning(withDefaults({
      openingTime: '06:00', closingTime: '21:00',
      employees: [emp('A', 39), emp('B', 35), emp('C', 24), emp('D', 16), emp('E', 35), emp('F', 28)]
        .map((e, i) => ({ ...e, id: 'ABCDEF'[i] })),
    }))
    expect(actionableViolations(shifts)).toEqual([])
  })

  it('aucune violation actionnable avec forecast et fermeture dimanche', () => {
    const forecast = WEEK.map((d, i) => ({ date: d, amount: i === 5 ? 3000 : 800 }))
    const { shifts } = solvePlanning(withDefaults({
      openingTime: '07:00', closingTime: '21:00',
      closedDaysIdx: [6],
      forecast,
      employees: [emp('A', 35), emp('B', 35), emp('C', 24)],
    }))
    expect(actionableViolations(shifts)).toEqual([])
    // sanity : zéro critique aussi
    expect(checkCompliance(toRecords(shifts)).filter(v => RULES[v.ruleId].severity === 'critical')).toEqual([])
  })

  it('aucune violation actionnable avec des fenêtres de dispo hétérogènes', () => {
    // B ferme tard puis n'est disponible que tôt le lendemain : le solveur doit
    // arbitrer sans casser le repos de 11h (rétrécir ou abandonner le jour).
    const { shifts } = solvePlanning(withDefaults({
      openingTime: '07:00', closingTime: '23:00',
      employees: [emp('A', 35), emp('B', 35)],
      availabilityByEmployee: {
        B: [
          { day_of_week: 0, start_time: '14:00', end_time: '23:00' },
          { day_of_week: 1, start_time: '07:00', end_time: '15:00' },
          { day_of_week: 2, start_time: '07:00', end_time: '23:00' },
          { day_of_week: 3, start_time: '07:00', end_time: '23:00' },
          { day_of_week: 4, start_time: '14:00', end_time: '23:00' },
        ],
      },
    }))
    expect(actionableViolations(shifts)).toEqual([])
  })
})

// ── Respect du contrat (exigence n°2) ────────────────────────────────────────

describe('solvePlanning — respect du contrat hebdomadaire', () => {
  it('planifie un 35h proche de 35h (pas 16h ni 23h)', () => {
    const { shifts } = solvePlanning(withDefaults({ employees: [emp('A', 35)] }))
    const total = shifts.filter(s => s.employee_id === 'A').reduce((sum, s) => sum + netHours(s), 0)
    expect(total).toBeGreaterThanOrEqual(32)
    expect(total).toBeLessThanOrEqual(35)
  })

  it('ne dépasse jamais le contrat', () => {
    for (const h of [16, 24, 28, 35, 39]) {
      const { shifts } = solvePlanning(withDefaults({ employees: [emp('A', h)] }))
      const total = shifts.filter(s => s.employee_id === 'A').reduce((sum, s) => sum + netHours(s), 0)
      expect(total).toBeLessThanOrEqual(h + 0.01)
    }
  })

  it('un 16h reçoit bien ~16h', () => {
    const { shifts } = solvePlanning(withDefaults({ employees: [emp('A', 16)] }))
    const total = shifts.filter(s => s.employee_id === 'A').reduce((sum, s) => sum + netHours(s), 0)
    expect(total).toBeGreaterThanOrEqual(14)
    expect(total).toBeLessThanOrEqual(16)
  })

  it('compte les shifts existants dans le contrat (ne le dépasse pas)', () => {
    const existing = [
      { employee_id: 'A', date: '2026-06-15', start_time: '07:00', end_time: '15:30', break_minutes: 30 }, // 8h net
    ]
    const { shifts } = solvePlanning(withDefaults({ employees: [emp('A', 35)], existingShifts: existing }))
    const total = shifts.filter(s => s.employee_id === 'A').reduce((sum, s) => sum + netHours(s), 0)
    expect(total).toBeLessThanOrEqual(35 - 8 + 0.01)
    // ne replanifie pas le jour déjà occupé
    expect(shifts.some(s => s.employee_id === 'A' && s.date === '2026-06-15')).toBe(false)
  })
})

// ── Disponibilités déclarées ─────────────────────────────────────────────────

describe('solvePlanning — disponibilités', () => {
  it('ne planifie un employé que ses jours de disponibilité', () => {
    const { shifts } = solvePlanning(withDefaults({
      employees: [emp('A', 24)],
      availabilityByEmployee: {
        A: [
          { day_of_week: 0, start_time: '07:00', end_time: '23:00' }, // lundi
          { day_of_week: 2, start_time: '07:00', end_time: '23:00' }, // mercredi
          { day_of_week: 4, start_time: '07:00', end_time: '23:00' }, // vendredi
        ],
      },
    }))
    const days = new Set(shifts.filter(s => s.employee_id === 'A').map(s => s.date))
    expect(days.size).toBeGreaterThan(0)
    for (const d of Array.from(days)) {
      expect(['2026-06-15', '2026-06-17', '2026-06-19']).toContain(d)
    }
  })

  it('respecte la fenêtre horaire de disponibilité', () => {
    const { shifts } = solvePlanning(withDefaults({
      employees: [emp('A', 24)],
      availabilityByEmployee: {
        A: WEEK.map((_, i) => ({ day_of_week: i, start_time: '09:00', end_time: '17:00' })),
      },
    }))
    expect(shifts.length).toBeGreaterThan(0)
    for (const s of shifts) {
      expect(s.start_time >= '09:00').toBe(true)
      expect(s.end_time <= '17:00').toBe(true)
    }
  })

  it('gère les heures de dispo au format Postgres time (HH:MM:SS)', () => {
    const { shifts } = solvePlanning(withDefaults({
      employees: [emp('A', 16)],
      availabilityByEmployee: {
        A: WEEK.map((_, i) => ({ day_of_week: i, start_time: '10:00:00', end_time: '18:00:00' })),
      },
    }))
    expect(shifts.length).toBeGreaterThan(0)
    for (const s of shifts) {
      expect(s.start_time >= '10:00').toBe(true)
      expect(s.end_time <= '18:00').toBe(true)
    }
  })

  it("un employé sans dispo déclarée reste planifiable partout", () => {
    const { shifts } = solvePlanning(withDefaults({ employees: [emp('A', 35)] }))
    expect(shifts.filter(s => s.employee_id === 'A').length).toBeGreaterThan(0)
  })

  it('un employé dont aucune dispo ne recoupe les jours ouverts est ignoré sans erreur', () => {
    const { shifts } = solvePlanning(withDefaults({
      closedDaysIdx: [5, 6], // fermé samedi + dimanche
      employees: [emp('A', 24), emp('B', 24)],
      availabilityByEmployee: {
        A: [{ day_of_week: 5, start_time: '07:00', end_time: '23:00' }], // dispo uniquement samedi
      },
    }))
    expect(shifts.some(s => s.employee_id === 'A')).toBe(false)
    expect(shifts.some(s => s.employee_id === 'B')).toBe(true)
  })
})

// ── Bornes & cas limites ─────────────────────────────────────────────────────

describe('solvePlanning — bornes', () => {
  it('au plus 6 jours travaillés par employé', () => {
    const { shifts } = solvePlanning(withDefaults({ employees: [emp('A', 48)] }))
    const days = new Set(shifts.filter(s => s.employee_id === 'A').map(s => s.date))
    expect(days.size).toBeLessThanOrEqual(6)
  })

  it('aucun shift ne dépasse 10h nettes', () => {
    const { shifts } = solvePlanning(withDefaults({ employees: [emp('A', 48)], openingTime: '06:00', closingTime: '23:00' }))
    for (const s of shifts) expect(netHours(s)).toBeLessThanOrEqual(10)
  })

  it('saute les jours fermés', () => {
    const { shifts } = solvePlanning(withDefaults({ closedDaysIdx: [6] }))
    expect(shifts.some(s => s.date === '2026-06-21')).toBe(false)
  })

  it('ne planifie pas un employé en congé', () => {
    const { shifts } = solvePlanning(withDefaults({ employees: [emp('A', 35)], leaveByEmployee: { A: ['2026-06-15', '2026-06-16'] } }))
    expect(shifts.some(s => s.employee_id === 'A' && (s.date === '2026-06-15' || s.date === '2026-06-16'))).toBe(false)
  })

  it('retourne vide sans employé / sans jour ouvré', () => {
    expect(solvePlanning(withDefaults({ employees: [] })).shifts).toEqual([])
    expect(solvePlanning(withDefaults({ closedDaysIdx: [0, 1, 2, 3, 4, 5, 6] })).shifts).toEqual([])
  })

  it('produit des heures HH:MM valides dans la plage d’ouverture', () => {
    const { shifts } = solvePlanning(withDefaults({ openingTime: '08:00', closingTime: '20:00' }))
    for (const s of shifts) {
      expect(s.start_time).toMatch(/^\d{2}:\d{2}$/)
      expect(s.start_time >= '08:00').toBe(true)
      expect(s.end_time <= '20:00').toBe(true)
    }
  })

  it('respecte le repos de 11h face à un créneau DÉJÀ en base la veille au soir', () => {
    // A a déjà un service en base lundi 14:30–23:00 : le mardi ne peut pas
    // commencer avant 12:00 (23:00 − 13h + 2h de marge arithmétique).
    const existing = [
      { employee_id: 'A', date: '2026-06-15', start_time: '14:30', end_time: '23:00', break_minutes: 30 },
    ]
    const { shifts } = solvePlanning(withDefaults({ employees: [emp('A', 35)], existingShifts: existing }))
    const all = [
      ...toRecords(shifts),
      { id: 'x', employeeId: 'A', date: '2026-06-15', startTime: '14:30', endTime: '23:00', breakMinutes: 30 },
    ]
    const rest = checkCompliance(all).filter(v => v.ruleId === 'rest_daily')
    expect(rest).toEqual([])
  })
})

// ── Couverture / forecast ────────────────────────────────────────────────────

describe('solvePlanning — couverture', () => {
  it('staffe au moins autant les jours à fort CA que les jours creux', () => {
    const forecast = [
      { date: '2026-06-15', amount: 100 }, { date: '2026-06-16', amount: 100 },
      { date: '2026-06-17', amount: 100 }, { date: '2026-06-18', amount: 100 },
      { date: '2026-06-19', amount: 100 }, { date: '2026-06-20', amount: 3000 },
      { date: '2026-06-21', amount: 100 },
    ]
    const { shifts } = solvePlanning(withDefaults({
      employees: ['A', 'B', 'C', 'D', 'E'].map(id => emp(id, 24)),
      forecast,
    }))
    const sat = shifts.filter(s => s.date === '2026-06-20').length
    const tue = shifts.filter(s => s.date === '2026-06-16').length
    expect(sat).toBeGreaterThanOrEqual(tue)
  })

  it('couvre chaque jour ouvert même quand le CA prévu est très déséquilibré', () => {
    // Ancien comportement défaillant : tout le monde empilé sur le samedi à
    // 3000 €, jours creux laissés vides. Le besoin par jour garantit une base.
    const forecast = WEEK.map((d, i) => ({ date: d, amount: i === 5 ? 3000 : 100 }))
    const { shifts } = solvePlanning(withDefaults({
      employees: ['A', 'B', 'C', 'D', 'E', 'F'].map(id => emp(id, 30)),
      forecast,
    }))
    const covered = new Set(shifts.map(s => s.date))
    expect(covered.size).toBe(WEEK.length)
  })

  it('sans forecast, couvre tous les jours ouverts avec assez d’employés', () => {
    const { shifts } = solvePlanning(withDefaults({
      employees: ['A', 'B', 'C', 'D'].map(id => emp(id, 30)),
    }))
    const covered = new Set(shifts.map(s => s.date))
    expect(covered.size).toBe(WEEK.length)
  })

  it('mixe des débuts tôt et tard pour couvrir l’amplitude d’ouverture', () => {
    const { shifts } = solvePlanning(withDefaults({
      openingTime: '07:00', closingTime: '23:00',
      employees: ['A', 'B', 'C', 'D'].map(id => emp(id, 35)),
    }))
    const starts = new Set(shifts.map(s => s.start_time))
    expect(starts.size).toBeGreaterThan(1)
    // au moins un début à l'ouverture et un créneau qui finit à la fermeture
    expect(shifts.some(s => s.start_time === '07:00')).toBe(true)
    expect(shifts.some(s => s.end_time === '23:00')).toBe(true)
  })
})
