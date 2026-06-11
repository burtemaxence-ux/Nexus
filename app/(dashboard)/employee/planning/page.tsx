import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { EmployeePlanningGrid } from '@/components/planning/employee-planning-grid'
import { ICalCopyButton } from '@/components/ui/ical-copy-button'
import { generateCalendarToken } from '@/lib/integrations/ical'
import { getWeekDates, toISODate } from '@/lib/utils/dates'
import type { Profile, Shift, Poste, LeaveRequest } from '@/types'

interface EmployeePlanningPageProps {
  searchParams: Promise<{ week?: string }>
}

export default async function EmployeePlanningPage({ searchParams }: EmployeePlanningPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams
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

  // Check if viewing current week
  const currentWeekMonday = toISODate(getWeekDates(new Date())[0])
  const isCurrentWeek = mondayStr === currentWeekMonday

  const reqHeaders = await headers()
  const host = reqHeaders.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const calendarUrl = `${protocol}://${host}/api/calendar/${generateCalendarToken(user.id)}`

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, position, created_at')
    .eq('id', user.id)
    .single()

  const employee: Profile = profileData as Profile ?? {
    id: user.id,
    email: user.email ?? '',
    full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    role: 'employee',
    position: null,
    created_at: new Date().toISOString(),
  }

  const { data: weekStatusData } = await supabase
    .from('week_status')
    .select('published')
    .eq('week_monday', mondayStr)
    .single()

  const isPublished = weekStatusData?.published ?? false

  const shifts: Shift[] = []
  const postes: Poste[] = []
  const leaveRequests: LeaveRequest[] = []

  if (isPublished) {
    const [{ data: shiftsData }, { data: postesData }, { data: leaveData }] = await Promise.all([
      supabase.from('shifts').select('*').eq('employee_id', user.id).gte('date', mondayStr).lte('date', sundayStr),
      supabase.from('postes').select('*').order('name'),
      supabase.from('leave_requests').select('*').eq('employee_id', user.id).eq('status', 'approved').lte('start_date', sundayStr).gte('end_date', mondayStr),
    ])
    shifts.push(...((shiftsData ?? []) as Shift[]))
    postes.push(...((postesData ?? []) as Poste[]))
    leaveRequests.push(...((leaveData ?? []) as LeaveRequest[]))
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-7xl" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="hidden md:block mb-6">
        <Link
          href="/employee"
          className="inline-flex items-center gap-1 text-[13px] transition-colors duration-150"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm-sans)' }}
        >
          <ChevronLeft className="h-4 w-4" />
          Mon espace
        </Link>
      </div>

      <div className="mb-5 dashboard-s0 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-[20px] font-bold tracking-[-0.02em]"
              style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}
            >
              Mon planning
            </h1>
            {isCurrentWeek && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)', fontFamily: 'var(--font-dm-sans)' }}
              >
                Cette semaine
              </span>
            )}
          </div>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>
            Planning en lecture seule
          </p>
        </div>
        <ICalCopyButton url={calendarUrl} />
      </div>

      {!isPublished ? (
        <div className="flex flex-col items-center justify-center py-24 text-center dashboard-s1">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-tertiary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
          </div>
          <h2 className="text-[15px] font-semibold mb-2" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            Planning en cours de préparation
          </h2>
          <p className="text-[13px] max-w-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>
            Votre responsable n&apos;a pas encore publié le planning pour cette semaine. Revenez bientôt.
          </p>
        </div>
      ) : (
        <div className="dashboard-s1">
          <EmployeePlanningGrid
            weekDates={weekDates}
            employee={employee}
            shifts={shifts}
            postes={postes}
            leaveRequests={leaveRequests}
            isCurrentWeek={isCurrentWeek}
          />
        </div>
      )}
    </div>
  )
}
