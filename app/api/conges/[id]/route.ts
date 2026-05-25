import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendLeaveDecisionEmail } from '@/lib/email/conges-email'
import { fireWebhook } from '@/lib/integrations/webhook'
import type { LeaveType } from '@/types'

// PATCH — manager approuve / refuse  OU  employé annule
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const body = await request.json()

  if (profile?.role === 'manager') {
    const { status, manager_comment } = body
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status doit être approved ou rejected' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .update({ status, manager_comment: manager_comment || null, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select(`
        *,
        profiles:employee_id ( id, full_name, email )
      `)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Si approuvé : supprimer les shifts de l'employé pendant la période de congé
    if (status === 'approved') {
      supabase
        .from('shifts')
        .delete()
        .eq('employee_id', data.employee_id)
        .gte('date', data.start_date)
        .lte('date', data.end_date)
        .then(() => {})
    }

    // Notification email à l'employé (silencieuse si domaine non configuré)
    const emp = data.profiles as { id: string; full_name: string | null; email: string } | null
    if (emp?.email) {
      const firstName = emp.full_name?.split(' ')[0] ?? emp.email.split('@')[0]
      sendLeaveDecisionEmail({
        toEmail: emp.email,
        firstName,
        status,
        type: data.type as LeaveType,
        startDate: data.start_date,
        endDate: data.end_date,
        managerComment: manager_comment || null,
      }).catch(() => {})
    }

    // Webhook notification
    const { data: settingsData } = await supabase.from('settings').select('key, value')
    const settings: Record<string, string> = {}
    for (const row of settingsData ?? []) settings[row.key] = row.value
    const leaveTypeLabels: Record<string, string> = { CP: 'Congés payés', RTT: 'RTT', maladie: 'Maladie', sans_solde: 'Sans solde', autre: 'Autre' }
    fireWebhook(settings, status === 'approved' ? 'leave.approved' : 'leave.rejected', {
      employeeName: emp?.full_name ?? emp?.email ?? '—',
      leaveType: leaveTypeLabels[data.type] ?? data.type,
      startDate: data.start_date,
      endDate: data.end_date,
    }).catch(() => {})

    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
}

// DELETE — employé annule sa propre demande en attente
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { error } = await supabase
    .from('leave_requests')
    .delete()
    .eq('id', params.id)
    .eq('employee_id', user.id)
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
