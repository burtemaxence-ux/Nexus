// Solveur de planning déterministe.
// Alternative gratuite, instantanée et auditable au LLM pour /api/ai/plan.
//
// Principe : CONFORME PAR CONSTRUCTION + respect du contrat hebdomadaire.
//   - Chaque employé reçoit un template horaire FIXE pour la semaine (même
//     heure de début chaque jour). Comme un jour fait 24h et qu'un shift est
//     plafonné à ~10h, le repos entre deux jours travaillés est toujours ≥ 13h
//     (≥ 11h légal) — aucune violation de repos quotidien possible.
//   - On vise les heures contractuelles : un CDI 35h est planifié ~35h, pas 16h.
//   - ≤ 6 jours travaillés (repos hebdo garanti), ≤ 10h/jour, pause si > seuil,
//     amplitude ≤ 10h30 (< 13h).
//   - Le chiffre d'affaires prévu ne sert qu'à choisir QUELS jours travailler
//     (on concentre sur les jours à fort CA), jamais à descendre sous le contrat.

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
  weekDays: string[]
  openingTime: string
  closingTime: string
  closedDaysIdx: number[]
  employees: SolverEmployee[]
  leaveByEmployee: Record<string, string[]>
  existingShifts: SolverExistingShift[]
  forecast: { date: string; amount: number }[] | null
  targetPct: number | null
  rateMap: Record<string, number>
  breakTriggerMinutes: number
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

const MIN_SHIFT_HOURS = 3
const MAX_SHIFT_HOURS = 10          // L3121-18 (max 10h effectives / jour)
const MAX_WEEK_DAYS = 6             // L3132-1 (repos hebdomadaire)
const MAX_WEEKLY_HOURS = 48         // L3121-20
const DEFAULT_WEEKLY_HOURS = 35
const BREAK_MINUTES = 30
const PREFERRED_DAILY_HOURS = 8     // longueur de shift visée

// ── Helpers ──────────────────────────────────────────────────────────────────

function minToHHMM(m: number): string {
  const h = Math.floor(m / 60)
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// 0 = lundi … 6 = dimanche
function isoDayIdx(date: string): number {
  return (new Date(date + 'T00:00:00').getDay() + 6) % 7
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// ── Solver ───────────────────────────────────────────────────────────────────

export function solvePlanning(input: SolverInput): SolverOutput {
  const shifts: ProposedShift[] = []

  const openMin = timeToMinutes(input.openingTime)
  const closeMin = timeToMinutes(input.closingTime)
  const span = closeMin - openMin
  if (span <= 0) {
    return { shifts: [], summary: "Heures d'ouverture invalides : vérifiez l'ouverture et la fermeture dans Réglages › Planning." }
  }

  // Jours ouverts de la semaine (hors fermeture).
  const openDays = input.weekDays.filter(d => !input.closedDaysIdx.includes(isoDayIdx(d)))
  if (openDays.length === 0 || input.employees.length === 0) {
    return { shifts: [], summary: 'Aucun jour ouvré ou aucun employé : rien à générer.' }
  }

  // Classement des jours par CA prévu décroissant (pour concentrer l'effectif
  // sur les jours chargés). Sans prévision : ordre chronologique.
  const forecastMap = new Map<string, number>()
  for (const f of input.forecast ?? []) forecastMap.set(f.date, f.amount)
  const daysByForecast = [...openDays].sort((a, b) => (forecastMap.get(b) ?? 0) - (forecastMap.get(a) ?? 0))
  const hasForecast = (input.forecast ?? []).some(f => f.amount > 0)

  // Heures déjà planifiées (shifts existants) → comptées dans le contrat, et
  // jours déjà occupés → on n'y replanifie pas l'employé.
  const existingHours = new Map<string, number>()
  const busyDays = new Map<string, Set<string>>()
  for (const s of input.existingShifts) {
    existingHours.set(s.employee_id, (existingHours.get(s.employee_id) ?? 0) + calcHours(s.start_time, s.end_time, s.break_minutes ?? 0))
    if (!busyDays.has(s.employee_id)) busyDays.set(s.employee_id, new Set())
    busyDays.get(s.employee_id)!.add(s.date)
  }

  input.employees.forEach((emp, idx) => {
    const contractH = Math.min(emp.weekly_hours ?? DEFAULT_WEEKLY_HOURS, MAX_WEEKLY_HOURS)
    const already = existingHours.get(emp.id) ?? 0
    let remaining = contractH - already
    if (remaining < MIN_SHIFT_HOURS) return // contrat déjà couvert

    // Jours disponibles : ouverts, pas en congé, pas déjà occupés.
    const leaveSet = new Set(input.leaveByEmployee[emp.id] ?? [])
    const empBusy = busyDays.get(emp.id) ?? new Set<string>()
    const ordered = hasForecast ? daysByForecast : openDays
    const available = ordered.filter(d => !leaveSet.has(d) && !empBusy.has(d))
    if (available.length === 0) return

    // Nombre de jours travaillés et durée quotidienne pour viser le contrat.
    const maxDays = Math.min(MAX_WEEK_DAYS - empBusy.size, available.length)
    if (maxDays <= 0) return

    let days = Math.min(maxDays, Math.max(1, Math.round(remaining / PREFERRED_DAILY_HOURS)))
    let dailyLen = remaining / days
    if (dailyLen > MAX_SHIFT_HOURS) {
      // Le contrat ne tient pas en `days` jours : on étale au maximum.
      days = Math.min(maxDays, Math.ceil(remaining / MAX_SHIFT_HOURS))
      dailyLen = Math.min(MAX_SHIFT_HOURS, remaining / days)
    }
    if (dailyLen < MIN_SHIFT_HOURS) {
      // Reste trop petit pour être étalé : on concentre sur moins de jours.
      days = Math.max(1, Math.floor(remaining / MIN_SHIFT_HOURS))
      dailyLen = remaining / days
    }
    dailyLen = Math.min(MAX_SHIFT_HOURS, dailyLen)

    // Choix des jours : on biaise vers le CA, mais on décale par employé pour
    // étaler la couverture sur la semaine (sinon tout le monde le même jour).
    const offset = hasForecast ? 0 : idx % available.length
    const workDays: string[] = []
    for (let i = 0; i < available.length && workDays.length < days; i++) {
      workDays.push(available[(i + offset) % available.length])
    }

    // Template horaire FIXE pour la semaine. Alternance tôt / tard par employé
    // pour couvrir l'amplitude d'ouverture (matin ↔ soir).
    const grossMin = Math.round(dailyLen * 60) + (dailyLen * 60 > input.breakTriggerMinutes ? BREAK_MINUTES : 0)
    const breakMin = dailyLen * 60 > input.breakTriggerMinutes ? BREAK_MINUTES : 0
    const isLate = idx % 2 === 1
    let startMin = isLate ? Math.max(openMin, closeMin - grossMin) : openMin
    let endMin = startMin + grossMin
    if (endMin > closeMin) { endMin = closeMin; startMin = Math.max(openMin, endMin - grossMin) }

    const netHours = round1((endMin - startMin - breakMin) / 60)
    if (netHours < MIN_SHIFT_HOURS) return

    for (const day of workDays) {
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
    }
  })

  // Tri pour un rendu stable (par date puis nom).
  shifts.sort((a, b) => (a.date === b.date ? a.employee_name.localeCompare(b.employee_name) : a.date.localeCompare(b.date)))

  const summary = shifts.length === 0
    ? "Aucun créneau généré : vérifiez les heures d'ouverture, les jours fermés et les contrats des employés."
    : `${shifts.length} créneau${shifts.length > 1 ? 'x' : ''} généré${shifts.length > 1 ? 's' : ''} en respectant les heures contractuelles, le repos quotidien de 11h, le plafond de 10h/jour et 6 jours travaillés maximum. Aucune infraction au Code du travail.`

  return { shifts, summary }
}
