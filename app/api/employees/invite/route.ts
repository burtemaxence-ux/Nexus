import { createClient } from '@supabase/supabase-js'
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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Construire l'URL de base depuis les headers Vercel/proxy
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3000'
    const proto = host.includes('localhost') ? 'http' : 'https'
    const siteUrl = `${proto}://${host}`

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/set-password`,
      data: {
        role: 'employee',
        full_name,
        position,
      },
    })

    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Un compte avec cet email existe déjà' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[invite] exception:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
