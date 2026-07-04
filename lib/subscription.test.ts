import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isEntitledStatus, remainingTrialDays, TRIAL_DAYS, getSubscription } from './subscription'

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

// ── getSubscription — résolution Multi-site au niveau propriétaire ─────────────
// Mock Supabase minimal : `own` = abonnement propre de l'établissement,
// `multi` = résultat du RPC owner_multisite_subscription (tableau).
function makeSupabase(
  own: Record<string, unknown> | null,
  multi: Record<string, unknown>[],
  onRpc?: () => void,
): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: own }) }),
      }),
    }),
    rpc: async () => { onRpc?.(); return { data: multi } },
  } as unknown as SupabaseClient
}

const MULTI = {
  plan: 'multisite', status: 'active', trial_end: null,
  current_period_end: null, cancel_at_period_end: false,
  stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1',
}

describe('getSubscription — Multi-site', () => {
  it('renvoie l\'abonnement propre s\'il est actif, sans appeler le RPC', async () => {
    let rpcCalled = false
    const supa = makeSupabase({ id: 's1', plan: 'pro', status: 'active' }, [], () => { rpcCalled = true })
    const sub = await getSubscription(supa, 'est-A')
    expect(sub?.plan).toBe('pro')
    expect(rpcCalled).toBe(false)
  })

  it('hérite du Multi-site du propriétaire quand l\'établissement n\'a pas d\'abonnement', async () => {
    const sub = await getSubscription(makeSupabase(null, [MULTI]), 'est-B')
    expect(sub?.plan).toBe('multisite')
    expect(sub?.status).toBe('active')
  })

  it('hérite du Multi-site même si l\'abonnement propre est non entitlé (canceled)', async () => {
    const sub = await getSubscription(makeSupabase({ id: 's2', plan: 'essential', status: 'canceled' }, [MULTI]), 'est-C')
    expect(sub?.plan).toBe('multisite')
  })

  it('garde l\'abonnement propre non entitlé si le propriétaire n\'a pas de Multi-site', async () => {
    const sub = await getSubscription(makeSupabase({ id: 's3', plan: 'essential', status: 'canceled' }, []), 'est-D')
    expect(sub?.status).toBe('canceled')
    expect(sub?.plan).toBe('essential')
  })

  it('renvoie null quand il n\'y a ni abonnement ni Multi-site', async () => {
    const sub = await getSubscription(makeSupabase(null, []), 'est-E')
    expect(sub).toBeNull()
  })
})
