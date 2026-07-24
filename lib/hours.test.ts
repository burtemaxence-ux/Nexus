import { describe, it, expect } from 'vitest'
import { timeToMinutes, grossShiftMinutes, netShiftHours } from './hours'

describe('timeToMinutes', () => {
  it('convertit HH:MM en minutes', () => {
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('23:59')).toBe(1439)
  })
})

describe('grossShiftMinutes', () => {
  it('durée d\'un créneau de journée', () => {
    expect(grossShiftMinutes('09:00', '17:00')).toBe(480)
  })
  it('gère le passage minuit (nuit)', () => {
    expect(grossShiftMinutes('22:00', '06:00')).toBe(480)
    expect(grossShiftMinutes('23:30', '00:30')).toBe(60)
  })
})

describe('netShiftHours', () => {
  it('déduit la pause', () => {
    expect(netShiftHours('09:00', '17:00', 60)).toBe(7)
  })
  it('créneau de nuit avec pause', () => {
    expect(netShiftHours('22:00', '06:00', 30)).toBe(7.5)
  })
  it('ne renvoie jamais de négatif si la pause dépasse la durée', () => {
    expect(netShiftHours('09:00', '09:15', 60)).toBe(0)
  })
})
