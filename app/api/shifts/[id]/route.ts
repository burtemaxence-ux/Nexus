import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getManagerUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, error: 'Non authentifié', status: 401 }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !['manager', 'supervisor'].includes(profile.role)) {
    return { user: null, error: 'Accès refusé', status: 403 }
  }

  return { user, error: null, status: 200 }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { user, error: authError, status: authStatus } = await getManagerUser(supabase)

    if (!user) {
      return NextResponse.json({ error: authError }, { status: authStatus })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID du créneau requis' }, { status: 400 })
    }

    const body = await request.json()
    const { start_time, end_time, position, poste_id, break_minutes, notes, employee_id, date } = body as {
      start_time?: string
      end_time?: string
      position?: string
      poste_id?: string | null
      break_minutes?: number
      notes?: string
      employee_id?: string
      date?: string
    }

    const updateData: Record<string, string | number | null> = {}
    if (start_time !== undefined) updateData.start_time = start_time
    if (end_time !== undefined) updateData.end_time = end_time
    if (position !== undefined) updateData.position = position
    if (poste_id !== undefined) updateData.poste_id = poste_id ?? null
    if (break_minutes !== undefined) updateData.break_minutes = break_minutes
    if (notes !== undefined) updateData.notes = notes || null
    if (employee_id !== undefined) updateData.employee_id = employee_id
    if (date !== undefined) updateData.date = date

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    const { error } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('[shifts PATCH] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[shifts PATCH] exception:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { user, error: authError, status: authStatus } = await getManagerUser(supabase)

    if (!user) {
      return NextResponse.json({ error: authError }, { status: authStatus })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID du créneau requis' }, { status: 400 })
    }

    // Soft delete — shift stays in DB for audit trail and lateness references
    const { error } = await supabase
      .from('shifts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) {
      console.error('[shifts DELETE] error:', error)
      return NextResponse.json({ error: 'Erreur lors de la suppression du shift' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[shifts DELETE] exception:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
