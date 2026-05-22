import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PlanningGrid } from '@/components/planning/planning-grid'
import { getWeekDates, toISODate } from '@/lib/utils/dates'
import type { Profile, Shift, Poste, WeekStatus } from '@/types'

interface PlanningPageProps {
  searchParams: Promise<{ week?: string }>
}

export default async function PlanningPage({ searchParams }: PlanningPageProps) {
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

  // Fetch employees (role = 'employee')
  const { data: employeesData, error: employeesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, position, created_at')
    .eq('role', 'employee')
    .order('full_name', { ascending: true })

  if (employeesError) {
    console.error('Error fetching employees:', employeesError)
  }

  const employees: Profile[] = (employeesData ?? []) as Profile[]

  // Fetch shifts for the week
  const { data: shiftsData, error: shiftsError } = await supabase
    .from('shifts')
    .select('*')
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

  // Fetch week_status for the current week
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
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/manager"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Tableau de bord
        </Link>
      </div>

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Planning</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Visualisez et gérez le planning hebdomadaire de votre équipe
        </p>
      </div>

      {/* Planning grid component */}
      <PlanningGrid
        weekDates={weekDates}
        employees={employees}
        shifts={shifts}
        weekLocked={weekStatus.locked}
        weekPublished={weekStatus.published}
        postes={postes}
      />
    </div>
  )
}
