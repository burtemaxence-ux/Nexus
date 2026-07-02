import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ScrollText } from 'lucide-react'
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
      <div className="mb-4">
        <Link
          href="/manager/compliance/journal"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--accent)] hover:underline"
        >
          <ScrollText className="h-4 w-4" />
          Journal de conformité (trace horodatée)
        </Link>
      </div>
      <ComplianceClient />
    </div>
  )
}
