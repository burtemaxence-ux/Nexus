import { supabaseAdmin } from '@/lib/supabase/admin'
import { getStripe, resolvePlan } from '@/lib/stripe'
import { notifyOps } from '@/lib/ops-alert'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { NextRequest, NextResponse } from 'next/server'

// Vercel Cron : tous les lundis à 05h00 UTC → "0 5 * * 1"
//
// Filet de sécurité du correctif B3. Depuis 093, `subscriptions` ne s'écrit
// plus que par le webhook Stripe : Stripe est la source de vérité, la table
// n'en est qu'un cache. Un webhook perdu, rejoué dans le désordre ou tombé en
// erreur laisse donc un écart silencieux — un client facturé qui perd son
// accès, ou l'inverse. Ce cron compare les deux et alerte ; il ne corrige rien
// de lui-même, une divergence méritant d'être regardée avant d'être écrasée.

type Divergence = { establishment_id: string; champ: string; base: string; stripe: string }

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: subs, error } = await supabaseAdmin
    .from('subscriptions')
    .select('establishment_id, plan, status, stripe_subscription_id, current_period_end')
    .not('stripe_subscription_id', 'is', null)

  if (error) {
    console.error('[cron/stripe-reconcile] Erreur query:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  const stripe = getStripe()
  const divergences: Divergence[] = []
  let verifies = 0

  for (const sub of subs ?? []) {
    try {
      const remote = await stripe.subscriptions.retrieve(sub.stripe_subscription_id as string)
      verifies++

      const planStripe = resolvePlan(remote.items.data[0]?.price?.id ?? '')
      if (planStripe !== sub.plan) {
        divergences.push({
          establishment_id: sub.establishment_id,
          champ: 'plan',
          base: String(sub.plan),
          stripe: planStripe,
        })
      }

      if (remote.status !== sub.status) {
        divergences.push({
          establishment_id: sub.establishment_id,
          champ: 'status',
          base: String(sub.status),
          stripe: remote.status,
        })
      }
    } catch (e) {
      // Un abonnement absent de Stripe est en soi une divergence : la ligne
      // locale accorde un accès que plus rien ne facture.
      divergences.push({
        establishment_id: sub.establishment_id,
        champ: 'stripe_subscription_id',
        base: String(sub.stripe_subscription_id),
        stripe: `introuvable (${e instanceof Error ? e.message : 'erreur'})`,
      })
    }
  }

  if (divergences.length > 0) {
    await notifyOps({
      subject: `Réconciliation Stripe : ${divergences.length} divergence(s)`,
      body: [
        `${verifies}/${subs?.length ?? 0} abonnements vérifiés.`,
        '',
        ...divergences.map(
          d => `• ${d.establishment_id} — ${d.champ} : base="${d.base}" vs Stripe="${d.stripe}"`
        ),
        '',
        'Stripe fait foi. Vérifier le webhook avant de corriger la base à la main.',
      ].join('\n'),
    })
  }

  return NextResponse.json({ verifies, divergences: divergences.length })
}
