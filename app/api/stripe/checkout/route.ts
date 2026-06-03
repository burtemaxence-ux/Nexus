import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { getStripe, PLANS, type PlanKey } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { user, profile } = await requireManager(supabase)

    const body = await request.json()
    const { planKey } = body as { planKey: PlanKey }

    if (!planKey || !PLANS[planKey]) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    const plan = PLANS[planKey]
    if (!plan.priceId) {
      return NextResponse.json({ error: 'Prix non configuré' }, { status: 500 })
    }

    const stripe = getStripe()
    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${appUrl}/manager/settings/billing?success=1`,
      cancel_url: `${appUrl}/manager/settings/billing?canceled=1`,
      metadata: { establishment_id: estId, user_id: user.id },
      subscription_data: {
        metadata: { establishment_id: estId, user_id: user.id },
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
