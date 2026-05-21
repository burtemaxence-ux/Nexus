import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Verify the user is a manager
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'manager') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { employee_id, date, start_time, end_time, position, notes } = body as {
      employee_id: string
      date: string
      start_time: string
      end_time: string
      position: string
      notes?: string
    }

    if (!employee_id || !date || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'employee_id, date, start_time et end_time sont requis' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('shifts')
      .insert({
        employee_id,
        date,
        start_time,
        end_time,
        position: position || null,
        notes: notes || null,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('[shifts POST] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ shift: data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[shifts POST] exception:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
