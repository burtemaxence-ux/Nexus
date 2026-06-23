import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  let estId: string
  try {
    const { profile } = await requireManager(supabase)
    estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
  const { id } = await params

  let body: {
    name?: string
    color?: string
    break_minutes?: number
    hourly_cost?: number
    max_hours_per_day?: number
    max_hours_per_week?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.color !== undefined) updates.color = body.color
  if (body.break_minutes !== undefined) updates.break_minutes = body.break_minutes
  if (body.hourly_cost !== undefined) updates.hourly_cost = body.hourly_cost
  if (body.max_hours_per_day !== undefined) updates.max_hours_per_day = body.max_hours_per_day
  if (body.max_hours_per_week !== undefined) updates.max_hours_per_week = body.max_hours_per_week

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('postes')
    .update(updates)
    .eq('id', id)
    .eq('establishment_id', estId)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Poste introuvable' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  let estId: string
  try {
    const { profile } = await requireManager(supabase)
    estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
  const { id } = await params

  const { data, error } = await supabase
    .from('postes')
    .delete()
    .eq('id', id)
    .eq('establishment_id', estId)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Poste introuvable' }, { status: 404 })
  return NextResponse.json({ success: true })
}
