import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// DELETE — proposer cancels their open exchange offer
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: exchange } = await supabase
    .from('shift_exchanges')
    .select('proposer_id, status')
    .eq('id', params.id)
    .single()

  if (!exchange) return NextResponse.json({ error: 'Échange introuvable' }, { status: 404 })
  if (exchange.proposer_id !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  if (exchange.status !== 'open') return NextResponse.json({ error: 'Seule une offre ouverte peut être annulée' }, { status: 409 })

  const { error } = await supabase
    .from('shift_exchanges')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
