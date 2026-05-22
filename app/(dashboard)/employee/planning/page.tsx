import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EmployeePlanningGrid } from '@/components/planning/employee-planning-grid'
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

  // Resolve searchParams (Next.js 14 async searchParams)
  const params = await searchParams
  const weekParam = params.week

  // Determine the Monday of the target week
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

  // Fetch the employee's profile
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

  const firstName = employee.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Employé'

  // Vérifier si la semaine est publiée
  const { data: weekStatusData } = await supabase
    .from('week_status')
    .select('published')
    .eq('week_monday', mondayStr)
    .single()

  const isPublished = weekStatusData?.published ?? false

  // Fetch shifts uniquement si la semaine est publiée
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <Link
          href="/employee"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Mon espace
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour {firstName} — Planning de la semaine
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Consultez vos horaires pour la semaine en cours
        </p>
      </div>

      {!isPublished ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Planning en cours de préparation</h2>
          <p className="text-gray-500 text-sm max-w-sm">
            Votre responsable n&apos;a pas encore publié le planning pour cette semaine. Revenez bientôt.
          </p>
        </div>
      ) : (
        <EmployeePlanningGrid
          weekDates={weekDates}
          employee={employee}
          shifts={shifts}
          postes={postes}
          leaveRequests={leaveRequests}
        />
      )}
    </div>
  )
}
