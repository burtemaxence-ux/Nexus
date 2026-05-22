import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('presences')
    .update({ clock_out: now, updated_at: now })
    .eq('employee_id', user.id)
    .eq('date', today)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
