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

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, position, contract_type, weekly_hours, phone')
    .eq('establishment_id', auth.establishmentId)
    .eq('role', 'employee')
    .eq('archived', false)
    .order('full_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], count: data?.length ?? 0 })
}
