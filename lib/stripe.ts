import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-05-27.dahlia',
    })
  }
  return _stripe
}

export const STRIPE_PRICES = {
  essential_monthly: process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY ?? '',
  essential_yearly:  process.env.STRIPE_PRICE_ESSENTIAL_YEARLY ?? '',
  pro_monthly:       process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
  pro_yearly:        process.env.STRIPE_PRICE_PRO_YEARLY ?? '',
  multisite_monthly: process.env.STRIPE_PRICE_MULTISITE_MONTHLY ?? '',
  multisite_yearly:  process.env.STRIPE_PRICE_MULTISITE_YEARLY ?? '',
} as const

export type BillingInterval = 'monthly' | 'yearly'
export type PlanId = 'essential' | 'pro' | 'multisite'

export const PLAN_META: Record<PlanId, { label: string; monthly: number; yearly: number }> = {
  essential: { label: 'Essentiel', monthly: 49,  yearly: 490  },
  pro:       { label: 'Pro',       monthly: 89,  yearly: 890  },
  multisite: { label: 'Multi-site', monthly: 149, yearly: 1490 },
}
