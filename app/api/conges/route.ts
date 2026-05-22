import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET — employé : ses propres demandes / manager : toutes
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  let query = supabase
    .from('leave_requests')
    .select('*, profiles(id, full_name, email, position)')
    .order('created_at', { ascending: false })

  if (profile?.role !== 'manager') {
    query = query.eq('employee_id', user.id) as typeof query
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — l'employé crée une demande
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const { start_date, end_date, type, comment } = body

  if (!start_date || !end_date || !type) {
    return NextResponse.json({ error: 'start_date, end_date et type sont requis' }, { status: 400 })
  }

  if (new Date(end_date) < new Date(start_date)) {
    return NextResponse.json({ error: 'La date de fin doit être après la date de début' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .insert({ employee_id: user.id, start_date, end_date, type, comment: comment || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
