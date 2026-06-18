import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const SELECT = `
  id, shift_id, proposer_id, acceptor_id, status, proposer_note, manager_note, created_at,
  shift:shifts ( date, start_time, end_time, position, break_minutes ),
  proposer:profiles!proposer_id ( full_name, email ),
  acceptor:profiles!acceptor_id ( full_name, email )
`

// GET — list exchanges
// Employee: their own offers + all open offers from others
// Manager/supervisor: all pending_approval
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isManager = ['manager', 'supervisor'].includes(profile?.role ?? '')

  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view') // 'mine' | 'available' | 'pending' (manager)

  let query = supabase.from('shift_exchanges').select(SELECT)

  if (isManager && view === 'pending') {
    query = query.eq('status', 'pending_approval')
  } else if (view === 'available') {
    // Open exchanges proposed by others (not me)
    query = query.eq('status', 'open').neq('proposer_id', user.id)
  } else {
    // My exchanges (as proposer or acceptor)
    query = query.or(`proposer_id.eq.${user.id},acceptor_id.eq.${user.id}`)
      .in('status', ['open', 'pending_approval'])
  }

  query = query.order('created_at', { ascending: false })
  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — propose a shift for exchange
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { shift_id, note } = await req.json() as { shift_id: string; note?: string }
  if (!shift_id) return NextResponse.json({ error: 'shift_id requis' }, { status: 400 })

  // Verify the shift belongs to the requesting employee and is in the future
  const { data: shift } = await supabase
    .from('shifts')
    .select('id, date, employee_id')
    .eq('id', shift_id)
    .eq('employee_id', user.id)
    .single()

  if (!shift) return NextResponse.json({ error: 'Shift introuvable ou non autorisé' }, { status: 403 })
  if (shift.date < new Date().toISOString().slice(0, 10)) {
    return NextResponse.json({ error: 'Impossible de proposer un shift passé' }, { status: 400 })
  }

  // Check no open exchange already exists for this shift
  const { data: existing } = await supabase
    .from('shift_exchanges')
    .select('id')
    .eq('shift_id', shift_id)
    .eq('status', 'open')
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Ce shift est déjà proposé à l\'échange' }, { status: 409 })

  const { data, error } = await supabase
    .from('shift_exchanges')
    .insert({ shift_id, proposer_id: user.id, proposer_note: note ?? null })
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
