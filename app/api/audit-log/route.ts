import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'

const PAGE_SIZE = 50

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    await requireManager(supabase)

    const { searchParams } = new URL(request.url)
    const table  = searchParams.get('table')
    const action = searchParams.get('action')
    const from   = searchParams.get('from')
    const to     = searchParams.get('to')
    const page   = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))

    let query = supabase
      .from('audit_log')
      .select('id, table_name, record_id, action, old_data, new_data, performed_by, created_at, profiles:performed_by(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (table)  query = query.eq('table_name', table)
    if (action) query = query.eq('action', action)
    if (from)   query = query.gte('created_at', from)
    if (to)     query = query.lte('created_at', to + 'T23:59:59Z')

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: 'Erreur lors de la récupération du journal' }, { status: 500 })

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
