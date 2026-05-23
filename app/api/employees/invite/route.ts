import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, full_name, position } = body as {
      email: string
      full_name: string
      position: string
    }

    if (!email || !full_name || !position) {
      return NextResponse.json(
        { error: 'Email, nom complet et poste sont requis' },
        { status: 400 }
      )
    }

    // Get the current logged-in manager
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3000'
    const proto = host.includes('localhost') ? 'http' : 'https'
    const siteUrl = `${proto}://${host}`

    // generateLink bypasses Supabase's SMTP entirely — no rate limit, no email sent
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${siteUrl}/auth/set-password`,
        data: { role: 'employee', full_name, position },
      },
    })

    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Un compte avec cet email existe déjà. Utilisez "Renvoyer le lien" depuis la liste des employés.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const inviteLink = data.properties?.action_link
    if (!inviteLink) {
      return NextResponse.json({ error: 'Impossible de générer le lien' }, { status: 500 })
    }

    // Set invited_by on the newly created profile
    if (user) {
      await supabase.from('profiles').update({ invited_by: user.id }).eq('email', email)
    }

    return NextResponse.json({ success: true, inviteLink })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[invite] exception:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
