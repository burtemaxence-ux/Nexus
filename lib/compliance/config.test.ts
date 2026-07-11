import { describe, it, expect } from 'vitest'
import { buildComplianceConfig, complianceConfigFromRows } from './config'

describe('buildComplianceConfig', () => {
  it('désactive nuit + dimanche par défaut quand une convention est renseignée', () => {
    const c = buildComplianceConfig({ collective_agreement: 'IDCC 1786' })
    expect(c.night_work).toBe(false)
    expect(c.sunday_work).toBe(false)
    // Les deux autres restent actives par défaut.
    expect(c.part_time_split).toBe(true)
    expect(c.hours_avg_weekly).toBe(true)
  })

  it('active nuit + dimanche quand la convention est « Autre » ou absente', () => {
    expect(buildComplianceConfig({ collective_agreement: 'Autre' }).night_work).toBe(true)
    expect(buildComplianceConfig({}).night_work).toBe(true)
    expect(buildComplianceConfig({}).sunday_work).toBe(true)
  })

  it('l\'override explicite prime sur le défaut de la convention', () => {
    // CCN renseignée (défaut off) mais réactivation explicite.
    const c = buildComplianceConfig({ collective_agreement: 'IDCC 1786', alert_night_work: 'on' })
    expect(c.night_work).toBe(true)
    // CCN « Autre » (défaut on) mais désactivation explicite.
    const c2 = buildComplianceConfig({ collective_agreement: 'Autre', alert_sunday_work: 'off' })
    expect(c2.sunday_work).toBe(false)
  })

  it('permet de couper coupure temps partiel et moyenne 44h', () => {
    const c = buildComplianceConfig({ alert_part_time_split: 'off', alert_hours_avg_weekly: 'off' })
    expect(c.part_time_split).toBe(false)
    expect(c.hours_avg_weekly).toBe(false)
  })
})

describe('complianceConfigFromRows', () => {
  it('reconstruit la config depuis des lignes { key, value }', () => {
    const c = complianceConfigFromRows([
      { key: 'collective_agreement', value: 'IDCC 3061' },
      { key: 'alert_night_work', value: 'on' },
    ])
    expect(c.night_work).toBe(true)   // override
    expect(c.sunday_work).toBe(false) // défaut CCN
  })

  it('gère l\'absence de données (défauts prudents : tout actif)', () => {
    const c = complianceConfigFromRows(null)
    expect(c).toEqual({ night_work: true, sunday_work: true, part_time_split: true, hours_avg_weekly: true })
  })
})
