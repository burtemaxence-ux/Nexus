import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase.from('settings').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.key] = row.value
  return NextResponse.json(map)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, establishment_id').eq('id', user.id).single()
  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json()
  const updates: { establishment_id: string; key: string; value: string; updated_at: string }[] = []

  for (const [key, value] of Object.entries(body)) {
    updates.push({ establishment_id: profile!.establishment_id!, key, value: String(value), updated_at: new Date().toISOString() })
  }

  const { error } = await supabase.from('settings').upsert(updates, { onConflict: 'establishment_id,key' })
  if (error) return NextResponse.json({ error: 'Erreur lors de la sauvegarde des paramètres' }, { status: 500 })
  return NextResponse.json({ success: true })
}
