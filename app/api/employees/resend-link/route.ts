import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoAccount } from '@/lib/demo'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = await checkRateLimit({ key: `resend-link:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles')
    .select('role, establishment_id, active_establishment_id').eq('id', user.id).single()
  if (!profile || !['manager', 'supervisor'].includes(profile.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // Démo publique : même risque que la route d'invitation — un lien d'accès
  // serait généré et envoyé à une adresse saisie par le visiteur.
  if (isDemoAccount(user.email)) {
    await new Promise(r => setTimeout(r, 600))
    return NextResponse.json({ ok: true, demo: true })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  const { email } = body as { email: string }
  const targetEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!targetEmail) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  const { data: employee, error: profileError } = await supabase.from('profiles').select('id')
    .eq('email', targetEmail)
    .eq('role', 'employee')
    .eq('establishment_id', profile.active_establishment_id ?? profile.establishment_id)
    .maybeSingle()
  if (profileError) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  if (!employee) return NextResponse.json({ error: 'Salarié introuvable dans cet établissement' }, { status: 404 })

  const { data: authEmployee, error: authError } = await supabaseAdmin.auth.admin.getUserById(employee.id)
  if (authError) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  const employeeEmail = authEmployee.user?.email
  if (!employeeEmail || employeeEmail.toLowerCase() !== targetEmail) {
    return NextResponse.json({ error: 'Salarié introuvable dans cet établissement' }, { status: 404 })
  }

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3000'
  const proto = host.includes('localhost') ? 'http' : 'https'
  const siteUrl = `${proto}://${host}`

  // Recovery link lets an existing user set a new password via /auth/set-password
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: employeeEmail,
    options: { redirectTo: `${siteUrl}/auth/set-password` },
  })

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  const link = data.properties?.action_link
  if (!link || data.user?.id !== employee.id) {
    return NextResponse.json({ error: 'Impossible de générer le lien' }, { status: 500 })
  }

  return NextResponse.json({ link })
}
