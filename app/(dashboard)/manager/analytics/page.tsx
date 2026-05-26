import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './analytics-client'

export const metadata = { title: 'Analytiques RH — Nexus' }

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) {
    redirect('/employee/planning')
  }

  return (
    <div className="px-6 py-5">
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-[-0.02em]">
          Analytiques RH
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
          Masse salariale, présence, absences et turnover sur la période sélectionnée.
        </p>
      </div>
      <AnalyticsClient />
    </div>
  )
}
