/**
 * In-memory sliding-window rate limiter.
 * Works well for a single-process deployment (Node.js server).
 * On serverless (Vercel), state resets on cold starts — still provides
 * per-warm-instance protection, which is effective for low-volume abuse.
 */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

// Clean up stale entries every 10 minutes to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((w, key) => {
      if (w.resetAt < now) store.delete(key)
    })
  }, 10 * 60 * 1000)
}

interface RateLimitOptions {
  /** Unique key: combine route + user identifier (userId or IP) */
  key: string
  /** Max requests allowed in the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
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

// Extracts a client IP from Next.js request headers (best-effort)
export function getClientIp(request: Request): string {
  const h = request.headers
  return (
    (h as Headers).get('x-forwarded-for')?.split(',')[0].trim() ??
    (h as Headers).get('x-real-ip') ??
    'unknown'
  )
}
