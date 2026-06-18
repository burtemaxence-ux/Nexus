import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function shiftsOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  let sm1 = timeToMin(s1), em1 = timeToMin(e1)
  let sm2 = timeToMin(s2), em2 = timeToMin(e2)
  if (em1 <= sm1) em1 += 1440
  if (em2 <= sm2) em2 += 1440
  return Math.max(sm1, sm2) < Math.min(em1, em2)
}

// POST — employee applies for a marketplace slot
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const rl = await checkRateLimit({ key: `marketplace-apply:${user.id}`, limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, establishment_id, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'employee') {
    return NextResponse.json({ error: 'Réservé aux employés' }, { status: 403 })
  }

  // Load slot + shift
  const { data: slot } = await supabaseAdmin
    .from('marketplace_slots')
    .select('id, shift_id, status, expires_at, establishment_id, created_by')
    .eq('id', params.id)
    .single()

  if (!slot) return NextResponse.json({ error: 'Slot introuvable' }, { status: 404 })
  if (slot.establishment_id !== profile.establishment_id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  if (slot.status !== 'open') return NextResponse.json({ error: 'Ce slot n\'est plus disponible' }, { status: 409 })
  if (new Date(slot.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Ce slot a expiré' }, { status: 410 })
  }

  const { data: shift } = await supabaseAdmin
    .from('shifts')
    .select('date, start_time, end_time')
    .eq('id', slot.shift_id)
    .single()

  if (!shift) return NextResponse.json({ error: 'Shift introuvable' }, { status: 404 })

  // Check eligibility: no conflicting shift
  const { data: existingShifts } = await supabaseAdmin
    .from('shifts')
    .select('start_time, end_time')
    .eq('employee_id', user.id)
    .eq('date', shift.date)
    .is('deleted_at', null)

  for (const es of existingShifts ?? []) {
    if (shiftsOverlap(es.start_time, es.end_time, shift.start_time, shift.end_time)) {
      return NextResponse.json({ error: 'Vous avez déjà un shift en conflit ce jour-là' }, { status: 409 })
    }
  }

  // Check no approved leave
  const { data: leave } = await supabaseAdmin
    .from('leave_requests')
    .select('id')
    .eq('employee_id', user.id)
    .eq('status', 'approved')
    .lte('start_date', shift.date)
    .gte('end_date', shift.date)
    .maybeSingle()

  if (leave) {
    return NextResponse.json({ error: 'Vous êtes en congé ce jour-là' }, { status: 409 })
  }

  // Create application (upsert in case they already applied)
  const { data: application, error } = await supabaseAdmin
    .from('marketplace_applications')
    .upsert({ slot_id: params.id, employee_id: user.id, status: 'pending' }, { onConflict: 'slot_id,employee_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify manager
  const fmtDate = new Date(shift.date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
  sendPushToUser(supabase, slot.created_by, {
    title: 'Nouvelle candidature 👋',
    body:  `${profile.full_name ?? 'Un employé'} est disponible pour le shift du ${fmtDate}`,
    url:   '/manager/marketplace',
  }).catch(() => {})

  return NextResponse.json({ application }, { status: 201 })
}
