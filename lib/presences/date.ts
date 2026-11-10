export function parisDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

// Shifts store a local DATE + TIME, while pointages are UTC instants.
// During the autumn clock change, prefer the first occurrence of an ambiguous time.
export function parisShiftInstant(date: string, time: string): Date | null {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isInteger)) return null
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const localMs = Date.UTC(year, month - 1, day, hour, minute)
  for (const offsetHours of [2, 1]) {
    const candidate = new Date(localMs - offsetHours * 3600000)
    if (parisDate(candidate) === date && formatter.format(candidate) === `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`) {
      return candidate
    }
  }
  return null // a nonexistent wall time during the spring change
}
