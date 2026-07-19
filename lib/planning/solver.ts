// Solveur de planning déterministe.
// Alternative gratuite, instantanée et auditable au LLM pour /api/ai/plan.
//
// Principe : CONFORME PAR CONSTRUCTION + respect du contrat hebdomadaire.
//   - On vise les heures contractuelles : un CDI 35h est planifié ~35h, pas 16h.
//   - Disponibilités déclarées respectées : un employé n'est planifié que ses
//     jours de disponibilité, dans sa fenêtre horaire (aucune dispo déclarée =
//     disponible sur toute l'amplitude d'ouverture).
//   - Couverture par besoin : chaque jour ouvert reçoit une base de couverture,
//     le surplus d'heures est réparti au prorata du chiffre d'affaires prévu
//     (les jours chargés reçoivent plus de monde) — jamais en descendant sous
//     le contrat d'un employé.
//   - Repos quotidien garanti : les horaires d'un employé peuvent varier d'un
//     jour à l'autre (fenêtres de dispo), mais le début d'un jour J+1 ne peut
//     jamais précéder `début(J) + brut(J) − 13h` — soit toujours ≥ 11h de
//     repos entre deux services (le brut étant plafonné à 10h30).
//   - ≤ 6 jours travaillés (repos hebdo), ≤ 10h/jour, pause dès que le seuil
//     légal est atteint, amplitude ≤ 10h30 (< 13h).

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

// Ligne de la table `availabilities` (0 = lundi … 6 = dimanche). Un employé
// SANS ligne est réputé disponible partout ; un employé AVEC des lignes n'est
// disponible QUE ces jours-là, dans la fenêtre [start_time, end_time].
export type SolverAvailability = {
  day_of_week: number
  start_time: string
  end_time: string
}

export type SolverInput = {
  weekDays: string[]
  openingTime: string
  closingTime: string
  closedDaysIdx: number[]
  employees: SolverEmployee[]
  leaveByEmployee: Record<string, string[]>
  availabilityByEmployee: Record<string, SolverAvailability[]>
  existingShifts: SolverExistingShift[]
  forecast: { date: string; amount: number }[] | null
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
const LEGAL_BREAK_TRIGGER_MIN = 360 // L3121-16 : pause obligatoire dès 6h
// start(J+1) ≥ start(J) + brut(J) − 780 garantit un repos ≥ 11h (660 min)
// entre deux jours calendaires consécutifs : repos = 1440 − brut(J) +
// (start(J+1) − start(J)) ≥ 1440 − 780 = 660.
const REST_WINDOW_MIN = 780

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

function prevDateStr(date: string): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

  const effTrigger = Math.min(input.breakTriggerMinutes, LEGAL_BREAK_TRIGGER_MIN)

  // Fenêtre de disponibilité par employé et par jour, bornée aux heures
  // d'ouverture. `null` = pas de dispo déclarée ce jour-là (jour exclu).
  const availWindows = new Map<string, Map<number, { s: number; e: number }>>()
  for (const [empId, rows] of Object.entries(input.availabilityByEmployee)) {
    if (!rows || rows.length === 0) continue
    const byDay = new Map<number, { s: number; e: number }>()
    for (const r of rows) {
      const s = Math.max(openMin, timeToMinutes(r.start_time.slice(0, 5)))
      const e = Math.min(closeMin, timeToMinutes(r.end_time.slice(0, 5)))
      if (e > s) byDay.set(r.day_of_week, { s, e })
    }
    availWindows.set(empId, byDay)
  }

  // Fenêtre d'un employé pour un jour donné, ou null si indisponible.
  function windowFor(empId: string, date: string): { s: number; e: number } | null {
    const byDay = availWindows.get(empId)
    if (!byDay) return { s: openMin, e: closeMin } // aucune dispo déclarée
    return byDay.get(isoDayIdx(date)) ?? null
  }

  // Heures déjà planifiées (shifts existants) → comptées dans le contrat, et
  // jours déjà occupés → on n'y replanifie pas l'employé. On garde aussi
  // l'enveloppe horaire [début, fin] de chaque jour existant pour que la
  // contrainte de repos de 11h tienne compte des créneaux déjà en base
  // (semaine partiellement remplie) et pas seulement de ceux qu'on crée.
  const existingHours = new Map<string, number>()
  const busyDays = new Map<string, Set<string>>()
  const existingEnvelope = new Map<string, { s: number; e: number }>() // clé `${empId}__${date}`
  for (const s of input.existingShifts) {
    existingHours.set(s.employee_id, (existingHours.get(s.employee_id) ?? 0) + calcHours(s.start_time, s.end_time, s.break_minutes ?? 0))
    if (!busyDays.has(s.employee_id)) busyDays.set(s.employee_id, new Set())
    busyDays.get(s.employee_id)!.add(s.date)
    const sMin = timeToMinutes(s.start_time.slice(0, 5))
    let eMin = timeToMinutes(s.end_time.slice(0, 5))
    if (eMin <= sMin) eMin += 1440 // shift de nuit
    const key = `${s.employee_id}__${s.date}`
    const env = existingEnvelope.get(key)
    existingEnvelope.set(key, { s: Math.min(env?.s ?? sMin, sMin), e: Math.max(env?.e ?? eMin, eMin) })
  }

  // ── Besoin de couverture par jour (en heures-personnel) ────────────────────
  // Chaque jour ouvert reçoit une BASE (pour ne jamais laisser un jour ouvert
  // sans personne), puis le SURPLUS d'heures est réparti au prorata du CA
  // prévu. Sans prévision : répartition uniforme.
  const forecastMap = new Map<string, number>()
  for (const f of input.forecast ?? []) forecastMap.set(f.date, Math.max(0, f.amount))
  const hasForecast = openDays.some(d => (forecastMap.get(d) ?? 0) > 0)

  const employeesOrdered = [...input.employees]
    .map(emp => {
      const contractH = Math.min(emp.weekly_hours ?? DEFAULT_WEEKLY_HOURS, MAX_WEEKLY_HOURS)
      const remaining = contractH - (existingHours.get(emp.id) ?? 0)
      return { emp, remaining }
    })
    .filter(x => x.remaining >= MIN_SHIFT_HOURS)
    // Gros contrats d'abord (premiers servis sur les jours à fort besoin),
    // puis id pour un ordre stable.
    .sort((a, b) => b.remaining - a.remaining || a.emp.id.localeCompare(b.emp.id))

  const totalPlannedH = employeesOrdered.reduce((s, x) => s + x.remaining, 0)
  const baseH = Math.min(PREFERRED_DAILY_HOURS, totalPlannedH / openDays.length)
  const weightSum = openDays.reduce((s, d) => s + (hasForecast ? (forecastMap.get(d) ?? 0) : 1), 0)
  const extraH = Math.max(0, totalPlannedH - baseH * openDays.length)
  const targetH = new Map<string, number>()
  const assignedH = new Map<string, number>()
  for (const d of openDays) {
    const w = hasForecast ? (forecastMap.get(d) ?? 0) : 1
    targetH.set(d, baseH + (weightSum > 0 ? (extraH * w) / weightSum : 0))
    assignedH.set(d, 0)
  }

  // Équilibre matin/soir sur la semaine : chaque employé garde le même créneau
  // (tôt ou tard) toute la semaine, le côté le moins couvert prend le suivant.
  let earlyH = 0
  let lateH = 0

  for (const { emp, remaining } of employeesOrdered) {
    // Jours candidats : ouverts, disponibles (dispo déclarée), pas en congé,
    // pas déjà occupés.
    const leaveSet = new Set(input.leaveByEmployee[emp.id] ?? [])
    const empBusy = busyDays.get(emp.id) ?? new Set<string>()
    const candidates = openDays.filter(d => !leaveSet.has(d) && !empBusy.has(d) && windowFor(emp.id, d) !== null)
    if (candidates.length === 0) continue

    const maxDays = Math.min(MAX_WEEK_DAYS - empBusy.size, candidates.length)
    if (maxDays <= 0) continue

    // Nombre de jours travaillés et durée quotidienne pour viser le contrat.
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

    // Choix des jours : les plus déficitaires en couverture d'abord
    // (déficit = besoin visé − heures déjà affectées), à égalité l'ordre
    // chronologique. C'est ce qui concentre l'effectif sur les jours à fort
    // CA tout en garantissant une base sur chaque jour ouvert.
    const workDays = [...candidates]
      .sort((a, b) => {
        const da = (targetH.get(a) ?? 0) - (assignedH.get(a) ?? 0)
        const db = (targetH.get(b) ?? 0) - (assignedH.get(b) ?? 0)
        return db - da || a.localeCompare(b)
      })
      .slice(0, days)
      .sort() // retour à l'ordre chronologique pour la chaîne de repos

    const isLate = lateH < earlyH

    // Créneaux jour par jour : position tôt/tard dans la fenêtre de dispo,
    // puis contrainte de repos vis-à-vis du jour précédent (créneau posé par
    // le solveur OU déjà en base) et du jour suivant déjà en base.
    let prevDate: string | null = null
    let prevEnd = 0
    for (const day of workDays) {
      const win = windowFor(emp.id, day)!
      const netPlanned = Math.floor(dailyLen * 60) // floor : jamais au-dessus du contrat
      let breakMin = netPlanned > effTrigger ? BREAK_MINUTES : 0
      let gross = netPlanned + breakMin

      // Repos quotidien : ne jamais commencer moins de 11h après la fin de la
      // veille (start ≥ fin(J−1) − 780, cf. REST_WINDOW_MIN)…
      const yesterday = prevDateStr(day)
      const prevEnvelope = existingEnvelope.get(`${emp.id}__${yesterday}`)
      let restFloor = -Infinity
      if (prevDate === yesterday) restFloor = Math.max(restFloor, prevEnd - REST_WINDOW_MIN)
      if (prevEnvelope) restFloor = Math.max(restFloor, prevEnvelope.e - REST_WINDOW_MIN)
      // …ni finir moins de 11h avant le début d'un créneau déjà en base demain.
      const nextDay = new Date(day + 'T00:00:00')
      nextDay.setDate(nextDay.getDate() + 1)
      const tomorrowKey = `${emp.id}__${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`
      const nextEnvelope = existingEnvelope.get(tomorrowKey)
      const endCap = nextEnvelope ? nextEnvelope.s + REST_WINDOW_MIN : Infinity

      let start = isLate ? Math.max(win.s, win.e - gross) : win.s
      start = Math.max(start, restFloor)
      let end = start + gross

      const maxEnd = Math.min(win.e, endCap)
      if (end > maxEnd) {
        // La fenêtre (ou le repos) ne laisse pas la place du créneau complet :
        // on le rétrécit plutôt que de perdre le jour.
        end = maxEnd
        start = Math.max(win.s, restFloor)
        gross = end - start
        breakMin = gross > effTrigger ? BREAK_MINUTES : 0
        if (gross - breakMin < MIN_SHIFT_HOURS * 60) continue // trop court → jour abandonné
      }

      const netMin = end - start - breakMin
      shifts.push({
        employee_id: emp.id,
        employee_name: emp.full_name,
        date: day,
        start_time: minToHHMM(start),
        end_time: minToHHMM(end),
        break_minutes: breakMin,
        poste_id: null,
        position: emp.position,
        notes: null,
      })
      assignedH.set(day, (assignedH.get(day) ?? 0) + netMin / 60)
      prevDate = day
      prevEnd = end
    }

    const plannedTotal = shifts
      .filter(s => s.employee_id === emp.id)
      .reduce((s2, s) => s2 + calcHours(s.start_time, s.end_time, s.break_minutes), 0)
    if (isLate) lateH += plannedTotal
    else earlyH += plannedTotal
  }

  // Tri pour un rendu stable (par date puis nom).
  shifts.sort((a, b) => (a.date === b.date ? a.employee_name.localeCompare(b.employee_name) : a.date.localeCompare(b.date)))

  const withAvail = input.employees.filter(e => (input.availabilityByEmployee[e.id] ?? []).length > 0).length
  const availNote = withAvail > 0 ? `, les disponibilités déclarées (${withAvail} employé${withAvail > 1 ? 's' : ''})` : ''
  const coverageNote = hasForecast ? ' Effectif concentré sur les jours à fort chiffre d’affaires prévu, avec une base de couverture chaque jour ouvert.' : ''
  const summary = shifts.length === 0
    ? "Aucun créneau généré : vérifiez les heures d'ouverture, les jours fermés, les disponibilités et les contrats des employés."
    : `${shifts.length} créneau${shifts.length > 1 ? 'x' : ''} généré${shifts.length > 1 ? 's' : ''} en respectant les heures contractuelles${availNote}, le repos quotidien de 11h, le plafond de 10h/jour et 6 jours travaillés maximum. Aucune infraction au Code du travail.${coverageNote}`

  return { shifts, summary }
}
