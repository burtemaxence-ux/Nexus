import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { notifyOps } from '@/lib/ops-alert'
import { NextResponse } from 'next/server'

// Renvoie la demande de suppression active de l'établissement, s'il y en a une.
export async function GET() {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)
    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
    if (!estId) return NextResponse.json({ request: null })

    const { data } = await supabase
      .from('deletion_requests')
      .select('status, created_at')
      .eq('establishment_id', estId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ request: data ?? null })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}

// Enregistre une demande de suppression (idempotente) et alerte l'équipe ops.
export async function POST() {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)
    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
    if (!estId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })

    const { data: existing } = await supabase
      .from('deletion_requests')
      .select('status')
      .eq('establishment_id', estId)
      .in('status', ['pending', 'processing'])
      .maybeSingle()
    if (existing) return NextResponse.json({ ok: true, status: existing.status })

    const { data, error } = await supabase
      .from('deletion_requests')
      .insert({ establishment_id: estId, requested_by: profile.id })
      .select('status')
      .single()

    // Course possible avec l'index unique « une demande active » → succès idempotent.
    if (error) return NextResponse.json({ ok: true, status: 'pending' })

    await notifyOps({
      subject: 'Demande de suppression RGPD',
      body: `L'établissement ${estId} a demandé la suppression de ses données (droit à l'effacement, Art. 17 RGPD). Demandeur : ${profile.id}.`,
    }).catch(() => {})

    return NextResponse.json({ ok: true, status: data.status })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
