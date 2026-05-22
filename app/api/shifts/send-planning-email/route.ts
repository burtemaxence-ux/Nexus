import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendPlanningPublishedEmails } from '@/lib/email/planning-email'
import { getWeekDates, getWeekLabel, toISODate, addDays } from '@/lib/utils/dates'
import type { Profile, Shift } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json()
  const { week_monday } = body as { week_monday: string }
  if (!week_monday) return NextResponse.json({ error: 'week_monday requis' }, { status: 400 })

  const sunday = toISODate(addDays(new Date(week_monday + 'T00:00:00'), 6))
  const weekLabel = getWeekLabel(getWeekDates(new Date(week_monday + 'T00:00:00')))

  const [{ data: shifts }, { data: employees }] = await Promise.all([
    supabase.from('shifts').select('*').gte('date', week_monday).lte('date', sunday),
    supabase.from('profiles').select('id, email, full_name, role, position, contract_type, weekly_hours, created_at').eq('role', 'employee'),
  ])

  const result = await sendPlanningPublishedEmails({
    employees: (employees ?? []) as Profile[],
    shifts: (shifts ?? []) as Shift[],
    weekLabel,
  })

  return NextResponse.json({ ...result, weekLabel })
}
