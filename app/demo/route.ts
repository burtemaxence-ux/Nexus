import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/rate-limit'
import { DEMO_ACCOUNTS, DEMO_LANDING, isDemoRole } from '@/lib/demo'

// GET /demo?role=manager|employee
//
// Ouvre une session sur le compte de démonstration demandé et redirige vers
// l'espace correspondant. Réutilise `generateLink` — le même mécanisme que les
// invitations employé — puis échange le jeton côté serveur, sans aller-retour
// par le domaine Supabase.
export async function GET(request: Request) {
  const ip = getClientIp(request)
  const { allowed, resetAt } = await checkRateLimit({ key: `demo:${ip}`, limit: 10, windowMs: 60_000 })
  if (!allowed) return rateLimitResponse(resetAt)

  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_URL ?? requestOrigin

  const requested = searchParams.get('role')
  const role = isDemoRole(requested) ? requested : 'manager'

  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: DEMO_ACCOUNTS[role],
    })

    const tokenHash = data?.properties?.hashed_token
    if (error || !tokenHash) {
      console.error('[demo] generateLink', error)
      return NextResponse.redirect(`${origin}/login`)
    }

    const supabase = await createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
    })

    if (verifyError) {
      console.error('[demo] verifyOtp', verifyError)
      return NextResponse.redirect(`${origin}/login`)
    }

    return NextResponse.redirect(`${origin}${DEMO_LANDING[role]}`)
  } catch (e) {
    console.error('[demo]', e)
    return NextResponse.redirect(`${origin}/login`)
  }
}
