import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('postes')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()

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
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
