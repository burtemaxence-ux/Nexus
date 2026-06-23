// Solveur de planning déterministe.
// Alternative gratuite, instantanée et auditable au LLM pour /api/ai/plan.
//
// Greedy, par jour, dans cet ordre :
//   1. Calculer le besoin d'heures de la journée (forecast CA × cible, sinon
//      couverture sur la plage d'ouverture).
//   2. Sélectionner les employés disponibles (pas en congé, pas en repos
//      obligatoire), triés par déficit contractuel décroissant.
//   3. Allouer des shifts staggered sur la plage d'ouverture, durée plafonnée
//      par : 8h cible, max 10h légal, max heures contractuelles restantes,
//      besoin résiduel du jour.
//   4. Respecter le repos quotidien de 11h vs le dernier shift de la veille.

import { timeToMinutes, calcHours } from '@/lib/planning-utils'

// ── Public types ─────────────────────────────────────────────────────────────

export type SolverEmployee = {
  id: string
  full_name: string
  position: string | null
  weekly_hours: number | null
}

export type SolverExistingShift = {
  employee_id: string
  date: string
  start_time: string
  end_time: string
  break_minutes?: number
}

export type SolverInput = {
  weekDays: string[]                          // 7 dates YYYY-MM-DD (lundi → dimanche)
  openingTime: string                         // HH:MM
  closingTime: string                         // HH:MM
  closedDaysIdx: number[]                     // 0 = lundi … 6 = dimanche
  employees: SolverEmployee[]
  leaveByEmployee: Record<string, string[]>   // empId → liste de dates de congé
  existingShifts: SolverExistingShift[]       // shifts déjà planifiés, à respecter
  forecast: { date: string; amount: number }[] | null  // CA prévu (premium) ou null
  targetPct: number | null                    // cible coût/CA en % (premium) ou null
  rateMap: Record<string, number>             // empId → taux horaire
  breakTriggerMinutes: number                 // seuil de déclenchement d'une pause
}

export type ProposedShift = {
  employee_id: string
  employee_name: string
  date: string
  start_time: string
  end_time: string
  break_minutes: number
  poste_id: string | null
  position: string | null
  notes: string | null
}

export type SolverOutput = {
  shifts: ProposedShift[]
  summary: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const TARGET_SHIFT_HOURS = 8        // longueur cible d'un shift complet
const MIN_SHIFT_HOURS = 4           // sous ce seuil on ne crée pas le shift
const MAX_SHIFT_HOURS = 10          // L3121-18
const MIN_REST_HOURS = 11           // L3131-1
const DEFAULT_BREAK_MINUTES = 30    // pause standard
const DEFAULT_WEEKLY_HOURS = 35     // si contrat non défini
const DEFAULT_HOURLY_RATE = 15      // si grille tarifaire vide
const MAX_WEEKLY_HOURS = 48         // L3121-20

// ── Helpers ──────────────────────────────────────────────────────────────────

function minToHHMM(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// 0 = lundi, 6 = dimanche.
function isoDayIdx(date: string): number {
  const dow = new Date(date + 'T00:00:00').getDay()
  return (dow + 6) % 7
}

// ── Target hours per day ─────────────────────────────────────────────────────

function meanHourlyRate(rateMap: Record<string, number>): number {
  const rates = Object.values(rateMap).filter(r => r > 0)
  if (rates.length === 0) return DEFAULT_HOURLY_RATE
  return rates.reduce((s, r) => s + r, 0) / rates.length
}

function computeTargetHoursPerDay(input: SolverInput): Map<string, number> {
  const result = new Map<string, number>()
  const amplitudeMin = timeToMinutes(input.closingTime) - timeToMinutes(input.openingTime)
  const fallbackHoursPerDay = Math.max(0, amplitudeMin / 60)

  // Mode forecast : budget hebdo = CA × cible%, réparti proportionnellement au CA prévu.
  // Si un forecast est fourni (même à 0), on lui fait confiance : pas de fallback.
  if (input.forecast && input.targetPct && input.targetPct > 0) {
    const totalCA = input.forecast.reduce((s, d) => s + d.amount, 0)
    const rate = meanHourlyRate(input.rateMap)
    const weeklyHours = totalCA > 0 ? (totalCA * input.targetPct) / 100 / rate : 0
    for (const d of input.forecast) {
      result.set(d.date, totalCA > 0 ? weeklyHours * (d.amount / totalCA) : 0)
    }
    for (const day of input.weekDays) if (!result.has(day)) result.set(day, 0)
    return result
  }

  // Mode défaut : couverture continue sur la plage d'ouverture.
  for (const day of input.weekDays) result.set(day, fallbackHoursPerDay)
  return result
}

// ── Per-employee state ───────────────────────────────────────────────────────

type EmployeeState = {
  weeklyHours: number                                     // heures contrat (ou défaut)
  hoursPlanned: number                                    // ce qu'il a cette semaine
  hoursToday: Map<string, number>                         // par date
  lastShiftEnd: { date: string; endMin: number } | null   // dernier shift connu
}

function buildEmployeeState(input: SolverInput): Map<string, EmployeeState> {
  const states = new Map<string, EmployeeState>()
  for (const e of input.employees) {
    states.set(e.id, {
      weeklyHours: e.weekly_hours ?? DEFAULT_WEEKLY_HOURS,
      hoursPlanned: 0,
      hoursToday: new Map(),
      lastShiftEnd: null,
    })
  }
  // Intégrer les shifts existants (ils consomment du contrat et fixent le dernier endroit).
  const sortedExisting = [...input.existingShifts].sort((a, b) =>
    a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date),
  )
  for (const s of sortedExisting) {
    const state = states.get(s.employee_id)
    if (!state) continue
    const hours = calcHours(s.start_time, s.end_time, s.break_minutes ?? 0)
    state.hoursPlanned += hours
    state.hoursToday.set(s.date, (state.hoursToday.get(s.date) ?? 0) + hours)
    const startMin = timeToMinutes(s.start_time)
    let endMin = timeToMinutes(s.end_time)
    if (endMin <= startMin) endMin += 1440 // overnight
    state.lastShiftEnd = { date: s.date, endMin }
  }
  return states
}

// Retourne l'heure de début la plus précoce respectant le repos quotidien
// par rapport au dernier shift connu de l'employé. Renvoie null si même le
// début du créneau de la journée ne respecte pas le repos.
function earliestStartMin(
  state: EmployeeState,
  day: string,
  baseStartMin: number,
  closingMin: number,
): number | null {
  if (!state.lastShiftEnd) return baseStartMin
  const dayDiff = Math.round(
    (new Date(day + 'T00:00:00').getTime() - new Date(state.lastShiftEnd.date + 'T00:00:00').getTime()) / 86400000,
  )
  if (dayDiff < 0) return null // shift dans le passé
  if (dayDiff > 1) return baseStartMin // assez d'écart
  if (dayDiff === 0) return null // déjà un shift ce jour (un seul shift / jour en v1)

  // dayDiff === 1 : il faut 11h depuis la fin du shift de la veille.
  // L'endMin de la veille est en min depuis 00:00 de la veille ; convertir.
  const restThresholdMin = state.lastShiftEnd.endMin + MIN_REST_HOURS * 60 - 1440
  const candidate = Math.max(baseStartMin, restThresholdMin)
  return candidate < closingMin ? candidate : null
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function solvePlanning(input: SolverInput): SolverOutput {
  const shifts: ProposedShift[] = []
  const states = buildEmployeeState(input)
  const targetByDay = computeTargetHoursPerDay(input)

  const openingMin = timeToMinutes(input.openingTime)
  const closingMin = timeToMinutes(input.closingTime)
  const amplitudeMin = closingMin - openingMin

  for (const day of input.weekDays) {
    const dayIdx = isoDayIdx(day)
    if (input.closedDaysIdx.includes(dayIdx)) continue

    let needed = targetByDay.get(day) ?? 0
    if (needed <= 0 || amplitudeMin <= 0) continue

    // Combien de shifts décider de placer ce jour. Heuristique : ceil(needed/8)
    // sans dépasser le nombre d'employés disponibles.
    const eligible = input.employees
      .filter(e => !(input.leaveByEmployee[e.id]?.includes(day) ?? false))
      .filter(e => {
        const st = states.get(e.id)!
        return st.hoursPlanned < Math.min(st.weeklyHours, MAX_WEEKLY_HOURS)
      })
      .sort((a, b) => {
        const stA = states.get(a.id)!, stB = states.get(b.id)!
        const defA = stA.weeklyHours - stA.hoursPlanned
        const defB = stB.weeklyHours - stB.hoursPlanned
        if (defB !== defA) return defB - defA
        return a.id.localeCompare(b.id) // stable
      })

    const targetShifts = Math.min(eligible.length, Math.max(1, Math.ceil(needed / TARGET_SHIFT_HOURS)))

    for (let i = 0; i < eligible.length && needed > 0; i++) {
      const emp = eligible[i]
      const state = states.get(emp.id)!

      // Pas de double-shift le même jour en v1.
      if ((state.hoursToday.get(day) ?? 0) > 0) continue

      // Durée plafonnée par contrat restant, max légal, besoin résiduel.
      const remainingContract = state.weeklyHours - state.hoursPlanned
      const cap = Math.min(TARGET_SHIFT_HOURS, MAX_SHIFT_HOURS, remainingContract, needed + 1)
      if (cap < MIN_SHIFT_HOURS) continue

      const breakMin = cap > input.breakTriggerMinutes / 60 ? DEFAULT_BREAK_MINUTES : 0

      // Repos quotidien : décaler le début si nécessaire.
      const baseStart = computeStaggeredStart(i, targetShifts, openingMin, closingMin, cap, breakMin)
      const earliest = earliestStartMin(state, day, baseStart, closingMin)
      if (earliest == null) continue

      // S'assurer que le shift tient avant la fermeture.
      const grossMin = Math.round(cap * 60) + breakMin
      let startMin = earliest
      let endMin = startMin + grossMin
      if (endMin > closingMin) {
        // Raccourcir pour tenir, en gardant la pause si toujours nécessaire.
        endMin = closingMin
        const fitGross = endMin - startMin
        const newCap = (fitGross - breakMin) / 60
        if (newCap < MIN_SHIFT_HOURS) continue
        // Recalcul cap & break si on passe sous le seuil.
        const newBreak = newCap > input.breakTriggerMinutes / 60 ? DEFAULT_BREAK_MINUTES : 0
        if (newBreak !== breakMin) {
          endMin = startMin + Math.round(newCap * 60) + newBreak
          if (endMin > closingMin) continue
        }
      }

      const netHours = (endMin - startMin - breakMin) / 60
      shifts.push({
        employee_id: emp.id,
        employee_name: emp.full_name,
        date: day,
        start_time: minToHHMM(startMin),
        end_time: minToHHMM(endMin),
        break_minutes: breakMin,
        poste_id: null,
        position: emp.position,
        notes: null,
      })

      state.hoursPlanned += netHours
      state.hoursToday.set(day, netHours)
      state.lastShiftEnd = { date: day, endMin }
      needed -= netHours
    }
  }

  const summary = shifts.length === 0
    ? "Aucun créneau généré : vérifie qu'il y a des employés disponibles, des heures d'ouverture configurées et des jours non fermés."
    : `${shifts.length} créneau${shifts.length > 1 ? 'x' : ''} généré${shifts.length > 1 ? 's' : ''} par l'algorithme, en respectant le repos quotidien de 11h, le plafond de 10h/jour, et les heures contractuelles.`

  return { shifts, summary }
}

// Staggered start: les shifts d'un même jour sont décalés pour couvrir la plage.
function computeStaggeredStart(
  index: number,
  totalShifts: number,
  openingMin: number,
  closingMin: number,
  shiftHours: number,
  breakMin: number,
): number {
  if (totalShifts <= 1) return openingMin
  const shiftSpan = Math.round(shiftHours * 60) + breakMin
  const slack = Math.max(0, (closingMin - openingMin) - shiftSpan)
  const step = slack / (totalShifts - 1)
  return openingMin + Math.round(index * step)
}
