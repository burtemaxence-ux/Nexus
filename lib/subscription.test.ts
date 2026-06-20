import { describe, it, expect } from 'vitest'
import { isEntitledStatus, remainingTrialDays, TRIAL_DAYS } from './subscription'

const DAY = 24 * 60 * 60 * 1000

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

describe('remainingTrialDays', () => {
  const created = new Date('2026-01-01T00:00:00Z')

  it('donne la fenêtre complète quand on s\'abonne le jour de l\'inscription', () => {
    expect(remainingTrialDays(created, created)).toBe(TRIAL_DAYS)
  })

  it('ne donne que les jours restants quand on s\'abonne en cours d\'essai', () => {
    const day5 = new Date(created.getTime() + 5 * DAY)
    expect(remainingTrialDays(created, day5)).toBe(TRIAL_DAYS - 5)
  })

  it('renvoie 0 une fois la fenêtre d\'inscription écoulée (pas de cumul, pas de re-essai)', () => {
    const after = new Date(created.getTime() + (TRIAL_DAYS + 1) * DAY)
    expect(remainingTrialDays(created, after)).toBe(0)
    // Même un compte bien plus vieux qui se ré-abonne : 0.
    const wayAfter = new Date(created.getTime() + 365 * DAY)
    expect(remainingTrialDays(created, wayAfter)).toBe(0)
  })

  it('renvoie 0 pile à l\'expiration', () => {
    const atEnd = new Date(created.getTime() + TRIAL_DAYS * DAY)
    expect(remainingTrialDays(created, atEnd)).toBe(0)
  })

  it('accepte une date ISO en entrée', () => {
    const day10 = new Date(created.getTime() + 10 * DAY)
    expect(remainingTrialDays('2026-01-01T00:00:00Z', day10)).toBe(TRIAL_DAYS - 10)
  })
})
