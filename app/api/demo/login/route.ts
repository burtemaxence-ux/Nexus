import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const demoEmail = process.env.DEMO_USER_EMAIL
  const demoPassword = process.env.DEMO_USER_PASSWORD
  const appUrl = process.env.NEXT_PUBLIC_URL ?? new URL(request.url).origin

  if (!demoEmail || !demoPassword) {
    return NextResponse.redirect(`${new URL(request.url).origin}/demo?error=not_configured`)
  }

  // Try direct password sign-in first (happy path: seed ran, passwords match)
  const supabase = await createClient()
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  })

  if (signInData?.session) {
    return NextResponse.redirect(`${appUrl}/manager`)
  }

  // Sign-in failed — ensure user exists and password matches DEMO_USER_PASSWORD
  const { data: profileRow } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', demoEmail)
    .maybeSingle()

  if (profileRow?.id) {
    // User exists but password in DB doesn't match env var — sync it
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(profileRow.id, {
      password: demoPassword,
      email_confirm: true,
    })
    if (updateErr) {
      console.error('[Demo] updateUserById error:', updateErr.message)
      return NextResponse.redirect(`${appUrl}/demo?error=1`)
    }
  } else {
    // User does not exist at all — create it (triggers handle_new_user)
    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Claire Fontaine', role: 'manager' },
    })
    if (createErr) {
      console.error('[Demo] createUser error:', createErr.message)
      return NextResponse.redirect(`${appUrl}/demo?error=1`)
    }
  }

  // Retry sign-in after ensuring user / password
  const supabase2 = await createClient()
  const { data: retryData, error: retryErr } = await supabase2.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  })

  if (retryErr || !retryData?.session) {
    console.error('[Demo login error]', retryErr?.message ?? 'no session after retry')
    return NextResponse.redirect(`${appUrl}/demo?error=1`)
  }

  return NextResponse.redirect(`${appUrl}/manager`)
}
