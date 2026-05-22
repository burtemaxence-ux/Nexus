import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH — manager approuve / refuse  OU  employé annule
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const body = await request.json()

  if (profile?.role === 'manager') {
    const { status, manager_comment } = body
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status doit être approved ou rejected' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('leave_requests')
      .update({ status, manager_comment: manager_comment || null, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
}

// DELETE — employé annule sa propre demande en attente
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { error } = await supabase
    .from('leave_requests')
    .delete()
    .eq('id', params.id)
    .eq('employee_id', user.id)
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
