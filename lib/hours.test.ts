import { describe, it, expect } from 'vitest'
import { timeToMinutes, grossShiftMinutes, netShiftHours, weeklyOvertimeHours } from './hours'

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

describe('weeklyOvertimeHours', () => {
  const shift = (date: string, start: string, end: string) => ({ date, start_time: start, end_time: end, break_minutes: 0 })

  it('compte les heures sup par semaine, sans netter entre semaines', () => {
    // Semaine 1 (2026-W02) : 40h → 5h sup. Semaine 2 (2026-W03) : 30h → 0h sup.
    // Nettage naïf sur la période donnerait 0 ; le bon résultat est 5.
    const week1 = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'].map(d => shift(d, '08:00', '18:00')) // 4×10h = 40h
    const week2 = ['2026-01-12', '2026-01-13', '2026-01-14'].map(d => shift(d, '08:00', '18:00')) // 3×10h = 30h
    expect(weeklyOvertimeHours([...week1, ...week2], 35)).toBe(5)
  })

  it('renvoie 0 si aucune semaine ne dépasse le seuil', () => {
    const week = ['2026-01-05', '2026-01-06', '2026-01-07'].map(d => shift(d, '09:00', '17:00')) // 3×8h = 24h
    expect(weeklyOvertimeHours(week, 35)).toBe(0)
  })
})
