import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api-auth'
import { LeaveRequestSchema, validationError } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { fireWebhook } from '@/lib/integrations/webhook'
import { parseLeaveConfig, leaveTypeLabel } from '@/lib/leaves'
import type { LeaveType } from '@/types'

// GET — employé : ses propres demandes / manager : toutes
export async function GET() {
  try {
    const supabase = await createClient()
    const { user, profile } = await requireAuth(supabase)

    let query = supabase
      .from('leave_requests')
      .select('*, profiles(id, full_name, email, position)')
      .order('created_at', { ascending: false })

    // Managers ET superviseurs voient toute l'équipe (la RLS `leave_select`
    // scope à l'établissement via is_manager(), vraie pour les deux rôles).
    // Les employés ne voient que leurs propres demandes.
    if (profile.role !== 'manager' && profile.role !== 'supervisor') {
      query = query.eq('employee_id', user.id) as typeof query
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}

// POST — l'employé crée une demande
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { user, profile } = await requireAuth(supabase)

    const raw = await request.json().catch(() => null)
    const parsed = LeaveRequestSchema.safeParse(raw)
    if (!parsed.success) return validationError(parsed.error)

    const { start_date, end_date, type, comment } = parsed.data

    // Settings are read with the service-role client because the trigger is an
    // employee, whose session cannot read manager-only secrets (webhook URLs /
    // signing secret) under RLS.
    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
    const [{ data: profileData }, { data: settingsData }] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
      supabaseAdmin.from('settings').select('key, value').eq('establishment_id', estId),
    ])
    const settings: Record<string, string> = {}
    for (const row of settingsData ?? []) settings[row.key] = row.value

    // Validation auto / manuelle selon le réglage du type (Réglages › Congés).
    const leaveConfig = parseLeaveConfig(settings.leave_types_config)
    const autoApprove = leaveConfig[type as LeaveType]?.validation === 'auto'
    const status = autoApprove ? 'approved' : 'pending'

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({ employee_id: user.id, start_date, end_date, type, comment: comment || null, status })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Erreur lors de la création de la demande' }, { status: 500 })

    // Auto-validé : libérer les créneaux de la période (service-role car un
    // employé ne peut pas supprimer de shifts sous RLS).
    if (autoApprove) {
      await supabaseAdmin
        .from('shifts')
        .delete()
        .eq('employee_id', user.id)
        .gte('date', start_date)
        .lte('date', end_date)
    }

    fireWebhook(settings, autoApprove ? 'leave.approved' : 'leave.requested', {
      employeeName: profileData?.full_name ?? profileData?.email ?? '—',
      leaveType: leaveTypeLabel(data.type),
      startDate: data.start_date,
      endDate: data.end_date,
    }, { establishmentId: estId }).catch(() => {})

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
