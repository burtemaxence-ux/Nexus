import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { getStripe, STRIPE_PRICES, type BillingInterval, type PlanId } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { user, profile } = await requireManager(supabase)

    const body = await request.json()
    const { planId, interval } = body as { planId: PlanId; interval: BillingInterval }

    const priceKey = `${planId}_${interval}` as keyof typeof STRIPE_PRICES
    const priceId = STRIPE_PRICES[priceKey]

    if (!priceId) {
      return NextResponse.json({ error: 'Plan ou intervalle invalide' }, { status: 400 })
    }

    const stripe = getStripe()
    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
    const appUrl = process.env.NEXT_PUBLIC_URL ?? ''

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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/manager/settings/billing?success=1`,
      cancel_url: `${appUrl}/manager/settings/billing?canceled=1`,
      metadata: { establishment_id: estId, user_id: user.id },
      subscription_data: {
        metadata: { establishment_id: estId, user_id: user.id },
        ...(isFirstSubscription ? { trial_period_days: 14 } : {}),
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    console.error('[stripe/checkout]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
