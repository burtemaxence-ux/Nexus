import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const demoEmail = process.env.DEMO_USER_EMAIL
  if (!demoEmail) {
    const origin = new URL(request.url).origin
    return NextResponse.redirect(`${origin}/demo?error=not_configured`)
  }

  const appUrl = process.env.NEXT_PUBLIC_URL ?? new URL(request.url).origin

  async function generateLink() {
    return supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: demoEmail!,
      options: { redirectTo: `${appUrl}/auth/callback?next=/manager` },
    })
  }

  let { data, error } = await generateLink()

  if (error) {
    await supabaseAdmin.auth.admin.createUser({
      email: demoEmail,
      password: process.env.DEMO_USER_PASSWORD ?? 'Demo2024!Nexus',
      email_confirm: true,
      user_metadata: { full_name: 'Demo Manager', role: 'manager' },
    })
    const retry = await generateLink()
    data  = retry.data
    error = retry.error
  }

  if (error || !data.properties?.action_link) {
    console.error('[demo/login]', error)
    return NextResponse.redirect(`${appUrl}/demo?error=1`)
  }

  return NextResponse.redirect(data.properties.action_link)
}
