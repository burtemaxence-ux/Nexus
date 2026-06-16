import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import {
  REFERRAL_ACTIVATION_DAYS,
  REFERRAL_DISCOUNT_PER_ACTIVE,
  applyReferralDiscount,
} from '@/lib/referral'

// Vercel Cron : tous les jours à 02h00 UTC → "0 2 * * *"
// Active les filleuls payants depuis > 30 jours et met à jour la remise parrain.

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - REFERRAL_ACTIVATION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: pending, error } = await supabaseAdmin
    .from('referrals')
    .select('id, referrer_id, referred_id, created_at')
    .eq('status', 'pending')
    .not('referred_id', 'is', null)
    .lte('created_at', cutoff)

  if (error) {
    console.error('[cron/referral-activation] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let activated = 0
  let expired = 0
  const affectedReferrers = new Set<string>()

  for (const ref of pending ?? []) {
    // Filleul subscription status (subscriptions row is keyed by establishment
    // but carries the user_id of the subscriber).
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('user_id', ref.referred_id)
      .maybeSingle()

    const status = sub?.status
    const isPaying = status === 'active' || status === 'past_due'
    const isLost = !status || status === 'canceled' || status === 'unpaid' || status === 'free'

    if (isPaying) {
      await supabaseAdmin
        .from('referrals')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          discount_pct: REFERRAL_DISCOUNT_PER_ACTIVE,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ref.id)
      affectedReferrers.add(ref.referrer_id)
      activated++
    } else if (isLost) {
      await supabaseAdmin
        .from('referrals')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', ref.id)
      expired++
    }
    // status === 'trialing' → still in trial, leave pending for a later run.
  }

  // Refresh each affected parrain's Stripe discount once.
  for (const referrerId of Array.from(affectedReferrers)) {
    await applyReferralDiscount(referrerId)
  }

  return NextResponse.json({ activated, expired, checked: (pending ?? []).length })
}
