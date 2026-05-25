import { createHmac } from 'crypto'
import type { Shift } from '@/types'

const SECRET = process.env.CALENDAR_SECRET ?? 'nexus-calendar-2024'

export function generateCalendarToken(employeeId: string): string {
  const hmac = createHmac('sha256', SECRET).update(employeeId).digest('hex').slice(0, 16)
  return employeeId.replace(/-/g, '') + hmac
}

export function parseCalendarToken(token: string): string | null {
  if (!/^[0-9a-f]{48}$/.test(token)) return null
  const idRaw = token.slice(0, 32)
  const sig = token.slice(32)
  const employeeId = [
    idRaw.slice(0, 8),
    idRaw.slice(8, 12),
    idRaw.slice(12, 16),
    idRaw.slice(16, 20),
    idRaw.slice(20),
  ].join('-')
  const expected = createHmac('sha256', SECRET).update(employeeId).digest('hex').slice(0, 16)
  return sig === expected ? employeeId : null
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function icsDateTime(date: string, time: string): string {
  // date: "2024-06-03", time: "09:00:00" → "20240603T090000"
  return date.replace(/-/g, '') + 'T' + time.replace(/:/g, '').slice(0, 6)
}

function icsNow(): string {
  return new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
}

export function generateICS(
  shifts: Shift[],
  employeeName: string,
  orgName: string,
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nexus//Planning//FR',
    `X-WR-CALNAME:${icsEscape(`Planning ${employeeName} — ${orgName}`)}`,
    'X-WR-TIMEZONE:Europe/Paris',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const shift of shifts) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:nexus-${shift.id}@nexus`)
    lines.push(`DTSTAMP:${icsNow()}`)
    lines.push(`DTSTART;TZID=Europe/Paris:${icsDateTime(shift.date, shift.start_time)}`)
    lines.push(`DTEND;TZID=Europe/Paris:${icsDateTime(shift.date, shift.end_time)}`)
    lines.push(`SUMMARY:${icsEscape(shift.position ?? 'Service')} — ${icsEscape(orgName)}`)
    if (shift.break_minutes > 0) {
      lines.push(`DESCRIPTION:Pause : ${shift.break_minutes} min`)
    }
    if (shift.notes) {
      lines.push(`DESCRIPTION:${icsEscape(shift.notes)}`)
    }
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
