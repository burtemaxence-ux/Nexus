import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const { allowed, resetAt } = await checkRateLimit({ key: `auth:${ip}`, limit: 10, windowMs: 60_000 })
  if (!allowed) return rateLimitResponse(resetAt)

  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_URL ?? requestOrigin
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const role = data.user?.user_metadata?.role as string | undefined
      // Si next est explicitement fourni (ex: démo, register), l'utiliser
      if (next !== '/') {
        return NextResponse.redirect(`${origin}${next}`)
      }
      // Rediriger selon le rôle — undefined → /manager (onboarding prend le relais)
      const destination = role === 'employee' ? '/employee' : '/manager'
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  // En cas d'erreur, rediriger vers la page de login
  return NextResponse.redirect(`${origin}/login`)
}
