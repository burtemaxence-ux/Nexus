import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const { allowed, resetAt } = await checkRateLimit({ key: `auth:${ip}`, limit: 10, windowMs: 60_000 })
  if (!allowed) return rateLimitResponse(resetAt)

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // En cas d'erreur, rediriger vers la page de login
  return NextResponse.redirect(`${origin}/login`)
}
