import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PlanningGrid } from '@/components/planning/planning-grid'
import { PlanningMonth } from '@/components/planning/planning-month'
import { getWeekDates, toISODate } from '@/lib/utils/dates'
import type { Profile, Shift, Poste, WeekStatus, LeaveRequest } from '@/types'

interface PlanningPageProps {
  searchParams: Promise<{ week?: string; view?: string; month?: string }>
}

export default async function PlanningPage({ searchParams }: PlanningPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Resolve searchParams
  const params = await searchParams
  const view = params.view === 'month' ? 'month' : 'week'

  // ── Shared: fetch employees & postes ─────────────────────────────────────
  const { data: employeesData } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, position, created_at')
    .eq('role', 'employee')
    .order('full_name', { ascending: true })

  const employees: Profile[] = (employeesData ?? []) as Profile[]

  const { data: postesData } = await supabase
    .from('postes')
    .select('*')
    .order('name')

  const postes: Poste[] = (postesData ?? []) as Poste[]

  // ── MONTH VIEW ────────────────────────────────────────────────────────────
  if (view === 'month') {
    const monthParam = params.month
    let monthDate: Date
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      monthDate = new Date(monthParam + '-01T00:00:00')
    } else {
      const now = new Date()
      monthDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const firstDay = toISODate(monthDate)
    const lastDay = toISODate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0))

    const { data: shiftsData } = await supabase
      .from('shifts')
      .select('*')
      .gte('date', firstDay)
      .lte('date', lastDay)

    const shifts: Shift[] = (shiftsData ?? []) as Shift[]

    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Link
            href="/manager"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Tableau de bord
          </Link>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Planning</h1>
          <p className="text-gray-500 mt-1 text-sm">Vue mensuelle de votre équipe</p>
        </div>
        <PlanningMonth
          month={monthDate}
          employees={employees}
          shifts={shifts}
          postes={postes}
        />
      </div>
    )
  }

  // ── WEEK VIEW (default) ───────────────────────────────────────────────────
  const weekParam = params.week
  let referenceDate: Date
  if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    referenceDate = new Date(weekParam + 'T00:00:00')
  } else {
    referenceDate = new Date()
  }

  const weekDates = getWeekDates(referenceDate)
  const monday = weekDates[0]
  const sunday = weekDates[6]
  const mondayStr = toISODate(monday)
  const sundayStr = toISODate(sunday)

  const [{ data: shiftsData, error: shiftsError }, { data: leaveData }] = await Promise.all([
    supabase.from('shifts').select('*').gte('date', mondayStr).lte('date', sundayStr),
    supabase.from('leave_requests').select('*')
      .eq('status', 'approved')
      .lte('start_date', sundayStr)
      .gte('end_date', mondayStr),
  ])

  if (shiftsError) console.error('Error fetching shifts:', shiftsError)
  const shifts: Shift[] = (shiftsData ?? []) as Shift[]
  const leaveRequests: LeaveRequest[] = (leaveData ?? []) as LeaveRequest[]

  const { data: weekStatusData } = await supabase
    .from('week_status')
    .select('*')
    .eq('week_monday', mondayStr)
    .single()

  const weekStatus: WeekStatus = weekStatusData ?? {
    week_monday: mondayStr,
    published: false,
    locked: false,
    published_at: null,
    locked_at: null,
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <Link
          href="/manager"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Tableau de bord
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Planning</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Visualisez et gérez le planning hebdomadaire de votre équipe
        </p>
      </div>
      <PlanningGrid
        weekDates={weekDates}
        employees={employees}
        shifts={shifts}
        leaveRequests={leaveRequests}
        weekLocked={weekStatus.locked}
        weekPublished={weekStatus.published}
        postes={postes}
      />
    </div>
  )
}
