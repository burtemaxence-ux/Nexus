import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push'

// POST — manager rejects the exchange
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { note } = await req.json().catch(() => ({})) as { note?: string }

  const { data: exchange } = await supabase
    .from('shift_exchanges')
    .select('id, shift_id, proposer_id, acceptor_id, status, shift:shifts ( date )')
    .eq('id', params.id)
    .single()

  if (!exchange) return NextResponse.json({ error: 'Échange introuvable' }, { status: 404 })
  if (exchange.status !== 'pending_approval') return NextResponse.json({ error: 'Statut invalide' }, { status: 409 })

  const { data, error } = await supabase
    .from('shift_exchanges')
    .update({ status: 'rejected', manager_note: note ?? null, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  const shift = Array.isArray(exchange.shift) ? exchange.shift[0] : exchange.shift as { date: string } | null
  const dateFmt = shift ? new Date(shift.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }) : ''

  // Notify both employees
  sendPushToUser(supabase, exchange.proposer_id, {
    title: 'Échange refusé',
    body:  `L'échange de votre shift du ${dateFmt} a été refusé.`,
    url:   '/employee/echanges',
  }).catch(() => {})
  if (exchange.acceptor_id) {
    sendPushToUser(supabase, exchange.acceptor_id, {
      title: 'Échange refusé',
      body:  `L'échange du shift du ${dateFmt} n'a pas été validé.`,
      url:   '/employee/echanges',
    }).catch(() => {})
  }

  return NextResponse.json(data)
}
