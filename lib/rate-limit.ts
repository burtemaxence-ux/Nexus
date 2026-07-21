/**
 * Rate limiter with Vercel KV backend (Redis) when available.
 * Falls back to a durable Postgres counter (migration 081, consume_rate_limit)
 * when KV is absent, then to an in-memory store as last resort (local dev
 * without any backend). Chain: KV → Postgres → in-memory.
 *
 * KV key schema : rate_limit:{key}
 * Each key stores a JSON object { count, resetAt } with a TTL of windowMs/1000 seconds.
 */

if (!process.env.KV_REST_API_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[RateLimit] Neither KV_REST_API_URL nor SUPABASE_SERVICE_ROLE_KEY configured ' +
    '— using in-memory store. This affects only the generic hourly rate limit, ' +
    'which is best-effort and not shared across serverless instances. The monthly ' +
    'AI quota is DB-backed (migration 048, consume_ai_credit) and remains ' +
    'authoritative regardless.'
  )
}

// ── In-memory fallback ────────────────────────────────────────────────────────

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((w, key) => {
      if (w.resetAt < now) store.delete(key)
    })
  }, 10 * 60 * 1000)
}

function checkInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt }
}

// ── KV backend ────────────────────────────────────────────────────────────────

function kvAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL || process.env.KV_URL)
}

async function checkKv(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const { kv } = await import('@vercel/kv')
  const redisKey = `rate_limit:${key}`
  const ttlSeconds = Math.ceil(windowMs / 1000)

  // Atomically increment; set TTL on first write
  const count = await kv.incr(redisKey)
  if (count === 1) {
    await kv.expire(redisKey, ttlSeconds)
  }

  // Approximate resetAt from TTL
  const ttlRemaining = await kv.ttl(redisKey)
  const resetAt = Date.now() + (ttlRemaining > 0 ? ttlRemaining * 1000 : windowMs)

  if (count > limit) {
    return { allowed: false, remaining: 0, resetAt }
  }

  return { allowed: true, remaining: limit - count, resetAt }
}

// ── Postgres backend (durable) ────────────────────────────────────────────────
// Survives serverless cold starts, unlike the in-memory fallback. Calls the
// SECURITY DEFINER function consume_rate_limit (migration 081) through the
// service-role client — the function is not executable by anon/authenticated.

function dbAvailable(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function checkDb(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const { supabaseAdmin } = await import('@/lib/supabase/admin')
  const { data, error } = await supabaseAdmin.rpc('consume_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: Math.max(1, Math.round(windowMs / 1000)),
  })
  if (error) throw error
  const r = data as { allowed: boolean; remaining: number; reset_at: number }
  return { allowed: r.allowed, remaining: r.remaining, resetAt: Number(r.reset_at) }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RateLimitOptions {
  /** Unique key: combine route + user identifier (userId or IP) */
  key: string
  /** Max requests allowed in the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export async function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  if (kvAvailable()) {
    try {
      return await checkKv(key, limit, windowMs)
    } catch (err) {
      console.warn('[rate-limit] KV error, falling back', err)
    }
  }
  if (dbAvailable()) {
    try {
      return await checkDb(key, limit, windowMs)
    } catch (err) {
      console.warn('[rate-limit] DB error, falling back to in-memory', err)
    }
  }
  return checkInMemory(key, limit, windowMs)
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return Response.json(
    { error: 'Trop de requêtes. Veuillez réessayer dans quelques instants.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(Math.floor(resetAt / 1000)),
      },
    }
  )
}

export function getClientIp(request: Request): string {
  const h = request.headers
  return (
    (h as Headers).get('x-forwarded-for')?.split(',')[0].trim() ??
    (h as Headers).get('x-real-ip') ??
    'unknown'
  )
}
