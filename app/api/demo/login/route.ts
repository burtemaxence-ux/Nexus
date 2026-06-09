import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const demoEmail = process.env.DEMO_USER_EMAIL
  const demoPassword = process.env.DEMO_USER_PASSWORD
  const appUrl = process.env.NEXT_PUBLIC_URL ?? new URL(request.url).origin

  if (!demoEmail || !demoPassword) {
    return NextResponse.redirect(`${new URL(request.url).origin}/demo?error=not_configured`)
  }

  // ── 1. Vérifier si l'utilisateur demo existe dans les profils ────────────────
  const { data: profileRow, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', demoEmail)
    .maybeSingle()

  if (profileErr) {
    console.error('[Demo] profiles lookup error:', profileErr.message)
  }

  if (profileRow?.id) {
    // Utilisateur trouvé — synchroniser le mot de passe avec l'env var
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(profileRow.id, {
      password: demoPassword,
      email_confirm: true,
    })
    if (updateErr) {
      if (!updateErr.message.toLowerCase().includes('not found')) {
        console.error('[Demo] updateUserById error:', updateErr.message)
        return NextResponse.redirect(`${appUrl}/demo?error=1`)
      }
      // Profil orphelin : auth.users supprimé sans cascade — nettoyer et recréer
      console.warn('[Demo] orphaned profile detected, cleaning up:', profileRow.id)
      await supabaseAdmin.from('profiles').delete().eq('id', profileRow.id)
      const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: 'Claire Fontaine', role: 'manager' },
      })
      if (createErr) {
        console.error('[Demo] createUser after orphan cleanup:', createErr.message)
        return NextResponse.redirect(`${appUrl}/demo?error=1`)
      }
    } else {
      console.log('[Demo] password synced for existing user', profileRow.id)
    }
  } else {
    // Utilisateur introuvable — créer via admin (déclenche handle_new_user)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Claire Fontaine', role: 'manager' },
    })
    if (createErr) {
      console.error('[Demo] createUser error:', createErr.message)
      return NextResponse.redirect(`${appUrl}/demo?error=1`)
    }
    console.log('[Demo] demo user created', created?.user?.id)
  }

  // ── 2. Générer un magic link pour l'utilisateur (garanti d'exister maintenant) ─
  const { data, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: demoEmail,
    options: { redirectTo: `${appUrl}/auth/callback?next=/manager` },
  })

  if (linkErr || !data?.properties?.action_link) {
    console.error('[Demo] generateLink error:', linkErr?.message ?? 'no action_link')
    return NextResponse.redirect(`${appUrl}/demo?error=1`)
  }

  // ── 3. Rediriger vers le lien — passe par auth/callback qui pose les cookies ──
  return NextResponse.redirect(data.properties.action_link)
}
