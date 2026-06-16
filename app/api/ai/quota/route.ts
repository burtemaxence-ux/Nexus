import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { getSubscription } from '@/lib/subscription'
import { getPlanTier } from '@/lib/plan-guard'

const ESSENTIAL_MONTHLY_LIMIT = 3

export async function GET() {
  const supabase = await createClient()
  let estId: string
  try {
    const { profile } = await requireManager(supabase)
    estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const sub = await getSubscription(supabase, estId)
  const tier = getPlanTier(sub)

  // Pro and multisite have unlimited AI
  if (tier === 'pro' || tier === 'multisite') {
    return NextResponse.json({ used: 0, limit: -1, plan: tier, resetIn: null })
  }

  // Essential: authoritative usage from the DB (resets on calendar month).
  const { data: used } = await supabase.rpc('get_ai_usage')

  return NextResponse.json({
    used: typeof used === 'number' ? used : 0,
    limit: ESSENTIAL_MONTHLY_LIMIT,
    plan: tier,
    resetIn: msUntilNextMonthUTC(),
  })
}

// Milliseconds until the first day of next month (00:00 UTC) — the quota window.
function msUntilNextMonthUTC(): number {
  const now = new Date()
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)
  return Math.max(0, next - now.getTime())
}
