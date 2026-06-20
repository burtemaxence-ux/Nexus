import { describe, it, expect } from 'vitest'
import {
  referralDiscountPct,
  generateReferralCode,
  referralOutcome,
  REFERRAL_MAX_DISCOUNT,
  REFERRAL_MAX_ACTIVE,
  REFERRAL_DISCOUNT_PER_ACTIVE,
} from './referral'

describe('referralOutcome (multi-établissement)', () => {
  it('active dès qu\'un abonnement paie (active ou past_due)', () => {
    expect(referralOutcome(['active'])).toBe('activate')
    expect(referralOutcome(['past_due'])).toBe('activate')
    // plusieurs établissements : un seul payant suffit
    expect(referralOutcome(['canceled', 'active'])).toBe('activate')
    expect(referralOutcome(['trialing', 'past_due'])).toBe('activate')
  })

  it('expire si aucun abonnement ou tous terminaux', () => {
    expect(referralOutcome([])).toBe('expire')
    expect(referralOutcome(['canceled'])).toBe('expire')
    expect(referralOutcome(['unpaid', 'free', 'canceled'])).toBe('expire')
  })

  it('attend si encore en essai (et aucun payant)', () => {
    expect(referralOutcome(['trialing'])).toBe('wait')
    expect(referralOutcome(['trialing', 'canceled'])).toBe('wait')
  })
})

describe('referralDiscountPct', () => {
  it('is 0 with no active filleul', () => {
    expect(referralDiscountPct(0)).toBe(0)
  })

  it('grants 15% per active filleul', () => {
    expect(referralDiscountPct(1)).toBe(REFERRAL_DISCOUNT_PER_ACTIVE)
    expect(referralDiscountPct(2)).toBe(REFERRAL_DISCOUNT_PER_ACTIVE * 2)
  })

  it('caps at the maximum discount (×2 = 30%)', () => {
    expect(referralDiscountPct(3)).toBe(REFERRAL_MAX_DISCOUNT)
    expect(referralDiscountPct(10)).toBe(REFERRAL_MAX_DISCOUNT)
    expect(REFERRAL_MAX_DISCOUNT).toBe(REFERRAL_DISCOUNT_PER_ACTIVE * REFERRAL_MAX_ACTIVE)
  })
})

describe('generateReferralCode', () => {
  it('builds a stable QTZ- code from the user id', () => {
    const code = generateReferralCode('550e8400-e29b-41d4-a716-446655440000')
    expect(code).toBe('QTZ-550E84')
  })

  it('is deterministic', () => {
    const id = 'abcdef12-3456-7890-abcd-ef1234567890'
    expect(generateReferralCode(id)).toBe(generateReferralCode(id))
  })
})
