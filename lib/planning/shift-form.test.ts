import { describe, it, expect } from 'vitest'
import type { Shift } from '@/types'
import {
  calcDurationMinutes,
  computeDurationWarnings,
  computeComplianceViolations,
  breakOptions,
  parseRules,
  DEFAULT_RULES,
} from './shift-form'

const shift = (over: Partial<Shift>): Shift => ({
  id: 'x', employee_id: 'e1', date: '2026-06-15',
  start_time: '09:00', end_time: '17:00', break_minutes: 0,
  position: null, poste_id: null, notes: null,
} as unknown as Shift)

describe('calcDurationMinutes', () => {
  it('computes a same-day duration', () => {
    expect(calcDurationMinutes('09:00', '17:00')).toBe(480)
  })
  it('handles overnight shifts (end <= start)', () => {
    expect(calcDurationMinutes('22:00', '06:00')).toBe(480)
  })
})

describe('computeDurationWarnings', () => {
  it('flags a shift shorter than the configured minimum (net of break)', () => {
    const w = computeDurationWarnings('09:00', '09:20', 0, DEFAULT_RULES)
    expect(w).toHaveLength(1)
    expect(w[0]).toContain('trop court')
  })
  it('flags a shift longer than the configured maximum', () => {
    const w = computeDurationWarnings('08:00', '19:00', 0, DEFAULT_RULES) // 11h > 10h max
    expect(w.some(x => x.includes('trop long'))).toBe(true)
  })
  it('subtracts the break from the net duration', () => {
    // 10h30 gross - 60 break = 9h30 net → under the 10h max, no warning
    expect(computeDurationWarnings('08:00', '18:30', 60, DEFAULT_RULES)).toHaveLength(0)
  })
})

describe('breakOptions', () => {
  it('returns the presets unchanged for a known value', () => {
    expect(breakOptions('30')).toHaveLength(6)
  })
  it('injects a custom value not in the presets, sorted', () => {
    const opts = breakOptions('25')
    expect(opts.some(o => o.value === '25')).toBe(true)
    const values = opts.map(o => Number(o.value))
    expect(values).toEqual([...values].sort((a, b) => a - b))
  })
})

describe('computeComplianceViolations', () => {
  it('flags an insufficient break (<20 min) on a shift over 6h', () => {
    const v = computeComplianceViolations('09:00', '17:00', 15, 'e1', new Date('2026-06-15T00:00:00'), [])
    expect(v.some(x => x.ruleId === 'break_missing')).toBe(true)
  })
  it('does not flag a 7h shift with a 20 min break', () => {
    const v = computeComplianceViolations('09:00', '16:00', 20, 'e1', new Date('2026-06-15T00:00:00'), [])
    expect(v.some(x => x.ruleId === 'break_missing')).toBe(false)
  })
  it('only returns NEW violations introduced by the proposed shift', () => {
    // A pre-existing same-day shift already over 10h net would be in the baseline.
    const existing = [shift({ id: 's1', start_time: '08:00', end_time: '19:00', break_minutes: 0 })] // 11h
    const v = computeComplianceViolations('20:00', '21:00', 0, 'e1', new Date('2026-06-15T00:00:00'), existing)
    // The pre-existing daily-max violation must not be re-reported as "new".
    expect(v.some(x => x.ruleId === 'hours_daily_max')).toBe(false)
  })
  it('excludes the edited shift itself via excludeShiftId', () => {
    const existing = [shift({ id: 's1', start_time: '09:00', end_time: '17:00', break_minutes: 0 })]
    const v = computeComplianceViolations('09:00', '17:00', 30, 'e1', new Date('2026-06-15T00:00:00'), existing, 's1')
    // Editing s1 to add a 30 min break should not double-count it as a second shift.
    expect(v.some(x => x.ruleId === 'break_missing')).toBe(false)
  })
  it('surface les règles mineurs dès la saisie quand la métadonnée est fournie', () => {
    // 08:00–17:00 = 9h net → > 8h pour un apprenti mineur.
    const minor = { id: 'e1', birthDate: '2010-01-01' } // ~16 ans en 2026
    const v = computeComplianceViolations('08:00', '17:00', 0, 'e1', new Date('2026-06-15T00:00:00'), [], undefined, minor)
    expect(v.some(x => x.ruleId === 'minor_hours_daily')).toBe(true)
  })
  it('ne surface pas les règles mineurs sans métadonnée (rétrocompat)', () => {
    const v = computeComplianceViolations('08:00', '17:00', 0, 'e1', new Date('2026-06-15T00:00:00'), [])
    expect(v.some(x => x.ruleId === 'minor_hours_daily')).toBe(false)
  })
})

describe('parseRules', () => {
  it('falls back to defaults on empty settings', () => {
    expect(parseRules({})).toEqual(DEFAULT_RULES)
  })
  it('reads configured min/max shift duration', () => {
    expect(parseRules({ min_shift_duration: '60', max_shift_duration: '480' }))
      .toEqual({ minShiftMinutes: 60, maxShiftMinutes: 480 })
  })
})
