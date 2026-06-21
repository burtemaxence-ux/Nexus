import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ComplianceClient from './compliance-client'
import { PageHeader } from '@/components/ui/page-header'

export const metadata = { title: 'Conformité légale — Quartzbase' }

export default async function CompliancePage() {
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
        title="Conformité légale"
        subtitle="Détection automatique des anomalies par rapport au Code du travail français."
      />
      <ComplianceClient />
    </div>
  )
}
