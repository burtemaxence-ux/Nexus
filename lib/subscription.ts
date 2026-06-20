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

/**
 * Whole days of free trial remaining, anchored to account creation
 * (`accountCreatedAt + TRIAL_DAYS`). Returns 0 once that window has elapsed.
 *
 * The trial is the signup window — nothing more. Used at checkout to set Stripe's
 * `trial_period_days` so it never *adds* a fresh 30 days on top of the
 * already-running pre-subscription window, and so cancelling then re-subscribing
 * (which clears the Stripe subscription id) can't mint a brand-new trial: an
 * older account simply gets 0.
 */
export function remainingTrialDays(
  accountCreatedAt: string | Date,
  now: Date = new Date()
): number {
  const end = new Date(accountCreatedAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  const ms = end - now.getTime()
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000))
}
