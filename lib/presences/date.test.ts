import { describe, expect, it } from 'vitest'
import { parisDate, parisShiftInstant } from './date'

describe('parisDate', () => {
  it('utilise le jour français autour de minuit UTC', () => {
    expect(parisDate(new Date('2026-07-01T22:30:00Z'))).toBe('2026-07-02')
    expect(parisDate(new Date('2026-01-01T23:30:00Z'))).toBe('2026-01-02')
  })

  it('garde le même jour pendant les changements d’heure', () => {
    expect(parisDate(new Date('2026-03-29T01:30:00Z'))).toBe('2026-03-29')
    expect(parisDate(new Date('2026-10-25T01:30:00Z'))).toBe('2026-10-25')
  })

  it('convertit une heure de service locale en UTC hiver et été', () => {
    expect(parisShiftInstant('2026-01-12', '09:00')?.toISOString()).toBe('2026-01-12T08:00:00.000Z')
    expect(parisShiftInstant('2026-07-12', '09:00')?.toISOString()).toBe('2026-07-12T07:00:00.000Z')
  })

  it('rejette une heure inexistante et choisit le premier passage en automne', () => {
    expect(parisShiftInstant('2026-03-29', '02:30')).toBeNull()
    expect(parisShiftInstant('2026-10-25', '02:30')?.toISOString()).toBe('2026-10-25T00:30:00.000Z')
  })
})
