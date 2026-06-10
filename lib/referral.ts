import { supabaseAdmin } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export function generateReferralCode(userId: string): string {
  return 'QTZ-' + userId.replace(/-/g, '').slice(0, 6).toUpperCase()
}

export type ReferralRow = {
  id: string
  referred_id: string | null
  status: string
  activated_at: string | null
  discount_pct: number
  created_at: string
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
    .select('id, referred_id, status, activated_at, discount_pct, created_at')
    .eq('referral_code', code)
    .not('referred_id', 'is', null)

  const filleuls = (data ?? []) as ReferralRow[]
  const active = filleuls.filter(r => r.status === 'active').length
  const pending = filleuls.filter(r => r.status === 'pending').length
  const discount = Math.min(active * 15, 75)

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

  // Prevent duplicate referrals for the same user
  const { data: alreadyReferred } = await supabaseAdmin
    .from('referrals')
    .select('id')
    .eq('referred_id', referredUserId)
    .maybeSingle()

  if (alreadyReferred) return

  await supabaseAdmin.from('referrals').insert({
    referrer_id: seed.referrer_id,
    referred_id: referredUserId,
    referral_code: referralCode,
    status: 'pending',
  })
}

export async function applyReferralDiscount(
  _establishmentId: string,
  _discountPct: number
): Promise<void> {
  // Réduction appliquée via Stripe coupon — à implémenter lors de l'intégration Stripe
}
