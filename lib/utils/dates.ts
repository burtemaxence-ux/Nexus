/**
 * Retourne un tableau de 7 Date (lundi au dimanche) pour la semaine contenant `date`.
 */
export function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  // getDay() : 0=dimanche, 1=lundi, ...
  const day = d.getDay()
  // Décalage pour obtenir le lundi (si dimanche, on recule de 6 jours)
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return day
  })
}

/**
 * Formate une date en français : "lun. 21 mai"
 */
export function formatDateFR(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

/**
 * Retourne le label de la semaine : "21 – 27 mai 2026"
 */
export function getWeekLabel(weekDates: Date[]): string {
  const first = weekDates[0]
  const last = weekDates[6]

  const firstDay = first.getDate()
  const lastDay = last.getDate()

  const firstMonth = first.toLocaleDateString('fr-FR', { month: 'long' })
  const lastMonth = last.toLocaleDateString('fr-FR', { month: 'long' })
  const year = last.getFullYear()

  if (firstMonth === lastMonth) {
    return `${firstDay} – ${lastDay} ${firstMonth} ${year}`
  }
  return `${firstDay} ${firstMonth} – ${lastDay} ${lastMonth} ${year}`
}

/**
 * Retourne la date au format ISO "2026-05-21"
 */
export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Ajoute N jours à une date et retourne une nouvelle Date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Retourne le lundi de la semaine contenant `date`
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

/**
 * Retourne le numéro de semaine ISO (1–53) d'une date
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

/**
 * Retourne la semaine ISO au format "YYYY-Wnn" (ex: "2026-W22")
 */
export function getISOWeekString(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const weekNum = getISOWeekNumber(d)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

/**
 * Retourne le lundi et le dimanche de la semaine contenant `date`
 */
export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const start = getMondayOfWeek(date)
  const end = addDays(start, 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Retourne le lundi et le dimanche de la semaine précédente
 */
export function getLastWeekBounds(now: Date = new Date()): { start: Date; end: Date } {
  const monday = getMondayOfWeek(now)
  const lastMonday = addDays(monday, -7)
  const lastSunday = addDays(lastMonday, 6)
  lastSunday.setHours(23, 59, 59, 999)
  return { start: lastMonday, end: lastSunday }
}

/**
 * Retourne le lundi et le dimanche de la semaine en cours
 */
export function getThisWeekBounds(now: Date = new Date()): { start: Date; end: Date } {
  return getWeekBounds(now)
}
