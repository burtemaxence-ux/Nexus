import { describe, it, expect } from 'vitest'
import { applyPlanAdjustment } from './adjust'
import type { ProposedShift } from './solver'

const mk = (
  employee_id: string,
  date: string,
  start_time = '09:00',
  end_time = '17:00',
): ProposedShift => ({
  employee_id,
  employee_name: employee_id,
  date,
  start_time,
  end_time,
  break_minutes: 0,
  poste_id: null,
  position: null,
  notes: null,
})

describe('applyPlanAdjustment', () => {
  it('retire les créneaux demandés (clear)', () => {
    const base = [mk('a', '2026-01-05'), mk('a', '2026-01-06'), mk('b', '2026-01-05')]
    const out = applyPlanAdjustment(base, { clear: [{ employee_id: 'a', date: '2026-01-06' }], add: [] })
    expect(out).toHaveLength(2)
    expect(out.find(s => s.employee_id === 'a' && s.date === '2026-01-06')).toBeUndefined()
  })

  it('ajoute de nouveaux créneaux (add)', () => {
    const base = [mk('a', '2026-01-05')]
    const out = applyPlanAdjustment(base, { clear: [], add: [mk('b', '2026-01-07', '18:00', '23:00')] })
    expect(out).toHaveLength(2)
    expect(out.find(s => s.employee_id === 'b')?.start_time).toBe('18:00')
  })

  it('un ajout sur le même (employé, jour) remplace le créneau de base (pas de doublon)', () => {
    const base = [mk('a', '2026-01-05', '09:00', '17:00')]
    const out = applyPlanAdjustment(base, { clear: [], add: [mk('a', '2026-01-05', '11:00', '19:00')] })
    expect(out).toHaveLength(1)
    expect(out[0].start_time).toBe('11:00')
  })

  it('diff vide → renvoie la base inchangée', () => {
    const base = [mk('a', '2026-01-05'), mk('b', '2026-01-06')]
    expect(applyPlanAdjustment(base, { clear: [], add: [] })).toHaveLength(2)
  })
})
