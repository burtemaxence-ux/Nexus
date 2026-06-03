import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const demoEmail = process.env.DEMO_USER_EMAIL
  if (!demoEmail) {
    const origin = new URL(request.url).origin
    return NextResponse.redirect(`${origin}/demo?error=not_configured`)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: demoEmail,
    options: {
      redirectTo: `${appUrl}/auth/callback?next=/manager`,
    },
  })

  if (error || !data.properties?.action_link) {
    console.error('[demo/login]', error)
    return NextResponse.redirect(`${appUrl}/demo?error=1`)
  }

  return NextResponse.redirect(data.properties.action_link)
}
