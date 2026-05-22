import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const breakStart = body.time ?? new Date().toISOString()
  const today = new Date().toISOString().slice(0, 10)

  // Récupère la présence du jour et la limite de pause
  const [{ data: presence }, { data: limitRow }] = await Promise.all([
    supabase.from('presences').select('break_start, break_end, break_minutes_used').eq('employee_id', user.id).eq('date', today).single(),
    supabase.from('settings').select('value').eq('key', 'break_minutes_limit').single(),
  ])

  const limit = parseInt(limitRow?.value ?? '30', 10)
  const used = presence?.break_minutes_used ?? 0

  if (used >= limit) {
    return NextResponse.json({ error: `Limite de pause atteinte (${limit} min)` }, { status: 400 })
  }

  // Si une pause précédente est terminée, on accumule son temps avant d'en démarrer une nouvelle
  let additionalMinutes = 0
  if (presence?.break_start && presence?.break_end) {
    additionalMinutes = Math.max(
      0,
      Math.floor((new Date(presence.break_end).getTime() - new Date(presence.break_start).getTime()) / 60000)
    )
  }

  const { data, error } = await supabase
    .from('presences')
    .update({
      break_start: breakStart,
      break_end: null,
      break_minutes_used: used + additionalMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq('employee_id', user.id)
    .eq('date', today)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
