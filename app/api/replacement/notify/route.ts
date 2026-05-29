import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'
import { createNotification } from '@/lib/notifications/create'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, establishment_id, active_establishment_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'supervisor'].includes(profile.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id

  const body = await req.json().catch(() => ({})) as { replacement_request_id?: string }
  if (!body.replacement_request_id) {
    return NextResponse.json({ error: 'replacement_request_id requis' }, { status: 400 })
  }

  // Récupérer le replacement_request
  const { data: rr, error: rrErr } = await supabaseAdmin
    .from('replacement_requests')
    .select('id, status, candidates, shift_id, establishment_id, expires_at')
    .eq('id', body.replacement_request_id)
    .eq('establishment_id', establishmentId)
    .single()

  if (rrErr || !rr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  if (rr.status !== 'pending') {
    return NextResponse.json({ error: `Demande déjà ${rr.status}` }, { status: 409 })
  }

  // Récupérer les infos du shift
  const { data: shift } = await supabaseAdmin
    .from('shifts')
    .select('date, start_time, end_time, position, poste_id')
    .eq('id', rr.shift_id)
    .single()

  if (!shift) return NextResponse.json({ error: 'Shift introuvable' }, { status: 404 })

  // Récupérer le nom de l'établissement
  const { data: estRow } = await supabaseAdmin
    .from('establishments')
    .select('name')
    .eq('id', rr.establishment_id)
    .maybeSingle()

  const estName = estRow?.name ?? 'Votre établissement'

  const fmtDate = new Date(shift.date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const fmtTime = `${shift.start_time.slice(0, 5)}→${shift.end_time.slice(0, 5)}`
  const posteName = shift.position ?? 'Shift'

  // Notifier chaque candidat
  type Candidate = {
    employee_id: string
    score: number
    explanation: string
    notified_at: string | null
    response: string | null
  }

  const candidates: Candidate[] = Array.isArray(rr.candidates) ? rr.candidates : []
  const now = new Date().toISOString()
  const actionUrl = `/employee/replacement/${rr.id}`

  const candidateIds = candidates.map(c => c.employee_id)

  // Envoi notifications in-app en batch
  await createNotification({
    user_ids: candidateIds,
    establishment_id: rr.establishment_id,
    type: 'sos_replacement',
    title: `🔔 Shift disponible — ${estName}`,
    body: `${fmtDate} · ${fmtTime} · ${posteName} · Réponds vite !`,
    data: { replacement_request_id: rr.id, shift_id: rr.shift_id },
    action_url: actionUrl,
  })

  // Envoi push notifications (non-bloquant)
  for (const candidateId of candidateIds) {
    sendPushToUser(supabase, candidateId, {
      title: `🔔 Shift disponible — ${estName}`,
      body: `${fmtDate} · ${fmtTime} · ${posteName}`,
      url: actionUrl,
    }).catch(() => {})
  }

  // Mettre à jour candidates avec notified_at
  const updatedCandidates = candidates.map(c => ({
    ...c,
    notified_at: now,
  }))

  await supabaseAdmin
    .from('replacement_requests')
    .update({ candidates: updatedCandidates })
    .eq('id', rr.id)

  return NextResponse.json({
    ok: true,
    notified: candidateIds.length,
    candidates: updatedCandidates,
  })
}
