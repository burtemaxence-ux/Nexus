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

export const PLANS = {
  pro_monthly: {
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
    label: 'Pro Mensuel',
    price: 49,
    interval: 'month' as const,
  },
  pro_yearly: {
    priceId: process.env.STRIPE_PRICE_PRO_YEARLY ?? '',
    label: 'Pro Annuel',
    price: 490,
    interval: 'year' as const,
  },
} as const

export type PlanKey = keyof typeof PLANS
