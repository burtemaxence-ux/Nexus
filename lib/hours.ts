// Calculs d'heures partagés — source unique de vérité pour la durée des
// créneaux (planning, rapport paie, exports). Gère les créneaux de nuit
// (fin <= début → +24h). Extrait pour éviter les copies divergentes qui
// existaient dans rapport/page.tsx, exports/summary et shift-form.ts.
import { getISOWeekString } from '@/lib/utils/dates'

/** "HH:MM" → minutes depuis minuit. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/**
 * Durée brute d'un créneau en minutes (pause NON déduite), en gérant le
 * passage minuit : si la fin est avant le début, on ajoute 24h.
 */
export function grossShiftMinutes(start: string, end: string): number {
  let minutes = timeToMinutes(end) - timeToMinutes(start)
  if (minutes < 0) minutes += 24 * 60
  return minutes
}

/**
 * Heures nettes travaillées d'un créneau (pause déduite), jamais négatif.
 */
export function netShiftHours(start: string, end: string, breakMinutes: number): number {
  return Math.max(0, (grossShiftMinutes(start, end) - breakMinutes) / 60)
}

type ShiftForHours = { date: string; start_time: string; end_time: string; break_minutes: number }

/**
 * Total d'heures supplémentaires sur une période, calculé PAR SEMAINE ISO.
 * Les heures sup se comptent semaine par semaine (> seuil hebdomadaire) et ne
 * se nettent jamais entre semaines : une semaine à 40h puis une à 30h (seuil
 * 35h) = 5h sup, pas 0. Aligné sur le rapport de paie.
 */
export function weeklyOvertimeHours(shifts: ShiftForHours[], weeklyThreshold: number): number {
  const byWeek = new Map<string, number>()
  for (const s of shifts) {
    const wk = getISOWeekString(new Date(s.date))
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + netShiftHours(s.start_time, s.end_time, s.break_minutes))
  }
  let overtime = 0
  for (const weekHours of Array.from(byWeek.values())) {
    overtime += Math.max(0, weekHours - weeklyThreshold)
  }
  return overtime
}
