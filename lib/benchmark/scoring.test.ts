import { describe, it, expect } from 'vitest'
import { computeAbsoluteScores, computePercentiles, scoreCohort } from './scoring'
import type { EstablishmentMetrics } from './types'

function metrics(over: Partial<EstablishmentMetrics> = {}): EstablishmentMetrics {
  return {
    establishment_id: 'est-1',
    headcount: 10,
    active_alerts: 0,
    critical_alerts: 0,
    warning_alerts: 0,
    unjustified_lateness_30d: 0,
    shifts_30d: 0,
    published_shifts_30d: 0,
    open_marketplace_slots: 0,
    filled_marketplace_slots_30d: 0,
    pending_leaves: 0,
    ...over,
  }
}

describe('computeAbsoluteScores', () => {
  it('établissement parfait → 100 partout', () => {
    const s = computeAbsoluteScores(metrics({ shifts_30d: 20, published_shifts_30d: 20 }))
    expect(s.compliance).toBe(100)
    expect(s.planning).toBe(100)
    expect(s.global).toBe(100)
  })

  it('alertes critiques font chuter la conformité', () => {
    const clean = computeAbsoluteScores(metrics())
    const bad = computeAbsoluteScores(metrics({ critical_alerts: 5 }))
    expect(bad.compliance).toBeLessThan(clean.compliance)
    // 60 * (5/10) = 30 de pénalité → 70
    expect(bad.compliance).toBe(70)
  })

  it('clampe la conformité à 0 (jamais négatif)', () => {
    const s = computeAbsoluteScores(metrics({ headcount: 1, critical_alerts: 50 }))
    expect(s.compliance).toBe(0)
  })

  it('shifts non publiés dégradent le planning', () => {
    const s = computeAbsoluteScores(metrics({ shifts_30d: 10, published_shifts_30d: 0 }))
    expect(s.planning).toBeLessThan(100)
  })

  it('trous marketplace ouverts dégradent le planning', () => {
    const s = computeAbsoluteScores(
      metrics({ open_marketplace_slots: 5, filled_marketplace_slots_30d: 0 }),
    )
    expect(s.planning).toBeLessThan(100)
  })

  it('robuste avec headcount = 0', () => {
    const s = computeAbsoluteScores(metrics({ headcount: 0, critical_alerts: 1 }))
    expect(Number.isFinite(s.compliance)).toBe(true)
    expect(Number.isFinite(s.global)).toBe(true)
  })
})

describe('computePercentiles', () => {
  it('le meilleur obtient le percentile le plus haut, le pire le plus bas', () => {
    const ranked = computePercentiles([
      { establishment_id: 'a', planning: 90, compliance: 90, global: 90 },
      { establishment_id: 'b', planning: 50, compliance: 50, global: 50 },
      { establishment_id: 'c', planning: 10, compliance: 10, global: 10 },
    ])
    const a = ranked.find((r) => r.establishment_id === 'a')!
    const c = ranked.find((r) => r.establishment_id === 'c')!
    expect(a.global_percentile).toBe(100)
    expect(c.global_percentile).toBe(0)
  })

  it('cohorte d’un seul établissement → percentile 100', () => {
    const ranked = computePercentiles([
      { establishment_id: 'solo', planning: 42, compliance: 42, global: 42 },
    ])
    expect(ranked[0].global_percentile).toBe(100)
  })
})

describe('scoreCohort', () => {
  it('préserve l’ordre et combine absolu + percentile', () => {
    const out = scoreCohort([
      metrics({ establishment_id: 'top', shifts_30d: 10, published_shifts_30d: 10 }),
      metrics({ establishment_id: 'low', critical_alerts: 8, shifts_30d: 10, published_shifts_30d: 2 }),
    ])
    expect(out.map((o) => o.establishment_id)).toEqual(['top', 'low'])
    expect(out[0].global).toBeGreaterThan(out[1].global)
    expect(out[0].global_percentile).toBeGreaterThan(out[1].global_percentile)
  })
})
