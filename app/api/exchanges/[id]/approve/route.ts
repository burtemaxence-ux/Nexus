import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push'
import { fireWebhook } from '@/lib/integrations/webhook'

// POST — manager approves the exchange (transfers the shift)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, establishment_id, active_establishment_id').eq('id', user.id).single()
  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { note } = await req.json().catch(() => ({})) as { note?: string }

  const { data: exchange } = await supabase
    .from('shift_exchanges')
    .select(`
      id, shift_id, proposer_id, acceptor_id, status,
      shift:shifts ( date, start_time, end_time, position )
    `)
    .eq('id', params.id)
    .single()

  if (!exchange) return NextResponse.json({ error: 'Échange introuvable' }, { status: 404 })
  if (exchange.status !== 'pending_approval') return NextResponse.json({ error: 'Statut invalide' }, { status: 409 })
  if (!exchange.acceptor_id) return NextResponse.json({ error: 'Aucun accepteur' }, { status: 400 })

  // Transfer the shift to the acceptor
  const { error: shiftError } = await supabase
    .from('shifts')
    .update({ employee_id: exchange.acceptor_id, updated_at: new Date().toISOString() })
    .eq('id', exchange.shift_id)

  if (shiftError) return NextResponse.json({ error: shiftError.message }, { status: 500 })

  // Mark exchange as approved
  const { data, error } = await supabase
    .from('shift_exchanges')
    .update({ status: 'approved', manager_note: note ?? null, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const shift = Array.isArray(exchange.shift) ? exchange.shift[0] : exchange.shift as { date: string } | null
  const dateFmt = shift ? new Date(shift.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }) : ''

  // Notify both employees
  sendPushToUser(supabase, exchange.proposer_id, {
    title: 'Échange approuvé ✅',
    body:  `L'échange de votre shift du ${dateFmt} a été approuvé.`,
    url:   '/employee/echanges',
  }).catch(() => {})
  sendPushToUser(supabase, exchange.acceptor_id, {
    title: 'Shift transféré ✅',
    body:  `Le shift du ${dateFmt} vous a été attribué.`,
    url:   '/employee/planning',
  }).catch(() => {})

  // Fire exchange.approved webhook (non-blocking)
  const establishmentId = profile?.active_establishment_id ?? profile?.establishment_id
  if (establishmentId) {
    const shiftRow = Array.isArray(exchange.shift) ? exchange.shift[0] : exchange.shift as { date: string; start_time: string; end_time: string } | null
    supabase.from('settings').select('key, value').then(({ data: settings }) => {
      const settingsMap = Object.fromEntries((settings ?? []).map((s: { key: string; value: string }) => [s.key, s.value]))
      Promise.all([
        supabase.from('profiles').select('full_name').eq('id', exchange.proposer_id).single(),
        supabase.from('profiles').select('full_name').eq('id', exchange.acceptor_id!).single(),
      ]).then(([{ data: proposer }, { data: acceptor }]) => {
        void fireWebhook(settingsMap, 'exchange.approved', {
          proposerName: proposer?.full_name ?? exchange.proposer_id,
          acceptorName: acceptor?.full_name ?? exchange.acceptor_id,
          date: shiftRow?.date ?? '',
          startTime: shiftRow?.start_time ?? '',
          endTime: shiftRow?.end_time ?? '',
        }, { establishmentId })
      })
    })
  }

  return NextResponse.json(data)
}
