import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const breakStart = body.time ?? new Date().toISOString()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('presences')
    .update({ break_start: breakStart, updated_at: new Date().toISOString() })
    .eq('employee_id', user.id)
    .eq('date', today)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
