import { supabaseAdmin } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// ── Economics ───────────────────────────────────────────────────────────────
// -15% per active filleul, cumulable up to ×2 (max -30%). The previous -75%
// cap was financially unsustainable (a Pro client referring 5 paid less than
// the AI/compute it consumes).
export const REFERRAL_DISCOUNT_PER_ACTIVE = 15
export const REFERRAL_MAX_ACTIVE = 2
export const REFERRAL_MAX_DISCOUNT = REFERRAL_DISCOUNT_PER_ACTIVE * REFERRAL_MAX_ACTIVE
// A filleul must stay a paying customer this long before the parrain's
// discount activates (anti-abuse against instant sign-up/churn).
export const REFERRAL_ACTIVATION_DAYS = 30

export function generateReferralCode(userId: string): string {
  return 'QTZ-' + userId.replace(/-/g, '').slice(0, 6).toUpperCase()
}

export function referralDiscountPct(activeCount: number): number {
  return Math.min(activeCount, REFERRAL_MAX_ACTIVE) * REFERRAL_DISCOUNT_PER_ACTIVE
}

/**
 * Decide what to do with a referred user's pending referral, given ALL of their
 * subscription statuses. A user can own several establishments (several
 * subscription rows), so the whole set is considered rather than a single row:
 * - any paying sub (active/past_due) → 'activate'
 * - no sub at all, or every sub terminal (canceled/unpaid/free) → 'expire'
 * - otherwise (e.g. still trialing) → 'wait' (re-checked on a later cron run)
 */
export function referralOutcome(statuses: string[]): 'activate' | 'expire' | 'wait' {
  if (statuses.some(s => s === 'active' || s === 'past_due')) return 'activate'
  if (statuses.length === 0 || statuses.every(s => s === 'canceled' || s === 'unpaid' || s === 'free')) return 'expire'
  return 'wait'
}

export type ReferralRow = {
  id: string
  referred_id: string | null
  status: string
  activated_at: string | null
  discount_pct: number
  created_at: string
  flagged: boolean
}

export async function getReferralStats(
  supabase: SupabaseClient,
  userId: string
): Promise<{ active: number; pending: number; discount: number; filleuls: ReferralRow[] }> {
  const code = generateReferralCode(userId)

  // Ensure seed row exists for this referrer (idempotent)
  const { data: existing } = await supabaseAdmin
    .from('referrals')
    .select('id')
    .eq('referrer_id', userId)
    .is('referred_id', null)
    .maybeSingle()

  if (!existing) {
    await supabaseAdmin.from('referrals').insert({
      referrer_id: userId,
      referral_code: code,
      referred_id: null,
      status: 'pending',
    })
  }

  // Read actual referrals (rows with a referred_id) via RLS-safe client
  const { data } = await supabase
    .from('referrals')
    .select('id, referred_id, status, activated_at, discount_pct, created_at, flagged')
    .eq('referral_code', code)
    .not('referred_id', 'is', null)

  const filleuls = (data ?? []) as ReferralRow[]
  const active = filleuls.filter(r => r.status === 'active').length
  const pending = filleuls.filter(r => r.status === 'pending').length
  // La remise ne compte que les filleuls actifs non signalés (anti-abus).
  const activeForDiscount = filleuls.filter(r => r.status === 'active' && !r.flagged).length
  const discount = referralDiscountPct(activeForDiscount)

  return { active, pending, discount, filleuls }
}

export async function createReferralFromCode(
  referralCode: string,
  referredUserId: string
): Promise<void> {
  // Find the seed row for this code to get the referrer_id
  const { data: seed } = await supabaseAdmin
    .from('referrals')
    .select('referrer_id')
    .eq('referral_code', referralCode)
    .is('referred_id', null)
    .maybeSingle()

  if (!seed) return

  // Anti-abuse: a user cannot refer themselves.
  if (seed.referrer_id === referredUserId) return

  // Prevent duplicate referrals for the same user
  const { data: alreadyReferred } = await supabaseAdmin
    .from('referrals')
    .select('id')
    .eq('referred_id', referredUserId)
    .maybeSingle()

  if (alreadyReferred) return

  // Anti-abus : si ce parrain a créé beaucoup de filleuls très récemment
  // (> 3 sur 14 jours), on signale le nouveau filleul pour revue manuelle.
  // Un filleul signalé n'entre pas dans le calcul de remise (cf. applyReferralDiscount).
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { count: recentCount } = await supabaseAdmin
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', seed.referrer_id)
    .not('referred_id', 'is', null)
    .gte('created_at', since)
  const flagged = (recentCount ?? 0) >= 3

  await supabaseAdmin.from('referrals').insert({
    referrer_id: seed.referrer_id,
    referred_id: referredUserId,
    referral_code: referralCode,
    status: 'pending',
    flagged,
    flag_reason: flagged ? 'velocity:>3 filleuls en 14j' : null,
  })
}

// ── Filleul: first month free ─────────────────────────────────────────────────

/**
 * Returns the referral row for a referred user if they are eligible for the
 * "first month free" reward (referred and not yet granted), else null.
 */
export async function getPendingFirstMonth(referredUserId: string): Promise<{ id: string } | null> {
  const { data } = await supabaseAdmin
    .from('referrals')
    .select('id')
    .eq('referred_id', referredUserId)
    .eq('first_month_granted', false)
    .maybeSingle()
  return data ?? null
}

export async function markFirstMonthGranted(referredUserId: string): Promise<void> {
  await supabaseAdmin
    .from('referrals')
    .update({ first_month_granted: true, updated_at: new Date().toISOString() })
    .eq('referred_id', referredUserId)
    .eq('first_month_granted', false)
}

// ── Stripe coupons ─────────────────────────────────────────────────────────────

async function getOrCreateCoupon(stripe: Stripe, id: string, params: Stripe.CouponCreateParams): Promise<string> {
  try {
    await stripe.coupons.retrieve(id)
    return id
  } catch {
    const created = await stripe.coupons.create({ id, ...params })
    return created.id
  }
}

/** 100% off the first invoice — the filleul's first month free. */
export async function firstMonthCouponId(stripe: Stripe): Promise<string> {
  return getOrCreateCoupon(stripe, 'qz-referral-firstmonth', {
    percent_off: 100,
    duration: 'once',
    name: 'Parrainage — 1er mois offert',
  })
}

// ── Parrain: apply the cumulative recurring discount ────────────────────────────

/**
 * Recomputes the parrain's active-filleul discount and applies it to their
 * Stripe subscription as a single recurring coupon (Stripe does not stack
 * coupons, so we replace it with one of the right percentage). Removes the
 * discount when it drops to 0. Safe no-op if the parrain has no subscription
 * or Stripe is not configured.
 */
export async function applyReferralDiscount(referrerUserId: string): Promise<void> {
  try {
    // Count active filleuls for this referrer.
    const { count } = await supabaseAdmin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', referrerUserId)
      .eq('status', 'active')
      .eq('flagged', false)

    const pct = referralDiscountPct(count ?? 0)

    // A referrer may own several establishments (several subscription rows).
    // Pick their most current live subscription deterministically rather than
    // erroring on multiple rows, and apply the single referral discount there.
    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', referrerUserId)
      .not('stripe_subscription_id', 'is', null)
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .limit(1)

    const subId = subs?.[0]?.stripe_subscription_id
    if (!subId) return // No subscription yet — will be picked up once they subscribe.

    const stripe = getStripe()

    if (pct <= 0) {
      await stripe.subscriptions.update(subId, { discounts: [] })
      return
    }

    const couponId = await getOrCreateCoupon(stripe, `qz-referral-${pct}pct`, {
      percent_off: pct,
      duration: 'forever',
      name: `Parrainage — ${pct}% de réduction`,
    })
    await stripe.subscriptions.update(subId, { discounts: [{ coupon: couponId }] })
  } catch (err) {
    console.error('[referral] applyReferralDiscount failed for', referrerUserId, err)
  }
}

/**
 * Marks a referred user's referral as churned (if it was active) and refreshes
 * the parrain's discount. Returns the referrer id when a change occurred.
 */
export async function churnReferral(referredUserId: string): Promise<string | null> {
  const { data: ref } = await supabaseAdmin
    .from('referrals')
    .select('id, referrer_id, status')
    .eq('referred_id', referredUserId)
    .maybeSingle()

  if (!ref || ref.status === 'churned') return null

  await supabaseAdmin
    .from('referrals')
    .update({ status: 'churned', updated_at: new Date().toISOString() })
    .eq('id', ref.id)

  await applyReferralDiscount(ref.referrer_id)
  return ref.referrer_id
}
