import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireManager } from '@/lib/api-auth'
import { resendWebhook } from '@/lib/integrations/webhook'
import { NextResponse } from 'next/server'

// Replay a previously logged webhook delivery to its original destination.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
    if (!estId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })

    const { data: log } = await supabaseAdmin
      .from('webhook_logs')
      .select('id, establishment_id, event, target, url, payload')
      .eq('id', id)
      .eq('establishment_id', estId)
      .single()

    if (!log) return NextResponse.json({ error: 'Livraison introuvable' }, { status: 404 })
    if (!log.payload) return NextResponse.json({ error: 'Aucun contenu à renvoyer pour cette livraison' }, { status: 400 })

    // Re-sign generic webhooks with the current secret.
    const { data: settingsData } = await supabase
      .from('settings')
      .select('value')
      .eq('establishment_id', estId)
      .eq('key', 'webhook_signing_secret')
      .maybeSingle()

    const result = await resendWebhook({
      url: log.url,
      body: log.payload,
      event: log.event,
      target: log.target === 'slack' ? 'slack' : 'webhook',
      establishmentId: estId,
      signingSecret: settingsData?.value || undefined,
    })

    return NextResponse.json({ ok: result.ok, status: result.statusCode ?? undefined })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
