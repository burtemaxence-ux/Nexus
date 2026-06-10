import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { getSubscription } from '@/lib/subscription'
import { getPlanTier } from '@/lib/plan-guard'

const ESSENTIAL_MONTHLY_LIMIT = 3
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000

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

  // Essential: read from KV or in-memory rate-limit store
  const kvKey = `rate_limit:ai-plan-monthly:${estId}`
  const { used, resetAt } = await readUsage(kvKey)
  const resetIn = resetAt ? Math.max(0, resetAt - Date.now()) : WINDOW_MS

  return NextResponse.json({
    used,
    limit: ESSENTIAL_MONTHLY_LIMIT,
    plan: tier,
    resetIn,
  })
}

// ── Read current usage from KV or in-memory ───────────────────────────────────

async function readUsage(key: string): Promise<{ used: number; resetAt: number | null }> {
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import('@vercel/kv')
      const raw = await kv.get<{ count: number; resetAt: number }>(key)
      if (raw) return { used: raw.count, resetAt: raw.resetAt }
      return { used: 0, resetAt: null }
    } catch {
      // KV unavailable — fall through
    }
  }
  return { used: 0, resetAt: null }
}
