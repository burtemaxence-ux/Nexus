import { supabaseAdmin } from '@/lib/supabase/admin'
import { clockIdentity } from '@/lib/presences/clock'
import { NextResponse } from 'next/server'

export async function POST() {
  const identity = await clockIdentity()
  if (!identity) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { userId, establishmentId } = identity
  const supabase = supabaseAdmin

  const breakStart = new Date().toISOString()

  // La présence ouverte peut dater de la veille pour un service de nuit.
  const [{ data: presence, error: presenceError }, { data: limitRow }] = await Promise.all([
    supabase.from('presences').select('id, break_start, break_end, break_minutes_used')
      .eq('employee_id', userId).eq('establishment_id', establishmentId)
      .is('clock_out', null).not('clock_in', 'is', null)
      .order('clock_in', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('settings').select('value').eq('establishment_id', establishmentId)
      .eq('key', 'break_minutes_limit').maybeSingle(),
  ])

  if (presenceError) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  if (!presence) return NextResponse.json({ error: 'Aucun pointage actif trouvé' }, { status: 409 })
  if (presence.break_start && !presence.break_end) return NextResponse.json({ error: 'Pause déjà en cours' }, { status: 409 })

  const limit = parseInt(limitRow?.value ?? '30', 10)
  const used = presence?.break_minutes_used ?? 0

  if (used >= limit) {
    return NextResponse.json({ error: `Limite de pause atteinte (${limit} min)` }, { status: 400 })
  }

  let update = supabase
    .from('presences')
    .update({
      break_start: breakStart,
      break_end: null,
      updated_at: breakStart,
    })
    .eq('id', presence.id).eq('employee_id', userId).eq('establishment_id', establishmentId)
    .is('clock_out', null)
  update = presence.break_end ? update.eq('break_end', presence.break_end) : update.is('break_start', null)
  const { data, error } = await update.select().maybeSingle()

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Pause déjà modifiée' }, { status: 409 })
  return NextResponse.json(data)
}
