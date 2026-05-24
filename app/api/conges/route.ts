import { createClient } from '@/lib/supabase/server'
import { LeaveRequestSchema, validationError } from '@/lib/validations'
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

  const raw = await request.json().catch(() => null)
  const parsed = LeaveRequestSchema.safeParse(raw)
  if (!parsed.success) return validationError(parsed.error)

  const { start_date, end_date, type, comment } = parsed.data

  const { data, error } = await supabase
    .from('leave_requests')
    .insert({ employee_id: user.id, start_date, end_date, type, comment: comment || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Erreur lors de la création de la demande' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
