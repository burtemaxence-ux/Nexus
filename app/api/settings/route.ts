import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireManager } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { profile } = await requireAuth(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''

    let query = supabase.from('settings').select('key, value')
    if (estId) query = query.eq('establishment_id', estId) as typeof query

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const map: Record<string, string> = {}
    for (const row of data ?? []) map[row.key] = row.value
    return NextResponse.json(map)
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
    if (!estId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })

    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    const entries = Object.entries(body as Record<string, unknown>)
    if (entries.length === 0 || entries.length > 50) {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    // Garde-fou anti-injection : clés en snake_case bornées, valeurs scalaires bornées.
    const KEY_RE = /^[a-z0-9_]{1,64}$/
    const updates: { establishment_id: string; key: string; value: string; updated_at: string }[] = []
    for (const [key, value] of entries) {
      if (!KEY_RE.test(key)) {
        return NextResponse.json({ error: `Clé de paramètre invalide : ${key}` }, { status: 400 })
      }
      if (value !== null && typeof value === 'object') {
        return NextResponse.json({ error: 'Valeur de paramètre invalide' }, { status: 400 })
      }
      const str = String(value ?? '')
      if (str.length > 10000) {
        return NextResponse.json({ error: 'Valeur de paramètre trop longue' }, { status: 400 })
      }
      updates.push({ establishment_id: estId, key, value: str, updated_at: new Date().toISOString() })
    }

    const { error } = await supabase.from('settings').upsert(updates, { onConflict: 'establishment_id,key' })
    if (error) return NextResponse.json({ error: 'Erreur lors de la sauvegarde des paramètres' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
