import { describe, it, expect, beforeAll } from 'vitest'
import { generateCalendarToken, parseCalendarToken } from './ical'

beforeAll(() => {
  process.env.CALENDAR_SECRET = 'test-calendar-secret'
})

const EMPLOYEE_ID = '3f8b1c2d-4e5a-6789-abcd-ef0123456789'

describe('calendar token', () => {
  it('fait un round-trip generate → parse', () => {
    const token = generateCalendarToken(EMPLOYEE_ID)
    expect(parseCalendarToken(token)).toBe(EMPLOYEE_ID)
  })

  it('rejette un token de mauvais format', () => {
    expect(parseCalendarToken('pas-un-token')).toBeNull()
    expect(parseCalendarToken('')).toBeNull()
    expect(parseCalendarToken('z'.repeat(48))).toBeNull()
  })

  it('rejette une signature falsifiée (bon id, mauvais HMAC)', () => {
    const token = generateCalendarToken(EMPLOYEE_ID)
    const tampered = token.slice(0, 40) + (token[40] === 'a' ? 'b' : 'a') + token.slice(41)
    expect(parseCalendarToken(tampered)).toBeNull()
  })
})
