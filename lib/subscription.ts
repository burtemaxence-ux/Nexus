import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Free trial length, in days. Single source of truth shared by the Stripe
 * checkout (`trial_period_days`) and the pre-subscription paywall window.
 */
export const TRIAL_DAYS = 30

export type SubscriptionRow = {
  id: string
  plan: string
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_end: string | null
}

export async function getSubscription(
  supabase: SupabaseClient,
  establishmentId: string
): Promise<SubscriptionRow | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, trial_end')
    .eq('establishment_id', establishmentId)
    .maybeSingle()
  return data as SubscriptionRow | null
}

/**
 * Subscription statuses that grant access to paid features. `past_due` is
 * included so a single failed renewal doesn't immediately lock out a paying
 * customer: Stripe runs dunning retries while past_due and only moves the
 * subscription to `canceled`/`unpaid` once they are exhausted — that is when
 * access is cut.
 */
export function isEntitledStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due'
}

export function isActiveSubscription(sub: SubscriptionRow | null): boolean {
  return isEntitledStatus(sub?.status)
}
