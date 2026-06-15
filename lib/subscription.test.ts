import { describe, it, expect } from 'vitest'
import { isEntitledStatus } from './subscription'

describe('isEntitledStatus', () => {
  it('accorde l\'accès pour active, trialing et past_due', () => {
    expect(isEntitledStatus('active')).toBe(true)
    expect(isEntitledStatus('trialing')).toBe(true)
    expect(isEntitledStatus('past_due')).toBe(true)
  })

  it('refuse l\'accès aux statuts terminaux/non payés et à l\'absence de statut', () => {
    expect(isEntitledStatus('canceled')).toBe(false)
    expect(isEntitledStatus('unpaid')).toBe(false)
    expect(isEntitledStatus('incomplete')).toBe(false)
    expect(isEntitledStatus('incomplete_expired')).toBe(false)
    expect(isEntitledStatus('paused')).toBe(false)
    expect(isEntitledStatus(null)).toBe(false)
    expect(isEntitledStatus(undefined)).toBe(false)
  })
})
