import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireManager } from '@/lib/api-auth'

export async function GET() {
  try {
    const supabase = await createClient()
    const { profile } = await requireAuth(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''

    let query = supabase.from('postes').select('*').order('name')
    if (estId) query = query.eq('establishment_id', estId) as typeof query

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''

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

    const { name, color, break_minutes, hourly_cost, max_hours_per_day, max_hours_per_week } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('postes')
      .insert({
        name: name.trim(),
        color: color ?? '#3B82F6',
        break_minutes: break_minutes ?? 0,
        hourly_cost: hourly_cost ?? 0,
        max_hours_per_day: max_hours_per_day ?? 0,
        max_hours_per_week: max_hours_per_week ?? 0,
        establishment_id: estId || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
