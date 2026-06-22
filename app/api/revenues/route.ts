import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/revenues?from=YYYY-MM-DD&to=YYYY-MM-DD → CA journalier de la période
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    await requireManager(supabase)

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (!from || !to) return NextResponse.json({ error: 'from/to requis' }, { status: 400 })

    const { data, error } = await supabase
      .from('revenues')
      .select('date, amount')
      .gte('date', from)
      .lte('date', to)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}

// POST /api/revenues  body: { entries: [{ date, amount }] } → upsert par jour
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)
    const estId = profile.active_establishment_id ?? profile.establishment_id
    if (!estId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })

    const body = await request.json()
    const entries: { date: string; amount: number }[] = Array.isArray(body?.entries) ? body.entries : []
    if (entries.length === 0) return NextResponse.json({ success: true })

    const rows = entries
      .filter(e => e.date)
      .map(e => ({
        establishment_id: estId,
        date: e.date,
        amount: Number.isFinite(e.amount) ? e.amount : 0,
        updated_at: new Date().toISOString(),
      }))

    const { error } = await supabase
      .from('revenues')
      .upsert(rows, { onConflict: 'establishment_id,date' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
