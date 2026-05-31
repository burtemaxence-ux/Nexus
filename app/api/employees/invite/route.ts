import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { InviteSchema, validationError } from '@/lib/validations'
import { createNotification } from '@/lib/notifications/create'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = await checkRateLimit({ key: `invite:${ip}`, limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const raw = await request.json().catch(() => null)
    const parsed = InviteSchema.safeParse(raw)
    if (!parsed.success) return validationError(parsed.error)

    const { first_name, last_name, email, phone, role, position, contract_type, weekly_hours, start_date } = parsed.data
    const full_name = `${first_name.trim()} ${last_name.trim()}`

    const supabase = await createServerClient()
    const { user, profile: managerProfile } = await requireAuth(supabase)

    // Only managers can invite — supervisors have read-only access
    if (managerProfile.role !== 'manager') {
      return NextResponse.json({ error: 'Seul un manager peut inviter des employés' }, { status: 403 })
    }

    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3000'
    const proto = host.includes('localhost') ? 'http' : 'https'
    const siteUrl = `${proto}://${host}`

    // generateLink bypasses Supabase's SMTP entirely — no rate limit, no email sent
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${siteUrl}/auth/set-password`,
        data: {
          role,
          full_name,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          position,
          establishment_id: managerProfile?.establishment_id ?? null,
        },
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
      establishment_id: managerProfile?.establishment_id ?? null,
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

    // In-app notification to the manager who sent the invite
    if (user) {
      const firstName = first_name.trim()
      createNotification({
        user_ids: [user.id],
        establishment_id: managerProfile?.establishment_id ?? null,
        type: 'employee_invited',
        title: `${firstName} a été invité`,
        body: 'Le lien d\'invitation a été envoyé',
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, inviteLink, full_name })
  } catch (err) {
    if (err instanceof Response) return err as NextResponse
    console.error('[invite] exception:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
