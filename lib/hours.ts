// Calculs d'heures partagés — source unique de vérité pour la durée des
// créneaux (planning, rapport paie, exports). Gère les créneaux de nuit
// (fin <= début → +24h). Extrait pour éviter les copies divergentes qui
// existaient dans rapport/page.tsx, exports/summary et shift-form.ts.

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
