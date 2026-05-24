import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      first_name,
      last_name,
      email,
      phone,
      role = 'employee',
      position,
      contract_type,
      weekly_hours,
      start_date,
    } = body as {
      first_name: string
      last_name: string
      email: string
      phone?: string
      role?: 'manager' | 'employee' | 'supervisor'
      position?: string
      contract_type?: string
      weekly_hours?: number
      start_date?: string
    }

    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Prénom, nom et email sont requis' },
        { status: 400 }
      )
    }

    const full_name = `${first_name.trim()} ${last_name.trim()}`

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
        data: { role, full_name, first_name: first_name.trim(), last_name: last_name.trim(), position },
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

    // Enrich the profile created by the DB trigger
    const profileUpdate: Record<string, unknown> = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      full_name,
      position: position ?? null,
      phone: phone?.trim() || null,
      contract_type: contract_type ?? null,
      weekly_hours: weekly_hours ?? null,
    }
    if (user) profileUpdate.invited_by = user.id

    await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('email', email)

    // Auto-create first contract if enough data provided
    if (contract_type && start_date && weekly_hours) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (profile) {
        await supabaseAdmin.from('contracts').insert({
          employee_id: profile.id,
          type: contract_type,
          start_date,
          weekly_hours,
          created_by: user?.id ?? null,
        })
      }
    }

    return NextResponse.json({ success: true, inviteLink, full_name })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[invite] exception:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
