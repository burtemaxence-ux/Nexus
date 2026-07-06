import { describe, it, expect, beforeAll } from 'vitest'
import { generateCalendarToken, extractCalendarEmployeeId, verifyCalendarToken } from './ical'

const EMPLOYEE_ID = '123e4567-e89b-42d3-a456-426614174000'

beforeAll(() => {
  process.env.CALENDAR_SECRET = 'test-secret'
})

describe('token calendrier versionné', () => {
  it('extrait l’id employé d’un token bien formé', () => {
    const token = generateCalendarToken(EMPLOYEE_ID)
    expect(extractCalendarEmployeeId(token)).toBe(EMPLOYEE_ID)
  })

  it('rejette un token mal formé', () => {
    expect(extractCalendarEmployeeId('nope')).toBeNull()
    expect(extractCalendarEmployeeId('z'.repeat(48))).toBeNull()
  })

  it('vérifie un token à la bonne version', () => {
    const v1 = generateCalendarToken(EMPLOYEE_ID, 1)
    const v3 = generateCalendarToken(EMPLOYEE_ID, 3)
    expect(verifyCalendarToken(v1, EMPLOYEE_ID, 1)).toBe(true)
    expect(verifyCalendarToken(v3, EMPLOYEE_ID, 3)).toBe(true)
  })

  it('révocation : un token émis avant l’incrément de version est invalide', () => {
    const v1 = generateCalendarToken(EMPLOYEE_ID, 1)
    expect(verifyCalendarToken(v1, EMPLOYEE_ID, 2)).toBe(false)
  })

  it('la version 1 conserve le format historique (HMAC de l’id seul)', () => {
    // Compat : les liens distribués avant la migration 079 restent valides.
    expect(generateCalendarToken(EMPLOYEE_ID)).toBe(generateCalendarToken(EMPLOYEE_ID, 1))
  })

  it('un token forgé pour un autre employé est rejeté', () => {
    const other = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    const token = generateCalendarToken(other, 1)
    expect(verifyCalendarToken(token, EMPLOYEE_ID, 1)).toBe(false)
  })
})
