import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export type EstablishmentMetrics = {
  id: string
  name: string
  role: string
  employee_count: number
  week_shifts: number
  pending_leaves: number
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: memberships } = await supabaseAdmin
    .from('user_establishments')
    .select('establishment_id, role, establishments(id, name)')
    .eq('user_id', user.id)

  if (!memberships?.length) return NextResponse.json([])

  const today = new Date()
  const dow = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - dow + 1)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const weekStart = monday.toISOString().split('T')[0]
  const weekEnd = sunday.toISOString().split('T')[0]

  type MembershipRow = {
    establishment_id: string
    role: string
    establishments: { id: string; name: string } | { id: string; name: string }[] | null
  }

  const results: EstablishmentMetrics[] = await Promise.all(
    (memberships as MembershipRow[]).map(async (row) => {
      const est = Array.isArray(row.establishments) ? row.establishments[0] : row.establishments
      const eid = row.establishment_id

      const [
        { count: employeeCount },
        { count: weekShifts },
        { count: pendingLeaves },
      ] = await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('establishment_id', eid)
          .eq('role', 'employee')
          .eq('archived', false),
        supabaseAdmin
          .from('shifts')
          .select('id', { count: 'exact', head: true })
          .eq('establishment_id', eid)
          .gte('date', weekStart)
          .lte('date', weekEnd)
          .is('deleted_at', null),
        supabaseAdmin
          .from('leave_requests')
          .select('id', { count: 'exact', head: true })
          .eq('establishment_id', eid)
          .eq('status', 'pending'),
      ])

      return {
        id: eid,
        name: est?.name ?? 'Établissement',
        role: row.role,
        employee_count: employeeCount ?? 0,
        week_shifts: weekShifts ?? 0,
        pending_leaves: pendingLeaves ?? 0,
      }
    })
  )

  return NextResponse.json(results)
}
