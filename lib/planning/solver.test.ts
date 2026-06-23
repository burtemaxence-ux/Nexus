import { describe, it, expect } from 'vitest'
import { solvePlanning, type SolverInput, type SolverEmployee } from './solver'

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    existingShifts: [],
    forecast: null,
    targetPct: null,
    rateMap: {},
    breakTriggerMinutes: 360,
    ...overrides,
  }
}

// ── Basics ───────────────────────────────────────────────────────────────────

describe('solvePlanning — bases', () => {
  it('retourne un tableau vide quand aucun employé n’est fourni', () => {
    const { shifts } = solvePlanning(withDefaults({ employees: [] }))
    expect(shifts).toEqual([])
  })

  it('saute les jours fermés', () => {
    // Fermeture le dimanche (idx 6).
    const { shifts } = solvePlanning(withDefaults({ closedDaysIdx: [6] }))
    expect(shifts.some(s => s.date === '2026-06-21')).toBe(false)
  })

  it('produit des shifts valides (HH:MM, durée > 0)', () => {
    const { shifts } = solvePlanning(withDefaults())
    expect(shifts.length).toBeGreaterThan(0)
    for (const s of shifts) {
      expect(s.start_time).toMatch(/^\d{2}:\d{2}$/)
      expect(s.end_time).toMatch(/^\d{2}:\d{2}$/)
      expect(s.start_time < s.end_time).toBe(true)
    }
  })
})

// ── Contract hours ───────────────────────────────────────────────────────────

describe('solvePlanning — heures contractuelles', () => {
  it('ne dépasse pas les heures hebdomadaires du contrat', () => {
    const { shifts } = solvePlanning(withDefaults({ employees: [emp('A', 28)] }))
    const total = shifts
      .filter(s => s.employee_id === 'A')
      .reduce((sum, s) => {
        const [sh, sm] = s.start_time.split(':').map(Number)
        const [eh, em] = s.end_time.split(':').map(Number)
        return sum + (eh * 60 + em - sh * 60 - sm - s.break_minutes) / 60
      }, 0)
    expect(total).toBeLessThanOrEqual(28)
  })

  it('priorise les employés avec le plus grand déficit contractuel', () => {
    // A et B ont 35h, mais A a déjà 28h planifiées via existingShifts.
    // B devrait recevoir plus d’heures dans le solveur.
    const existing = [
      { employee_id: 'A', date: '2026-06-15', start_time: '07:00', end_time: '15:30', break_minutes: 30 }, // 8h net
      { employee_id: 'A', date: '2026-06-16', start_time: '07:00', end_time: '15:30', break_minutes: 30 },
      { employee_id: 'A', date: '2026-06-17', start_time: '07:00', end_time: '15:30', break_minutes: 30 },
      { employee_id: 'A', date: '2026-06-18', start_time: '07:00', end_time: '11:00', break_minutes: 0 },  // 4h
    ] // total A = 28h
    const { shifts } = solvePlanning(withDefaults({
      employees: [emp('A'), emp('B')],
      existingShifts: existing,
    }))
    const newHoursA = shifts.filter(s => s.employee_id === 'A').length
    const newHoursB = shifts.filter(s => s.employee_id === 'B').length
    expect(newHoursB).toBeGreaterThan(newHoursA)
  })
})

// ── Compliance ───────────────────────────────────────────────────────────────

describe('solvePlanning — conformité', () => {
  it('respecte le repos quotidien de 11h entre 2 shifts consécutifs', () => {
    // Avec une seule personne et plein de besoin, l’algo ne doit pas créer
    // 2 shifts trop rapprochés sur 2 jours consécutifs.
    const { shifts } = solvePlanning(withDefaults({
      employees: [emp('A')],
      // Fermeture tard, ouverture tôt → forcerait un repos < 11h naïvement.
      openingTime: '06:00',
      closingTime: '23:00',
    }))
    const sortedA = shifts.filter(s => s.employee_id === 'A').sort((a, b) => a.date.localeCompare(b.date))
    for (let i = 1; i < sortedA.length; i++) {
      const prev = sortedA[i - 1]
      const curr = sortedA[i]
      // Différence en jours
      const dayDiff = Math.round(
        (new Date(curr.date + 'T00:00:00').getTime() - new Date(prev.date + 'T00:00:00').getTime()) / 86400000,
      )
      if (dayDiff === 1) {
        const [eh, em] = prev.end_time.split(':').map(Number)
        const [sh, sm] = curr.start_time.split(':').map(Number)
        const restMin = (sh * 60 + sm + 1440) - (eh * 60 + em)
        expect(restMin).toBeGreaterThanOrEqual(11 * 60)
      }
    }
  })

  it('cap aucun shift à plus de 10h de travail effectif', () => {
    const { shifts } = solvePlanning(withDefaults({
      employees: [emp('A', 60)], // contrat fictif élevé
      openingTime: '06:00',
      closingTime: '23:00',
    }))
    for (const s of shifts) {
      const [sh, sm] = s.start_time.split(':').map(Number)
      const [eh, em] = s.end_time.split(':').map(Number)
      const netMin = eh * 60 + em - sh * 60 - sm - s.break_minutes
      expect(netMin / 60).toBeLessThanOrEqual(10)
    }
  })

  it('ajoute une pause quand le shift dépasse le seuil de déclenchement', () => {
    const { shifts } = solvePlanning(withDefaults({
      employees: [emp('A', 35)],
      breakTriggerMinutes: 360, // 6h
    }))
    for (const s of shifts.filter(x => x.employee_id === 'A')) {
      const [sh, sm] = s.start_time.split(':').map(Number)
      const [eh, em] = s.end_time.split(':').map(Number)
      const grossMin = eh * 60 + em - sh * 60 - sm
      if (grossMin > 360) {
        expect(s.break_minutes).toBeGreaterThanOrEqual(20)
      }
    }
  })
})

// ── Forecast / cible coût ────────────────────────────────────────────────────

describe('solvePlanning — dimensionnement CA', () => {
  it('dimensionne plus de shifts les jours à fort CA', () => {
    // Un samedi à fort CA vs un mardi creux.
    const forecast = [
      { date: '2026-06-15', amount: 100 },  // Mon
      { date: '2026-06-16', amount: 100 },
      { date: '2026-06-17', amount: 100 },
      { date: '2026-06-18', amount: 100 },
      { date: '2026-06-19', amount: 100 },
      { date: '2026-06-20', amount: 2000 }, // Sam +20×
      { date: '2026-06-21', amount: 100 },
    ]
    const { shifts } = solvePlanning(withDefaults({
      employees: [emp('A'), emp('B'), emp('C'), emp('D'), emp('E')].map((e, i) => ({ ...e, id: String.fromCharCode(65 + i) })),
      rateMap: { A: 15, B: 15, C: 15, D: 15, E: 15 },
      forecast,
      targetPct: 30,
    }))
    const sat = shifts.filter(s => s.date === '2026-06-20').length
    const tue = shifts.filter(s => s.date === '2026-06-16').length
    expect(sat).toBeGreaterThanOrEqual(tue)
  })

  it('ne dimensionne rien quand le forecast est nul', () => {
    const forecast = WEEK.map(d => ({ date: d, amount: 0 }))
    const { shifts } = solvePlanning(withDefaults({
      forecast,
      targetPct: 30,
      rateMap: { A: 15, B: 15, C: 15 },
    }))
    expect(shifts).toEqual([])
  })
})

// ── Leaves & existing shifts ─────────────────────────────────────────────────

describe('solvePlanning — congés et shifts existants', () => {
  it('ne planifie pas un employé absent ce jour', () => {
    const { shifts } = solvePlanning(withDefaults({
      employees: [emp('A')],
      leaveByEmployee: { A: ['2026-06-15', '2026-06-16'] },
    }))
    expect(shifts.some(s => s.employee_id === 'A' && (s.date === '2026-06-15' || s.date === '2026-06-16'))).toBe(false)
  })

  it('respecte les shifts existants en les comptant dans le contrat', () => {
    const existing = [
      { employee_id: 'A', date: '2026-06-15', start_time: '07:00', end_time: '15:30', break_minutes: 30 }, // 8h net
    ]
    const { shifts } = solvePlanning(withDefaults({
      employees: [emp('A', 35)],
      existingShifts: existing,
    }))
    // L'algo ne doit pas re-créer un shift le 2026-06-15 pour A (un shift / jour en v1).
    expect(shifts.some(s => s.employee_id === 'A' && s.date === '2026-06-15')).toBe(false)
  })
})

// ── Summary ──────────────────────────────────────────────────────────────────

describe('solvePlanning — résumé', () => {
  it('indique le nombre de créneaux générés', () => {
    const { shifts, summary } = solvePlanning(withDefaults())
    expect(summary).toMatch(new RegExp(`${shifts.length} créneau`))
  })
})
