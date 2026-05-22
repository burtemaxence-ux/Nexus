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
    .upsert(
      { employee_id: user.id, date: today, clock_in: now, updated_at: now },
      { onConflict: 'employee_id,date', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
