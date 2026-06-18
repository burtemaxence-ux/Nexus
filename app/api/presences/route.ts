import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, establishment_id, active_establishment_id').eq('id', user.id).single()
  const today = new Date().toISOString().slice(0, 10)
  const { searchParams } = new URL(request.url)

  if (profile?.role === 'manager' || profile?.role === 'supervisor') {
    const from = searchParams.get('from') ?? today
    const to = searchParams.get('to') ?? today
    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''

    // Scoping établissement explicite (défense en profondeur : ne pas dépendre
    // uniquement de la RLS pour l'isolation inter-tenant).
    let query = supabase
      .from('presences')
      .select('id, employee_id, date, clock_in, clock_out, break_start, break_end, break_minutes_used, needs_review')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .order('clock_in', { ascending: true, nullsFirst: false })
    if (estId) query = query.eq('establishment_id', estId) as typeof query

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Erreur lors du chargement des pointages' }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  // Employee: own presence for today only
  const { data, error } = await supabase
    .from('presences')
    .select('*')
    .eq('employee_id', user.id)
    .eq('date', today)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  return NextResponse.json(data)
}
