import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)

    const { returnUrl } = await request.json().catch(() => ({}))
    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
    const appUrl = process.env.NEXT_PUBLIC_URL ?? ''

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('establishment_id', estId)
      .maybeSingle()

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'Aucun abonnement actif' }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: returnUrl ?? `${appUrl}/manager/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    console.error('[stripe/portal]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
