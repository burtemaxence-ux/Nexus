import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Most recent still-open clock-in, regardless of date: an employee who
  // forgot to clock out (or worked an overnight shift) has their open
  // presence on a previous day, so filtering on `today` would wrongly 404.
  const { data: presence, error: fetchError } = await supabase
    .from('presences')
    .select('id, clock_in')
    .eq('employee_id', user.id)
    .is('clock_out', null)
    .not('clock_in', 'is', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError || !presence) {
    return NextResponse.json({ error: 'Aucun pointage actif trouvé' }, { status: 404 })
  }

  const clockOutTime = new Date()
  const clockInTime = new Date(presence.clock_in)

  if (clockOutTime <= clockInTime) {
    return NextResponse.json(
      { error: 'L\'heure de départ ne peut pas être antérieure à l\'arrivée' },
      { status: 400 }
    )
  }

  // An elapsed time beyond ~16h almost always means a forgotten clock-out.
  // Record it but flag for manager review rather than trusting the duration.
  const durationHours = (clockOutTime.getTime() - clockInTime.getTime()) / 3600000
  const needsReview = durationHours > 16

  const { data, error } = await supabase
    .from('presences')
    .update({
      clock_out: clockOutTime.toISOString(),
      needs_review: needsReview,
      updated_at: new Date().toISOString(),
    })
    .eq('id', presence.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  return NextResponse.json({ ...data, needs_review: needsReview })
}
