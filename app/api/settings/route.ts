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
    const updates: { establishment_id: string; key: string; value: string; updated_at: string }[] = []

    for (const [key, value] of Object.entries(body)) {
      updates.push({ establishment_id: estId, key, value: String(value), updated_at: new Date().toISOString() })
    }

    const { error } = await supabase.from('settings').upsert(updates, { onConflict: 'establishment_id,key' })
    if (error) return NextResponse.json({ error: 'Erreur lors de la sauvegarde des paramètres' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
