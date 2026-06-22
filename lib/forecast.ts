// Prévision de CA + calibrage de la cible de productivité (coût MO / CA).
// Tout est déterministe (pas de ML) : moyenne par jour de semaine pondérée
// par la récence, sur l'historique de CA disponible.

export type DayCA = { date: string; amount: number }

// Cible coût main d'œuvre / CA par défaut selon le type d'établissement
// (repères HCR/retail). Utilisée seulement quand l'historique ne suffit pas.
const SECTOR_TARGET: Record<string, number> = {
  fast_food: 28,
  restaurant: 32,
  bakery: 32,
  hotel: 33,
  catering: 30,
  camping: 33,
  pizza: 28,
  cafe: 24,
  food_industry: 30,
  other: 30,
}

export function sectorTargetPct(activityType?: string | null): number {
  if (activityType && SECTOR_TARGET[activityType] != null) return SECTOR_TARGET[activityType]
  return 30
}

export function median(values: number[]): number | null {
  const v = values.filter(n => Number.isFinite(n)).sort((a, b) => a - b)
  if (v.length === 0) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

export function shiftHours(start: string, end: string, breakMin = 0): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  return Math.max(0, (mins - breakMin) / 60)
}

// Prévoit le CA de chaque jour cible : moyenne du même jour de semaine sur
// l'historique, pondérée par la récence (décroissance hebdomadaire). Repli sur
// la moyenne journalière globale si ce jour de semaine n'a pas d'historique.
export function forecastRevenue(history: DayCA[], targetDays: string[]): DayCA[] {
  const now = Date.now()
  const byDow = new Map<number, { amount: number; weeksAgo: number }[]>()
  const positive = history.filter(r => r.amount > 0)

  for (const r of positive) {
    const d = new Date(r.date + 'T12:00:00')
    const dow = d.getDay()
    const weeksAgo = Math.max(0, Math.floor((now - d.getTime()) / (7 * 86400000)))
    if (!byDow.has(dow)) byDow.set(dow, [])
    byDow.get(dow)!.push({ amount: r.amount, weeksAgo })
  }

  const overallMean = positive.length
    ? positive.reduce((s, r) => s + r.amount, 0) / positive.length
    : 0

  return targetDays.map(date => {
    const dow = new Date(date + 'T12:00:00').getDay()
    const samples = byDow.get(dow)
    if (!samples || samples.length === 0) return { date, amount: Math.round(overallMean) }
    let wsum = 0
    let vsum = 0
    for (const s of samples) {
      const w = Math.pow(0.85, s.weeksAgo)
      wsum += w
      vsum += w * s.amount
    }
    return { date, amount: wsum > 0 ? Math.round(vsum / wsum) : Math.round(overallMean) }
  })
}

// Clé de semaine ISO (pour regrouper les ratios réalisés par semaine).
export function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNo = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
