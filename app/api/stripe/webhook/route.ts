export const runtime = 'nodejs'

import type Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'

function resolvePlan(priceId: string): string {
  if (priceId === STRIPE_PRICES.essential_monthly || priceId === STRIPE_PRICES.essential_yearly) return 'essential'
  if (priceId === STRIPE_PRICES.pro_monthly || priceId === STRIPE_PRICES.pro_yearly) return 'pro'
  if (priceId === STRIPE_PRICES.multisite_monthly || priceId === STRIPE_PRICES.multisite_yearly) return 'multisite'
  return 'free'
}
import { supabaseAdmin } from '@/lib/supabase/admin'
import { markFirstMonthGranted, churnReferral, applyReferralDiscount } from '@/lib/referral'

const RELEVANT_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
])

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') return NextResponse.json({ received: true })

      const establishmentId = session.metadata?.establishment_id
      const userId = session.metadata?.user_id
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      if (!establishmentId || !subscriptionId) {
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
      }

      const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items'] })
      const periodEnd = sub.items.data[0]?.current_period_end
      const plan = resolvePlan(sub.items.data[0]?.price.id ?? '')

      await supabaseAdmin.from('subscriptions').upsert({
        establishment_id: establishmentId,
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan,
        status: sub.status,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: sub.cancel_at_period_end,
        trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'establishment_id' })

      // Filleul reward: confirm the "first month free" grant once checkout
      // succeeds. Also (re)apply the parrain's discount if this user is one.
      if (userId) {
        await markFirstMonthGranted(userId)
        await applyReferralDiscount(userId)
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const establishmentId = sub.metadata?.establishment_id
      if (!establishmentId) return NextResponse.json({ received: true })

      const periodEnd = sub.items.data[0]?.current_period_end
      const plan = event.type === 'customer.subscription.deleted'
        ? 'free'
        : resolvePlan(sub.items.data[0]?.price.id ?? '')

      await supabaseAdmin.from('subscriptions').upsert({
        establishment_id: establishmentId,
        // Sur résiliation, on efface l'ID d'abonnement Stripe (il n'existe plus) :
        // évite que applyReferralDiscount tente d'écrire sur un abonnement mort
        // (cas du churn d'un parrain) et permet une réactivation propre.
        stripe_subscription_id: event.type === 'customer.subscription.deleted' ? null : sub.id,
        stripe_customer_id: sub.customer as string,
        status: sub.status,
        plan,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: sub.cancel_at_period_end,
        trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'establishment_id' })

      // Referral churn sync: when a filleul's subscription ends, drop their
      // referral to 'churned' and refresh the parrain's discount.
      const referredUserId = sub.metadata?.user_id
      const churned = event.type === 'customer.subscription.deleted'
        || sub.status === 'canceled' || sub.status === 'unpaid'
      if (referredUserId && churned) {
        await churnReferral(referredUserId)
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', customerId)
    }
  } catch (err) {
    console.error('[webhook] processing error:', err)
    return NextResponse.json({ error: 'Processing error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
