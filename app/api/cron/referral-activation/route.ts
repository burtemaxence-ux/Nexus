import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import {
  REFERRAL_ACTIVATION_DAYS,
  REFERRAL_DISCOUNT_PER_ACTIVE,
  applyReferralDiscount,
  referralOutcome,
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
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  let activated = 0
  let expired = 0
  const affectedReferrers = new Set<string>()

  for (const ref of pending ?? []) {
    // A filleul may own several establishments (several subscription rows keyed
    // by establishment but carrying their user_id), so look at all their
    // statuses, not a single row.
    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('user_id', ref.referred_id)

    const outcome = referralOutcome((subs ?? []).map(s => s.status as string))

    if (outcome === 'activate') {
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
    } else if (outcome === 'expire') {
      await supabaseAdmin
        .from('referrals')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', ref.id)
      expired++
    }
    // outcome === 'wait' (e.g. still trialing) → leave pending for a later run.
  }

  // Refresh each affected parrain's Stripe discount once.
  for (const referrerId of Array.from(affectedReferrers)) {
    await applyReferralDiscount(referrerId)
  }

  return NextResponse.json({ activated, expired, checked: (pending ?? []).length })
}
