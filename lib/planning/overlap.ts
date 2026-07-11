// Détection de chevauchement horaire entre créneaux d'un même employé, en
// minutes absolues depuis l'époque (UTC) pour gérer correctement les créneaux
// de nuit (fin ≤ début → +1 jour) et les chevauchements à cheval sur minuit.

export type ShiftTimes = { date: string; start_time: string; end_time: string }

function toMin(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function absRange(s: ShiftTimes): [number, number] {
  const base = Date.parse(s.date + 'T00:00:00Z') / 60000
  const start = toMin(s.start_time)
  let end = toMin(s.end_time)
  if (end <= start) end += 1440 // overnight
  return [base + start, base + end]
}

// Deux créneaux se chevauchent si leurs plages [début, fin) s'intersectent.
export function shiftsOverlap(a: ShiftTimes, b: ShiftTimes): boolean {
  const [as_, ae] = absRange(a)
  const [bs, be] = absRange(b)
  return as_ < be && bs < ae
}

// Un candidat chevauche-t-il l'un des créneaux de référence (mêmes plages) ?
export function overlapsAny(candidate: ShiftTimes, others: ShiftTimes[]): boolean {
  return others.some(o => shiftsOverlap(candidate, o))
}
