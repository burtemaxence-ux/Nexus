import { timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'

function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Returns true only when the request carries the expected Bearer token.
 * If CRON_SECRET is not set the request is always rejected — configure it
 * in production via Vercel environment variables.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization') ?? ''
  return secureCompare(auth, `Bearer ${secret}`)
}
