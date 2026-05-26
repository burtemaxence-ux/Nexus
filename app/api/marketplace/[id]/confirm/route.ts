import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'
import { NextRequest, NextResponse } from 'next/server'

// POST — manager confirms one applicant, shift is reassigned
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, establishment_id, active_establishment_id')
    .eq('id', user.id)
    .single()

  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const establishmentId = profile!.active_establishment_id ?? profile!.establishment_id

  const body = await req.json().catch(() => ({})) as { employee_id?: string }
  if (!body.employee_id) return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })

  // Load slot
  const { data: slot } = await supabaseAdmin
    .from('marketplace_slots')
    .select('id, shift_id, status, establishment_id')
    .eq('id', params.id)
    .single()

  if (!slot) return NextResponse.json({ error: 'Slot introuvable' }, { status: 404 })
  if (slot.establishment_id !== establishmentId) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  if (slot.status !== 'open') return NextResponse.json({ error: 'Ce slot n\'est plus ouvert' }, { status: 409 })

  // Verify the employee has a pending application
  const { data: application } = await supabaseAdmin
    .from('marketplace_applications')
    .select('id')
    .eq('slot_id', params.id)
    .eq('employee_id', body.employee_id)
    .eq('status', 'pending')
    .single()

  if (!application) return NextResponse.json({ error: 'Candidature introuvable ou déjà traitée' }, { status: 404 })

  // Load shift details for notification
  const { data: shift } = await supabaseAdmin
    .from('shifts')
    .select('date, start_time, end_time, position')
    .eq('id', slot.shift_id)
    .single()

  const now = new Date().toISOString()

  // 1. Reassign the shift
  const { error: shiftErr } = await supabaseAdmin
    .from('shifts')
    .update({ employee_id: body.employee_id, updated_at: now })
    .eq('id', slot.shift_id)

  if (shiftErr) return NextResponse.json({ error: shiftErr.message }, { status: 500 })

  // 2. Mark slot as filled
  const { error: slotErr } = await supabaseAdmin
    .from('marketplace_slots')
    .update({ status: 'filled', filled_by: body.employee_id, filled_at: now, updated_at: now })
    .eq('id', params.id)

  if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 500 })

  // 3. Accept confirmed application, reject all others
  await Promise.all([
    supabaseAdmin
      .from('marketplace_applications')
      .update({ status: 'accepted' })
      .eq('id', application.id),

    supabaseAdmin
      .from('marketplace_applications')
      .update({ status: 'rejected' })
      .eq('slot_id', params.id)
      .eq('status', 'pending')
      .neq('employee_id', body.employee_id),
  ])

  // 4. Notifications
  if (shift) {
    const fmtDate = new Date(shift.date + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    const fmtTime = `${shift.start_time.slice(0, 5)}–${shift.end_time.slice(0, 5)}`

    // Notify confirmed employee
    sendPushToUser(supabase, body.employee_id, {
      title: 'Shift attribué ✅',
      body:  `${shift.position ?? 'Shift'} du ${fmtDate} ${fmtTime} vous a été attribué.`,
      url:   '/employee/planning',
    }).catch(() => {})

    // Notify rejected applicants
    const { data: rejected } = await supabaseAdmin
      .from('marketplace_applications')
      .select('employee_id')
      .eq('slot_id', params.id)
      .eq('status', 'rejected')
      .neq('employee_id', body.employee_id)

    for (const r of rejected ?? []) {
      sendPushToUser(supabase, r.employee_id, {
        title: 'Shift pourvu',
        body:  `Le shift du ${fmtDate} a été attribué à un autre employé.`,
        url:   '/employee/marketplace',
      }).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
}
