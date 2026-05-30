import { NextRequest } from 'next/server'

/**
 * Returns true only when the request carries the expected Bearer token.
 * If CRON_SECRET is not set the request is always rejected — configure it
 * in production via Vercel environment variables.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}
