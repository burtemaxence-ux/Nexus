import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications/create'
import { sendPushToUser } from '@/lib/push'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    replacement_request_id?: string
    employee_id?: string
    response?: 'confirmed' | 'declined'
  }

  if (!body.replacement_request_id || !body.employee_id || !body.response) {
    return NextResponse.json({ error: 'replacement_request_id, employee_id et response requis' }, { status: 400 })
  }

  // Vérifier que l'utilisateur est bien le candidat concerné
  if (user.id !== body.employee_id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // Récupérer le replacement_request (via admin pour bypass RLS sur la lecture)
  const { data: rr, error: rrErr } = await supabaseAdmin
    .from('replacement_requests')
    .select('id, status, candidates, shift_id, establishment_id, absent_employee_id, expires_at')
    .eq('id', body.replacement_request_id)
    .single()

  if (rrErr || !rr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  // Vérifier que l'utilisateur est bien dans les candidats
  type Candidate = {
    employee_id: string
    score: number
    explanation: string
    notified_at: string | null
    response: string | null
  }
  const candidates: Candidate[] = Array.isArray(rr.candidates) ? rr.candidates : []
  const isCandidate = candidates.some(c => c.employee_id === body.employee_id)
  if (!isCandidate) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  // Vérifier que la demande est encore active
  if (rr.status !== 'pending') {
    return NextResponse.json({
      error: rr.status === 'confirmed'
        ? 'Ce créneau a déjà été attribué à quelqu\'un d\'autre.'
        : 'Cette demande a expiré.',
      status: rr.status,
    }, { status: 409 })
  }

  // Vérifier expiration
  if (new Date(rr.expires_at) < new Date()) {
    await supabaseAdmin
      .from('replacement_requests')
      .update({ status: 'expired' })
      .eq('id', rr.id)
    return NextResponse.json({ error: 'Cette demande a expiré.', status: 'expired' }, { status: 409 })
  }

  // ── Réponse : DECLINED ────────────────────────────────────────────────────

  if (body.response === 'declined') {
    const updatedCandidates = candidates.map(c =>
      c.employee_id === body.employee_id ? { ...c, response: 'declined' } : c
    )

    await supabaseAdmin
      .from('replacement_requests')
      .update({ candidates: updatedCandidates })
      .eq('id', rr.id)

    // Vérifier si tous ont refusé
    const allDeclined = updatedCandidates.every(c => c.response === 'declined')
    if (allDeclined) {
      // Récupérer les managers de l'établissement pour les notifier
      const { data: managers } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('establishment_id', rr.establishment_id)
        .in('role', ['manager', 'supervisor'])

      if (managers && managers.length > 0) {
        const { data: shift } = await supabaseAdmin
          .from('shifts')
          .select('start_time, end_time')
          .eq('id', rr.shift_id)
          .single()

        const managerIds = managers.map((m: { id: string }) => m.id)
        const fmtTime = shift
          ? `${shift.start_time.slice(0, 5)}→${shift.end_time.slice(0, 5)}`
          : 'ce créneau'

        await createNotification({
          user_ids: managerIds,
          establishment_id: rr.establishment_id,
          type: 'replacement_all_declined',
          title: '⚠ Aucun remplaçant disponible',
          body: `Tous les candidats ont refusé le shift ${fmtTime}. Voir les autres options.`,
          data: { replacement_request_id: rr.id },
          action_url: '/manager/planning',
        })
      }
    }

    return NextResponse.json({ ok: true, response: 'declined' })
  }

  // ── Réponse : CONFIRMED ───────────────────────────────────────────────────

  // Double-check race condition : re-lire le status
  const { data: freshRr } = await supabaseAdmin
    .from('replacement_requests')
    .select('status')
    .eq('id', rr.id)
    .single()

  if (freshRr?.status !== 'pending') {
    return NextResponse.json({
      error: 'Ce créneau vient d\'être attribué à quelqu\'un d\'autre.',
      status: freshRr?.status,
    }, { status: 409 })
  }

  // Récupérer le shift original pour le dupliquer
  const { data: originalShift } = await supabaseAdmin
    .from('shifts')
    .select('date, start_time, end_time, position, poste_id, break_minutes, notes, establishment_id, status')
    .eq('id', rr.shift_id)
    .single()

  if (!originalShift) return NextResponse.json({ error: 'Shift original introuvable' }, { status: 404 })

  // Créer le nouveau shift pour l'employé confirmé
  const { data: newShift, error: shiftErr } = await supabaseAdmin
    .from('shifts')
    .insert({
      employee_id: body.employee_id,
      date: originalShift.date,
      start_time: originalShift.start_time,
      end_time: originalShift.end_time,
      position: originalShift.position,
      poste_id: originalShift.poste_id,
      break_minutes: originalShift.break_minutes ?? 0,
      notes: originalShift.notes,
      establishment_id: originalShift.establishment_id,
      status: originalShift.status ?? 'published',
    })
    .select()
    .single()

  if (shiftErr || !newShift) {
    console.error('[replacement/confirm] shift insert error:', shiftErr?.message)
    return NextResponse.json({ error: 'Erreur lors de la création du shift' }, { status: 500 })
  }

  // Mettre à jour le replacement_request : confirmed
  const now = new Date().toISOString()
  const updatedCandidates = candidates.map(c =>
    c.employee_id === body.employee_id ? { ...c, response: 'confirmed' } : c
  )

  await supabaseAdmin
    .from('replacement_requests')
    .update({
      status: 'confirmed',
      confirmed_employee_id: body.employee_id,
      confirmed_at: now,
      candidates: updatedCandidates,
    })
    .eq('id', rr.id)

  // Récupérer le nom de l'employé confirmé
  const { data: confirmedProfile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, first_name')
    .eq('id', body.employee_id)
    .single()

  const confirmedName = confirmedProfile?.full_name ?? confirmedProfile?.first_name ?? 'L\'employé'
  const fmtTime = `${originalShift.start_time.slice(0, 5)}→${originalShift.end_time.slice(0, 5)}`

  // Notifier les managers
  const { data: managers } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('establishment_id', rr.establishment_id)
    .in('role', ['manager', 'supervisor'])

  if (managers && managers.length > 0) {
    const managerIds = managers.map((m: { id: string }) => m.id)
    await createNotification({
      user_ids: managerIds,
      establishment_id: rr.establishment_id,
      type: 'replacement_confirmed',
      title: `✅ Remplacement confirmé`,
      body: `${confirmedName} a confirmé le remplacement de ${fmtTime}.`,
      data: { replacement_request_id: rr.id, new_shift_id: newShift.id },
      action_url: '/manager/planning',
    })

    // Push aux managers
    for (const manager of managers as { id: string }[]) {
      sendPushToUser(supabase, manager.id, {
        title: '✅ Remplacement confirmé',
        body: `${confirmedName} prend le créneau ${fmtTime}`,
        url: '/manager/planning',
      }).catch(() => {})
    }
  }

  // Notifier les 2 autres candidats que le créneau est attribué
  const otherCandidateIds = candidates
    .filter(c => c.employee_id !== body.employee_id)
    .map(c => c.employee_id)

  if (otherCandidateIds.length > 0) {
    await createNotification({
      user_ids: otherCandidateIds,
      establishment_id: rr.establishment_id,
      type: 'replacement_filled',
      title: 'Créneau attribué',
      body: `Ce créneau a été attribué à quelqu'un d'autre. Merci pour ta disponibilité !`,
      data: { replacement_request_id: rr.id },
      action_url: '/employee',
    })
  }

  // Invalider le cache du planning
  revalidatePath('/manager/planning')

  return NextResponse.json({
    ok: true,
    response: 'confirmed',
    new_shift_id: newShift.id,
  })
}
