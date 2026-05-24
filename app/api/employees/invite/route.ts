import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { InviteSchema, validationError } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json().catch(() => null)
    const parsed = InviteSchema.safeParse(raw)
    if (!parsed.success) return validationError(parsed.error)

    const { first_name, last_name, email, phone, role, position, contract_type, weekly_hours, start_date } = parsed.data
    const full_name = `${first_name.trim()} ${last_name.trim()}`

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

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
      return NextResponse.json({ error: 'Impossible de créer le lien d\'invitation' }, { status: 500 })
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
    console.error('[invite] exception:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
