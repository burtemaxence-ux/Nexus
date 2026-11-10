import { createClient } from '@/lib/supabase/server'
import { parisDate } from '@/lib/presences/date'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, establishment_id, active_establishment_id').eq('id', user.id).single()
  const today = parisDate(new Date())
  const { searchParams } = new URL(request.url)

  if (profile?.role === 'manager' || profile?.role === 'supervisor') {
    const from = searchParams.get('from') ?? today
    const to = searchParams.get('to') ?? today
    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''

    // Scoping établissement explicite (défense en profondeur : ne pas dépendre
    // uniquement de la RLS pour l'isolation inter-tenant).
    let query = supabase
      .from('presences')
      .select('id, employee_id, date, clock_in, clock_out, break_start, break_end, break_minutes_used, needs_review, updated_at')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .order('clock_in', { ascending: true, nullsFirst: false })
    if (estId) query = query.eq('establishment_id', estId) as typeof query

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Erreur lors du chargement des pointages' }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  // Reprendre d'abord le pointage ouvert, y compris un service de nuit.
  const { data: open, error: openError } = await supabase
    .from('presences').select('*').eq('employee_id', user.id)
    .is('clock_out', null).not('clock_in', 'is', null)
    .order('clock_in', { ascending: false }).limit(1).maybeSingle()
  if (openError) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  if (open) return NextResponse.json(open)

  // Employee: own completed presence for the local day.
  const { data, error } = await supabase
    .from('presences')
    .select('*')
    .eq('employee_id', user.id)
    .eq('date', today)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  return NextResponse.json(data)
}
