import { describe, it, expect } from 'vitest'
import { getPlanTier, PLAN_EMPLOYEE_LIMITS, isPro } from './plan-guard'
import type { SubscriptionRow } from './subscription'

// ── Helper ────────────────────────────────────────────────────────────────────
function sub(plan: string, status: string): SubscriptionRow {
  return {
    id: 'sub-1',
    plan,
    status,
    stripe_customer_id: 'cus_1',
    stripe_subscription_id: 'sub_1',
    current_period_end: null,
    cancel_at_period_end: false,
    trial_end: null,
  }
}

describe('getPlanTier', () => {
  it('renvoie free quand il n\'y a pas d\'abonnement', () => {
    expect(getPlanTier(null)).toBe('free')
  })

  it('mappe les plans actifs sur leur palier', () => {
    expect(getPlanTier(sub('essential', 'active'))).toBe('essential')
    expect(getPlanTier(sub('pro', 'active'))).toBe('pro')
    expect(getPlanTier(sub('multisite', 'active'))).toBe('multisite')
  })

  it('traite trialing comme un abonnement actif', () => {
    expect(getPlanTier(sub('pro', 'trialing'))).toBe('pro')
  })

  it('conserve le palier pendant past_due (période de grâce / dunning)', () => {
    // Un paiement de renouvellement échoué ne doit pas couper l'accès
    // immédiatement : Stripe relance pendant past_due.
    expect(getPlanTier(sub('pro', 'past_due'))).toBe('pro')
    expect(getPlanTier(sub('multisite', 'past_due'))).toBe('multisite')
  })

  it('rétrograde en free aux statuts terminaux/non payés', () => {
    expect(getPlanTier(sub('pro', 'canceled'))).toBe('free')
    expect(getPlanTier(sub('multisite', 'unpaid'))).toBe('free')
    expect(getPlanTier(sub('pro', 'incomplete'))).toBe('free')
    expect(getPlanTier(sub('pro', 'incomplete_expired'))).toBe('free')
    expect(getPlanTier(sub('pro', 'paused'))).toBe('free')
  })

  it('renvoie free pour un plan inconnu même actif', () => {
    expect(getPlanTier(sub('enterprise', 'active'))).toBe('free')
    expect(getPlanTier(sub('free', 'active'))).toBe('free')
  })
})

describe('PLAN_EMPLOYEE_LIMITS', () => {
  it('définit les bonnes limites par palier', () => {
    expect(PLAN_EMPLOYEE_LIMITS.free).toBe(3)
    expect(PLAN_EMPLOYEE_LIMITS.essential).toBe(10)
    expect(PLAN_EMPLOYEE_LIMITS.pro).toBe(25)
    expect(PLAN_EMPLOYEE_LIMITS.multisite).toBe(Infinity)
  })

  it('seul multisite est illimité (les autres sont finis)', () => {
    expect(isFinite(PLAN_EMPLOYEE_LIMITS.free)).toBe(true)
    expect(isFinite(PLAN_EMPLOYEE_LIMITS.essential)).toBe(true)
    expect(isFinite(PLAN_EMPLOYEE_LIMITS.pro)).toBe(true)
    expect(isFinite(PLAN_EMPLOYEE_LIMITS.multisite)).toBe(false)
  })
})

describe('isPro', () => {
  it('considère pro et multisite comme premium', () => {
    expect(isPro('pro')).toBe(true)
    expect(isPro('multisite')).toBe(true)
  })

  it('exclut free et essential des fonctionnalités premium', () => {
    expect(isPro('free')).toBe(false)
    expect(isPro('essential')).toBe(false)
  })
})
