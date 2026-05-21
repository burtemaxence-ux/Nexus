import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00')
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
    const { from_monday } = body as { from_monday: string }

    if (!from_monday || !/^\d{4}-\d{2}-\d{2}$/.test(from_monday)) {
      return NextResponse.json(
        { error: 'from_monday est requis au format YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Compute from/to ranges
    const fromSunday = addDays(from_monday, 6)
    const toMonday = addDays(from_monday, 7)
    const toSunday = addDays(from_monday, 13)

    // Check if there are already shifts in the target week
    const { data: existingShifts, error: checkError } = await supabase
      .from('shifts')
      .select('id')
      .gte('date', toMonday)
      .lte('date', toSunday)
      .limit(1)

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existingShifts && existingShifts.length > 0) {
      return NextResponse.json(
        { error: 'Des créneaux existent déjà pour la semaine cible' },
        { status: 409 }
      )
    }

    // Fetch all shifts from the source week
    const { data: sourceShifts, error: fetchError } = await supabase
      .from('shifts')
      .select('*')
      .gte('date', from_monday)
      .lte('date', fromSunday)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!sourceShifts || sourceShifts.length === 0) {
      return NextResponse.json(
        { error: 'Aucun créneau trouvé pour la semaine source' },
        { status: 404 }
      )
    }

    // Build new shifts with dates incremented by 7 days
    const newShifts = sourceShifts.map((shift) => ({
      employee_id: shift.employee_id,
      date: addDays(shift.date, 7),
      start_time: shift.start_time,
      end_time: shift.end_time,
      position: shift.position,
      notes: shift.notes,
      status: 'draft' as const,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('shifts')
      .insert(newShifts)
      .select()

    if (insertError) {
      console.error('[copy-week POST] error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ copied: inserted?.length ?? 0 }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[copy-week POST] exception:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
