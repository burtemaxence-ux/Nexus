import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const { data: presence, error: fetchError } = await supabase
    .from('presences')
    .select('clock_in')
    .eq('employee_id', user.id)
    .eq('date', today)
    .is('clock_out', null)
    .single()

  if (fetchError || !presence) {
    return NextResponse.json({ error: 'Aucun pointage actif trouvé' }, { status: 404 })
  }

  const clockOutTime = new Date()
  const clockInTime = new Date(presence.clock_in)

  if (clockOutTime <= clockInTime) {
    return NextResponse.json(
      { error: 'L\'heure de départ ne peut pas être antérieure à l\'arrivée' },
      { status: 400 }
    )
  }

  const durationHours = (clockOutTime.getTime() - clockInTime.getTime()) / 3600000
  if (durationHours > 14) {
    console.warn(`[ClockOut] Shift unusually long: ${durationHours.toFixed(1)}h for user ${user.id}`)
  }

  const { data, error } = await supabase
    .from('presences')
    .update({ clock_out: clockOutTime.toISOString(), updated_at: new Date().toISOString() })
    .eq('employee_id', user.id)
    .eq('date', today)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
