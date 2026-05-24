import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)

  let query = supabase
    .from('audit_log')
    .select('id, table_name, record_id, action, old_data, new_data, performed_by, created_at, profiles:performed_by(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (table) query = query.eq('table_name', table)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Erreur lors de la récupération du journal' }, { status: 500 })
  return NextResponse.json(data ?? [])
}
