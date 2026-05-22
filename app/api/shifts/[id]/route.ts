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

  if (profileError || !profile || profile.role !== 'manager') {
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
    const { start_time, end_time, position, notes } = body as {
      start_time?: string
      end_time?: string
      position?: string
      notes?: string
    }

    const updateData: Record<string, string | null> = {}
    if (start_time !== undefined) updateData.start_time = start_time
    if (end_time !== undefined) updateData.end_time = end_time
    if (position !== undefined) updateData.position = position
    if (notes !== undefined) updateData.notes = notes || null

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

    const { error } = await supabase.from('shifts').delete().eq('id', id)

    if (error) {
      console.error('[shifts DELETE] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[shifts DELETE] exception:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
