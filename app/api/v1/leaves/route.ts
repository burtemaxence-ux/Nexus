import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateApiToken } from '@/lib/api-token'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = await validateApiToken(req.headers.get('authorization'))
  if (!auth) {
    return NextResponse.json({ error: 'Token invalide ou manquant' }, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer realm="Quartzbase API"' },
    })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // 'pending', 'approved', 'rejected'
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabaseAdmin
    .from('leave_requests')
    .select('id, employee_id, type, start_date, end_date, status, notes, created_at')
    .eq('establishment_id', auth.establishmentId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (status) query = query.eq('status', status)
  if (from) query = query.gte('start_date', from)
  if (to) query = query.lte('end_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  return NextResponse.json({ data: data ?? [], count: data?.length ?? 0 })
}
