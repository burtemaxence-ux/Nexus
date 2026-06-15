import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { PlanningClientWrapper } from './planning-client'
import { PlanningMonth } from '@/components/planning/planning-month'
import { PlanningDay } from '@/components/planning/planning-day'
import { getWeekDates, toISODate } from '@/lib/utils/dates'
import type { Profile, Shift, Poste, WeekStatus, LeaveRequest } from '@/types'

interface PlanningPageProps {
  searchParams: Promise<{ week?: string; view?: string; month?: string; date?: string }>
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
  const view = params.view === 'month' ? 'month' : params.view === 'day' ? 'day' : 'week'

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
      <div className="px-6 py-6 max-w-6xl mx-auto">
        <h1 className="text-[20px] font-medium tracking-[-0.02em] mb-5" style={{ color: 'var(--text-primary)' }}>
          Planning
        </h1>
        <PlanningMonth
          month={monthDate}
          employees={employees}
          shifts={shifts}
          postes={postes}
        />
      </div>
    )
  }

  // ── DAY VIEW ─────────────────────────────────────────────────────────────────
  if (view === 'day') {
    const dateParam = params.date
    let dayDate: Date
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      dayDate = new Date(dateParam + 'T00:00:00')
    } else {
      dayDate = new Date()
    }
    const dayStr = toISODate(dayDate)

    // Get monday of this week for week_status
    const d = new Date(dayDate)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    const mondayStr = toISODate(d)

    const [{ data: shiftsData }, { data: leaveData }, { data: weekStatusData }] = await Promise.all([
      supabase.from('shifts').select('*').eq('date', dayStr),
      supabase.from('leave_requests').select('*').eq('status', 'approved').lte('start_date', dayStr).gte('end_date', dayStr),
      supabase.from('week_status').select('*').eq('week_monday', mondayStr).single(),
    ])

    const dayShifts: Shift[] = (shiftsData ?? []) as Shift[]
    const dayLeaves: LeaveRequest[] = (leaveData ?? []) as LeaveRequest[]
    const weekStatus: WeekStatus = weekStatusData ?? { week_monday: mondayStr, published: false, locked: false, published_at: null, locked_at: null }

    return (
      <div className="px-6 py-6 max-w-6xl mx-auto">
        <h1 className="text-[20px] font-medium tracking-[-0.02em] mb-5" style={{ color: 'var(--text-primary)' }}>
          Planning
        </h1>
        <PlanningDay
          date={dayDate}
          employees={employees}
          shifts={dayShifts}
          leaveRequests={dayLeaves}
          weekLocked={weekStatus.locked}
          weekPublished={weekStatus.published}
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

  const [{ data: shiftsData, error: shiftsError }, { data: leaveData }, { data: contractsData }] = await Promise.all([
    supabase.from('shifts').select('*').gte('date', mondayStr).lte('date', sundayStr),
    supabase.from('leave_requests').select('*')
      .eq('status', 'approved')
      .lte('start_date', sundayStr)
      .gte('end_date', mondayStr),
    supabase.from('contracts')
      .select('employee_id, hourly_rate, start_date')
      .not('hourly_rate', 'is', null)
      .order('start_date', { ascending: false }),
  ])

  if (shiftsError) console.error('Error fetching shifts:', shiftsError)
  const shifts: Shift[] = (shiftsData ?? []) as Shift[]
  const leaveRequests: LeaveRequest[] = (leaveData ?? []) as LeaveRequest[]

  // Taux horaire brut le plus récent par employé (RLS limite aux contrats de l'établissement).
  const hourlyRateMap: Record<string, number> = {}
  for (const c of (contractsData ?? []) as { employee_id: string; hourly_rate: number | null }[]) {
    if (c.hourly_rate != null && hourlyRateMap[c.employee_id] === undefined) {
      hourlyRateMap[c.employee_id] = Number(c.hourly_rate)
    }
  }

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
    <div className="px-4 py-4 md:px-6 md:py-6">
      <h1 className="text-[18px] md:text-[20px] font-medium tracking-[-0.02em] mb-4 md:mb-5" style={{ color: 'var(--text-primary)' }}>
        Planning
      </h1>
      <ErrorBoundary>
        <PlanningClientWrapper
          weekDates={weekDates}
          employees={employees}
          shifts={shifts}
          leaveRequests={leaveRequests}
          weekLocked={weekStatus.locked}
          weekPublished={weekStatus.published}
          postes={postes}
          hourlyRateMap={hourlyRateMap}
        />
      </ErrorBoundary>
    </div>
  )
}
