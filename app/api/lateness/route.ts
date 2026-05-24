import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const employeeId = searchParams.get('employee_id')
  const justifiedFilter = searchParams.get('justified') // 'true' | 'false' | null

  let query = supabase
    .from('lateness_records')
    .select('*, profiles:employee_id(id, full_name, email, position)')
    .order('date', { ascending: false })

  if (profile?.role === 'employee') {
    query = query.eq('employee_id', user.id)
  } else if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }

  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)
  if (justifiedFilter === 'true') query = query.eq('justified', true)
  if (justifiedFilter === 'false') query = query.eq('justified', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
