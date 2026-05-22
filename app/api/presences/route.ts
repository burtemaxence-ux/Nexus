import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — today's presences (all for manager, own for employee)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const today = new Date().toISOString().slice(0, 10)

  if (profile?.role === 'manager') {
    const { data, error } = await supabase
      .from('presences')
      .select('*, profiles:employee_id(id, full_name, email, position)')
      .eq('date', today)
      .order('clock_in', { ascending: true, nullsFirst: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  const { data, error } = await supabase
    .from('presences')
    .select('*')
    .eq('employee_id', user.id)
    .eq('date', today)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
