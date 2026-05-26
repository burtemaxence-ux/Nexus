import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push'

// POST — employee accepts an open exchange offer
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: exchange } = await supabase
    .from('shift_exchanges')
    .select(`
      id, status, proposer_id, shift_id,
      shift:shifts ( date, start_time, end_time, position )
    `)
    .eq('id', params.id)
    .single()

  if (!exchange) return NextResponse.json({ error: 'Échange introuvable' }, { status: 404 })
  if (exchange.status !== 'open') return NextResponse.json({ error: 'Échange non disponible' }, { status: 409 })
  if (exchange.proposer_id === user.id) return NextResponse.json({ error: 'Vous ne pouvez pas accepter votre propre offre' }, { status: 400 })

  const shift = Array.isArray(exchange.shift) ? exchange.shift[0] : exchange.shift as { date: string; start_time: string; end_time: string; position: string | null } | null
  if (!shift) return NextResponse.json({ error: 'Shift introuvable' }, { status: 404 })

  // Check acceptor has no conflicting shift on the same date
  const { data: conflict } = await supabase
    .from('shifts')
    .select('id')
    .eq('employee_id', user.id)
    .eq('date', shift.date)
    .neq('id', exchange.shift_id)
    .maybeSingle()

  if (conflict) return NextResponse.json({ error: 'Vous avez déjà un shift ce jour-là' }, { status: 409 })

  const { data, error } = await supabase
    .from('shift_exchanges')
    .update({ acceptor_id: user.id, status: 'pending_approval', updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the proposer
  const dateFmt = new Date(shift.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
  sendPushToUser(supabase, exchange.proposer_id, {
    title: 'Échange accepté — en attente du manager',
    body:  `Quelqu'un veut reprendre votre shift du ${dateFmt}. En attente de validation.`,
    url:   '/employee/echanges',
  }).catch(() => {})

  return NextResponse.json(data)
}
