import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EmployeePlanningGrid } from '@/components/planning/employee-planning-grid'
import { getWeekDates, toISODate } from '@/lib/utils/dates'
import type { Profile, Shift, Poste } from '@/types'

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

  // Fetch shifts for this employee for the week
  const { data: shiftsData, error: shiftsError } = await supabase
    .from('shifts')
    .select('*')
    .eq('employee_id', user.id)
    .gte('date', mondayStr)
    .lte('date', sundayStr)

  if (shiftsError) {
    console.error('Error fetching shifts:', shiftsError)
  }

  const shifts: Shift[] = (shiftsData ?? []) as Shift[]

  // Fetch postes
  const { data: postesData } = await supabase
    .from('postes')
    .select('*')
    .order('name')

  const postes: Poste[] = (postesData ?? []) as Poste[]

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/employee"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Mon espace
        </Link>
      </div>

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour {firstName} — Planning de la semaine
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Consultez vos horaires pour la semaine en cours
        </p>
      </div>

      {/* Employee planning grid (read-only) */}
      <EmployeePlanningGrid
        weekDates={weekDates}
        employee={employee}
        shifts={shifts}
        postes={postes}
      />
    </div>
  )
}
