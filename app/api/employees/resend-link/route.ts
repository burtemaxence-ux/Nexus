import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit({ key: `resend-link:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { email } = await request.json() as { email: string }
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3000'
  const proto = host.includes('localhost') ? 'http' : 'https'
  const siteUrl = `${proto}://${host}`

  // Recovery link lets an existing user set a new password via /auth/set-password
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/auth/set-password` },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const link = data.properties?.action_link
  if (!link) return NextResponse.json({ error: 'Impossible de générer le lien' }, { status: 500 })

  return NextResponse.json({ link })
}
