import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendTrialEndingEmail } from '@/lib/email/trial-ending'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'

// Vercel Cron : tous les jours à 09h00 UTC → "0 9 * * *"

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const in3daysStr = in3days.toISOString().slice(0, 10)
  const todayStr = now.toISOString().slice(0, 10)

  // Subscriptions en trialing qui se terminent dans les 3 prochains jours
  const { data: subs, error } = await supabaseAdmin
    .from('subscriptions')
    .select('establishment_id, user_id, trial_end')
    .eq('status', 'trialing')
    .gte('trial_end', todayStr)
    .lte('trial_end', in3daysStr + 'T23:59:59Z')

  if (error) {
    console.error('[cron/trial-reminder] Erreur query:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  let sent = 0
  let skipped = 0

  for (const sub of subs ?? []) {
    if (!sub.establishment_id) continue

    // Cooldown 24h par établissement via KV ou in-memory fallback
    const kvKey = `trial-reminder:${sub.establishment_id}`
    const alreadySent = await checkCooldown(kvKey)
    if (alreadySent) {
      skipped++
      continue
    }

    // Récupérer le profil manager de l'établissement
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', sub.user_id)
      .eq('role', 'manager')
      .maybeSingle()

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
    const email = authUser.user?.email
    if (!email) continue

    const fullName = profile?.full_name ?? email.split('@')[0]

    await sendTrialEndingEmail(email, fullName)
    await setCooldown(kvKey)
    sent++
  }

  return NextResponse.json({ sent, skipped, total: (subs ?? []).length })
}

// ── KV cooldown helpers ────────────────────────────────────────────────────────

const memCooldown = new Map<string, number>()

async function checkCooldown(key: string): Promise<boolean> {
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import('@vercel/kv')
      const val = await kv.get<number>(key)
      return val !== null
    } catch {
      // KV unavailable — fall through to in-memory
    }
  }
  const exp = memCooldown.get(key)
  return exp !== undefined && exp > Date.now()
}

async function setCooldown(key: string): Promise<void> {
  const ttlSeconds = 24 * 60 * 60
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import('@vercel/kv')
      await kv.set(key, 1, { ex: ttlSeconds })
      return
    } catch {
      // KV unavailable — fall through to in-memory
    }
  }
  memCooldown.set(key, Date.now() + ttlSeconds * 1000)
}
