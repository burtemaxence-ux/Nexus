import type { SubscriptionRow } from '@/lib/subscription'

export type PlanTier = 'free' | 'essential' | 'pro' | 'multisite'

export function getPlanTier(sub: SubscriptionRow | null): PlanTier {
  if (!sub || (sub.status !== 'active' && sub.status !== 'trialing')) return 'free'
  if (sub.plan === 'multisite') return 'multisite'
  if (sub.plan === 'pro')       return 'pro'
  if (sub.plan === 'essential') return 'essential'
  return 'free'
}

export const PLAN_EMPLOYEE_LIMITS: Record<PlanTier, number> = {
  free:      3,
  essential: 10,
  pro:       25,
  multisite: Infinity,
}

export function isPro(tier: PlanTier): boolean {
  return tier === 'pro' || tier === 'multisite'
}
