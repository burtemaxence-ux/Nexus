import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

// Generate (or rotate) the per-establishment HMAC signing secret used to sign
// outgoing generic webhook deliveries (header X-Quartzbase-Signature).
export async function POST() {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
    if (!estId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })

    const secret = 'whsec_' + randomBytes(24).toString('hex')

    const { error } = await supabase.from('settings').upsert(
      { establishment_id: estId, key: 'webhook_signing_secret', value: secret, updated_at: new Date().toISOString() },
      { onConflict: 'establishment_id,key' },
    )
    if (error) return NextResponse.json({ error: 'Erreur lors de la génération du secret' }, { status: 500 })

    return NextResponse.json({ secret })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
