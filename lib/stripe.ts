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

function validatePriceId(name: string, value: string | undefined): string {
  if (!value) {
    console.warn(`[Stripe] ${name} not configured — checkout will fail for this plan`)
  }
  return value ?? ''
}

export const STRIPE_PRICES = {
  essential_monthly: validatePriceId('STRIPE_PRICE_ESSENTIAL_MONTHLY', process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY),
  essential_yearly:  validatePriceId('STRIPE_PRICE_ESSENTIAL_YEARLY',  process.env.STRIPE_PRICE_ESSENTIAL_YEARLY),
  pro_monthly:       validatePriceId('STRIPE_PRICE_PRO_MONTHLY',       process.env.STRIPE_PRICE_PRO_MONTHLY),
  pro_yearly:        validatePriceId('STRIPE_PRICE_PRO_YEARLY',        process.env.STRIPE_PRICE_PRO_YEARLY),
  multisite_monthly: validatePriceId('STRIPE_PRICE_MULTISITE_MONTHLY', process.env.STRIPE_PRICE_MULTISITE_MONTHLY),
  multisite_yearly:  validatePriceId('STRIPE_PRICE_MULTISITE_YEARLY',  process.env.STRIPE_PRICE_MULTISITE_YEARLY),
}

export type BillingInterval = 'monthly' | 'yearly'
export type PlanId = 'essential' | 'pro' | 'multisite'

export const PLAN_META: Record<PlanId, { label: string; monthly: number; yearly: number }> = {
  essential: { label: 'Essentiel', monthly: 49,  yearly: 490  },
  pro:       { label: 'Pro',       monthly: 89,  yearly: 890  },
  multisite: { label: 'Multi-site', monthly: 149, yearly: 1490 },
}

/**
 * Mappe un price ID Stripe vers le plan interne. Les valeurs renvoyées
 * ('essential' | 'pro' | 'multisite' | 'free') doivent rester alignées avec la
 * contrainte CHECK de la table subscriptions (voir migration 044).
 *
 * Le garde `!priceId` évite qu'un price ID vide ne matche un prix non configuré
 * (STRIPE_PRICES.* vaut '' quand la variable d'env est absente).
 */
export function resolvePlan(
  priceId: string,
  prices: typeof STRIPE_PRICES = STRIPE_PRICES
): PlanId | 'free' {
  if (!priceId) return 'free'
  if (priceId === prices.essential_monthly || priceId === prices.essential_yearly) return 'essential'
  if (priceId === prices.pro_monthly       || priceId === prices.pro_yearly)       return 'pro'
  if (priceId === prices.multisite_monthly || priceId === prices.multisite_yearly) return 'multisite'
  return 'free'
}
