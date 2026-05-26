import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateApiToken } from '@/lib/api-token'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = await validateApiToken(req.headers.get('authorization'))
  if (!auth) {
    return NextResponse.json({ error: 'Token invalide ou manquant' }, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer realm="Nexus API"' },
    })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const employeeId = searchParams.get('employee_id')

  let query = supabaseAdmin
    .from('shifts')
    .select('id, employee_id, date, start_time, end_time, break_minutes, position, notes, status')
    .eq('establishment_id', auth.establishmentId)
    .is('deleted_at', null)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(500)

  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)
  if (employeeId) query = query.eq('employee_id', employeeId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], count: data?.length ?? 0 })
}
