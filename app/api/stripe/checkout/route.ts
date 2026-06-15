import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { TRIAL_DAYS } from '@/lib/subscription'
import { getPendingFirstMonth, firstMonthCouponId } from '@/lib/referral'

const CheckoutSchema = z.object({
  planId: z.enum(['essential', 'pro', 'multisite']),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { user, profile } = await requireManager(supabase)

    const raw = await request.json()
    const parsed = CheckoutSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { planId, interval } = parsed.data

    const priceKey = `${planId}_${interval}`
    if (!(priceKey in STRIPE_PRICES)) {
      return NextResponse.json({ error: 'Plan ou intervalle invalide' }, { status: 400 })
    }

    const priceId = STRIPE_PRICES[priceKey as keyof typeof STRIPE_PRICES]
    if (!priceId) {
      return NextResponse.json(
        { error: 'Plan de paiement non configuré. Contactez le support.' },
        { status: 503 }
      )
    }

    const stripe = getStripe()
    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
    const appUrl = process.env.NEXT_PUBLIC_URL ?? 'https://quartzbase.fr'

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('establishment_id', estId)
      .maybeSingle()

    let customerId = sub?.stripe_customer_id

    if (!customerId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const customer = await stripe.customers.create({
        email: user.email,
        name: profileData?.full_name ?? undefined,
        metadata: { user_id: user.id, establishment_id: estId },
      })
      customerId = customer.id
    }

    const isFirstSubscription = !sub?.stripe_subscription_id

    // Filleul reward: first month free (100%-off-once coupon) for a referred
    // user who hasn't been granted it yet. Stripe forbids combining `discounts`
    // with `allow_promotion_codes`, so we apply one or the other.
    const firstMonth = isFirstSubscription ? await getPendingFirstMonth(user.id) : null
    const referralDiscount = firstMonth ? [{ coupon: await firstMonthCouponId(stripe) }] : null

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/manager/settings/billing?success=1`,
      cancel_url: `${appUrl}/manager/settings/billing?canceled=1`,
      metadata: { establishment_id: estId, user_id: user.id },
      subscription_data: {
        metadata: { establishment_id: estId, user_id: user.id },
        ...(isFirstSubscription ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      ...(referralDiscount ? { discounts: referralDiscount } : { allow_promotion_codes: true }),
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    console.error('[stripe/checkout]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
