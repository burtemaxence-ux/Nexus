import { describe, it, expect } from 'vitest'
import { repairPlan, actionableViolationCount } from './repair'
import type { ProposedShift } from './solver'

function shift(employee_id: string, date: string, start_time: string, end_time: string, break_minutes = 0): ProposedShift {
  return { employee_id, date, start_time, end_time, break_minutes, employee_name: employee_id, poste_id: null, position: null, notes: null }
}

describe('repairPlan', () => {
  it('laisse intact un planning déjà conforme', () => {
    const clean = [
      shift('A', '2026-06-15', '09:00', '17:00', 30),
      shift('A', '2026-06-16', '09:00', '17:00', 30),
      shift('B', '2026-06-15', '09:00', '17:00', 30),
    ]
    const { shifts, dropped } = repairPlan(clean)
    expect(dropped).toBe(0)
    expect(shifts).toHaveLength(3)
    expect(actionableViolationCount(shifts)).toBe(0)
  })

  it('retire le créneau qui casse le repos de 11h', () => {
    // Lun 15:00–23:00 puis Mar 06:00–12:00 → 7h de repos < 11h.
    const bad = [
      shift('A', '2026-06-15', '15:00', '23:00', 30),
      shift('A', '2026-06-16', '06:00', '12:00', 0),
    ]
    const { shifts, dropped } = repairPlan(bad)
    expect(dropped).toBe(1)
    expect(actionableViolationCount(shifts)).toBe(0)
    // on garde le créneau du lundi (la queue est retirée)
    expect(shifts.some(s => s.date === '2026-06-15')).toBe(true)
  })

  it('retire le 7e jour consécutif', () => {
    const days = ['15', '16', '17', '18', '19', '20', '21'].map(d => shift('A', `2026-06-${d}`, '10:00', '14:00', 0))
    const { shifts } = repairPlan(days)
    expect(actionableViolationCount(shifts)).toBe(0)
    expect(shifts.length).toBeLessThan(7)
  })

  it('résout un shift de plus de 10h', () => {
    const bad = [shift('A', '2026-06-15', '08:00', '20:00', 30)] // 11h30 net
    const { shifts } = repairPlan(bad)
    expect(actionableViolationCount(shifts)).toBe(0)
  })

  it('ne supprime rien pour du travail de nuit seul (contextuel)', () => {
    // 22:00–23:30 = travail de nuit (warning) mais pas une infraction actionnable.
    const night = [shift('A', '2026-06-15', '22:00', '23:30', 0)]
    const { shifts, dropped } = repairPlan(night)
    expect(dropped).toBe(0)
    expect(shifts).toHaveLength(1)
  })
})

describe('repairPlan — règles mineurs / contrat (métadonnées)', () => {
  const MINOR = [{ id: 'M', birthDate: '2010-01-01' }] // ~16 ans

  it('retire un shift de nuit interdit à un apprenti mineur', () => {
    const bad = [shift('M', '2026-06-15', '22:00', '23:30', 0)]
    // Sans métadonnées : contextuel, on ne touche pas.
    expect(repairPlan(bad).dropped).toBe(0)
    // Avec métadonnées mineur : le créneau illégal est retiré.
    const { shifts, dropped } = repairPlan(bad, MINOR)
    expect(dropped).toBe(1)
    expect(actionableViolationCount(shifts, MINOR)).toBe(0)
  })

  it('retire un shift > 8h pour un apprenti mineur', () => {
    const bad = [shift('M', '2026-06-15', '08:00', '17:00', 0)] // 9h net
    const { shifts } = repairPlan(bad, MINOR)
    expect(actionableViolationCount(shifts, MINOR)).toBe(0)
  })

  it('respecte les heures contractuelles (temps partiel 20h)', () => {
    const PART = [{ id: 'P', weeklyHours: 20 }]
    const bad = ['15', '16', '17', '18', '19'].map(d => shift('P', `2026-06-${d}`, '09:00', '15:00', 0)) // 30h
    const { shifts } = repairPlan(bad, PART)
    expect(actionableViolationCount(shifts, PART)).toBe(0)
  })
})
