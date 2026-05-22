import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const breakEnd = body.time ?? new Date().toISOString()
  const today = new Date().toISOString().slice(0, 10)

  // Récupère la pause en cours pour calculer la durée
  const { data: presence } = await supabase
    .from('presences')
    .select('break_start, break_minutes_used')
    .eq('employee_id', user.id)
    .eq('date', today)
    .single()

  const currentBreakMinutes = presence?.break_start
    ? Math.max(0, Math.floor((new Date(breakEnd).getTime() - new Date(presence.break_start).getTime()) / 60000))
    : 0

  const { data, error } = await supabase
    .from('presences')
    .update({
      break_end: breakEnd,
      break_minutes_used: (presence?.break_minutes_used ?? 0) + currentBreakMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq('employee_id', user.id)
    .eq('date', today)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
