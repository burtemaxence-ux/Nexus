import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/rate-limit'
import { DEMO_ACCOUNTS, DEMO_LANDING, isDemoRole } from '@/lib/demo'

// GET /demo?role=manager|employee
//
// Ouvre une session sur le compte de démonstration demandé et redirige vers
// l'espace correspondant. Réutilise `generateLink` — le même mécanisme que les
// invitations employé — puis échange le jeton côté serveur, sans aller-retour
// par le domaine Supabase.
//
// ⚠️ Le client Supabase est instancié ICI plutôt que via `lib/supabase/server`.
// Ce dernier écrit les cookies dans le store de `next/headers`, à l'intérieur
// d'un try/catch qui avale les échecs — et ces écritures ne se reportent PAS
// sur une réponse de redirection construite à la main. La session était donc
// posée dans le vide : le visiteur arrivait sur /manager sans cookie et le
// middleware le renvoyait vers /login. On construit donc la réponse d'abord,
// et on y écrit les cookies directement.
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const { allowed, resetAt } = await checkRateLimit({ key: `demo:${ip}`, limit: 10, windowMs: 60_000 })
  if (!allowed) return rateLimitResponse(resetAt)

  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_URL ?? requestOrigin

  const requested = searchParams.get('role')
  const role = isDemoRole(requested) ? requested : 'manager'

  // Le motif d'échec est repris dans l'URL pour rester diagnosticable sans
  // ouvrir les logs de la plateforme.
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?demo=${reason}`)

  try {
    // Type 'recovery' et non 'magiclink' : en magiclink, GoTrue emprunte le
    // chemin d'inscription et tente un INSERT dans auth.users, qui échoue sur
    // la contrainte d'unicité de l'email puisque le compte existe déjà
    // (« duplicate key value violates users_email_partial_key » → 500).
    // 'recovery' n'est défini que pour un utilisateur existant : il ne crée
    // jamais rien, et échoue proprement si le compte est absent.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: DEMO_ACCOUNTS[role],
    })

    const tokenHash = data?.properties?.hashed_token
    if (error || !tokenHash) {
      console.error('[demo] generateLink', error)
      return fail('lien')
    }

    // La réponse existe AVANT la vérification : c'est elle qui portera les
    // cookies de session posés par verifyOtp.
    const response = NextResponse.redirect(`${origin}${DEMO_LANDING[role]}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: cookiesToSet => {
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options)
            }
          },
        },
      },
    )

    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    })

    if (verifyError) {
      console.error('[demo] verifyOtp', verifyError)
      return fail('session')
    }

    return response
  } catch (e) {
    console.error('[demo]', e)
    return fail('erreur')
  }
}
