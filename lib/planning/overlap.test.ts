import { describe, it, expect } from 'vitest'
import { shiftsOverlap, overlapsAny } from './overlap'

const s = (date: string, start_time: string, end_time: string) => ({ date, start_time, end_time })

describe('shiftsOverlap', () => {
  it('détecte deux créneaux qui se chevauchent le même jour', () => {
    expect(shiftsOverlap(s('2026-06-15', '09:00', '17:00'), s('2026-06-15', '16:00', '20:00'))).toBe(true)
  })

  it('ne chevauche pas deux créneaux jointifs (fin = début)', () => {
    expect(shiftsOverlap(s('2026-06-15', '09:00', '14:00'), s('2026-06-15', '14:00', '20:00'))).toBe(false)
  })

  it('ne chevauche pas deux jours différents', () => {
    expect(shiftsOverlap(s('2026-06-15', '09:00', '17:00'), s('2026-06-16', '09:00', '17:00'))).toBe(false)
  })

  it('gère un créneau de nuit à cheval sur minuit', () => {
    // Lun 22:00 → Mar 02:00 chevauche un créneau Mar 01:00–06:00.
    expect(shiftsOverlap(s('2026-06-15', '22:00', '02:00'), s('2026-06-16', '01:00', '06:00'))).toBe(true)
  })

  it('accepte les secondes dans les horaires (HH:MM:SS)', () => {
    expect(shiftsOverlap(s('2026-06-15', '09:00:00', '17:00:00'), s('2026-06-15', '17:00:00', '20:00:00'))).toBe(false)
  })

  it('détecte un doublon exact', () => {
    expect(shiftsOverlap(s('2026-06-15', '09:00', '17:00'), s('2026-06-15', '09:00', '17:00'))).toBe(true)
  })
})

describe('overlapsAny', () => {
  it('vrai si le candidat chevauche au moins un créneau', () => {
    const others = [s('2026-06-15', '09:00', '12:00'), s('2026-06-15', '18:00', '23:00')]
    expect(overlapsAny(s('2026-06-15', '11:00', '15:00'), others)).toBe(true)
    expect(overlapsAny(s('2026-06-15', '13:00', '17:00'), others)).toBe(false)
  })
})
