import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { generateReferralCode, getReferralStats } from '@/lib/referral'

export async function GET() {
  const supabase = await createClient()
  let userId: string
  try {
    const { user } = await requireManager(supabase)
    userId = user.id
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const code = generateReferralCode(userId)
  const stats = await getReferralStats(supabase, userId)

  return NextResponse.json({
    code,
    active_count: stats.active,
    discount_pct: stats.discount,
    filleuls: stats.filleuls,
  })
}
