import { supabaseAdmin } from '@/lib/supabase/admin'
import { clockIdentity } from '@/lib/presences/clock'
import { NextResponse } from 'next/server'

export async function POST() {
  const identity = await clockIdentity()
  if (!identity) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { userId, establishmentId } = identity
  const supabase = supabaseAdmin

  const breakEnd = new Date().toISOString()

  const { data: presence, error: presenceError } = await supabase
    .from('presences')
    .select('id, break_start, break_minutes_used')
    .eq('employee_id', userId).eq('establishment_id', establishmentId)
    .is('clock_out', null).not('clock_in', 'is', null)
    .not('break_start', 'is', null).is('break_end', null)
    .order('clock_in', { ascending: false }).limit(1).maybeSingle()

  if (presenceError) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  if (!presence?.break_start) return NextResponse.json({ error: 'Aucune pause en cours' }, { status: 409 })

  const currentBreakMinutes = Math.max(0, Math.floor((new Date(breakEnd).getTime() - new Date(presence.break_start).getTime()) / 60000))

  const { data, error } = await supabase
    .from('presences')
    .update({
      break_end: breakEnd,
      break_minutes_used: (presence.break_minutes_used ?? 0) + currentBreakMinutes,
      updated_at: breakEnd,
    })
    .eq('id', presence.id).eq('employee_id', userId).eq('establishment_id', establishmentId)
    .is('clock_out', null).is('break_end', null).eq('break_start', presence.break_start)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Pause déjà terminée' }, { status: 409 })
  return NextResponse.json(data)
}
