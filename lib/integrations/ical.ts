import { createHmac, timingSafeEqual } from 'crypto'
import type { Shift } from '@/types'

function getSecret(): string {
  const s = process.env.CALENDAR_SECRET
  if (!s) throw new Error('CALENDAR_SECRET environment variable is required')
  return s
}

/**
 * Le token est versionné par profil (profiles.calendar_token_version) pour être
 * révocable : incrémenter la version invalide tous les liens émis avant.
 * Version 1 = format historique (HMAC de l'id seul) — les liens déjà
 * distribués restent valides tant que l'employé ne régénère pas.
 */
function tokenSignature(employeeId: string, version: number): string {
  const payload = version <= 1 ? employeeId : `${employeeId}:v${version}`
  return createHmac('sha256', getSecret()).update(payload).digest('hex').slice(0, 16)
}

export function generateCalendarToken(employeeId: string, version = 1): string {
  return employeeId.replace(/-/g, '') + tokenSignature(employeeId, version)
}

/**
 * Extrait l'id employé candidat d'un token bien formé — SANS vérifier la
 * signature. Le contrôle d'accès se fait ensuite via verifyCalendarToken()
 * avec la version stockée sur le profil.
 */
export function extractCalendarEmployeeId(token: string): string | null {
  if (!/^[0-9a-f]{48}$/.test(token)) return null
  const idRaw = token.slice(0, 32)
  return [
    idRaw.slice(0, 8),
    idRaw.slice(8, 12),
    idRaw.slice(12, 16),
    idRaw.slice(16, 20),
    idRaw.slice(20),
  ].join('-')
}

export function verifyCalendarToken(token: string, employeeId: string, version = 1): boolean {
  const sig = Buffer.from(token.slice(32))
  const expected = Buffer.from(tokenSignature(employeeId, version))
  return sig.length === expected.length && timingSafeEqual(sig, expected)
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
    'PRODID:-//Quartzbase//Planning//FR',
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
