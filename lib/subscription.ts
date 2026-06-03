import type { SupabaseClient } from '@supabase/supabase-js'

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

export function isActiveSubscription(sub: SubscriptionRow | null): boolean {
  if (!sub) return false
  return sub.status === 'active' || sub.status === 'trialing'
}
