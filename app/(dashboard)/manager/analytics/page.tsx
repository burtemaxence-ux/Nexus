import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { PageHeader } from '@/components/ui/page-header'

const AnalyticsClient = dynamic(() => import('./analytics-client'), {
  ssr: false,
  loading: () => <div className="animate-pulse h-96 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]" />,
})

export const metadata = { title: 'Analytiques RH — Quartzbase' }

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
    <div className="px-4 md:px-6 py-5">
      <PageHeader
        title="Analytiques RH"
        subtitle="Masse salariale, présence, absences et turnover sur la période sélectionnée."
      />
      <ErrorBoundary>
        <AnalyticsClient />
      </ErrorBoundary>
    </div>
  )
}
