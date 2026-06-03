import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ManagerMetricsClient } from './manager-metrics-client'

export default async function ManagerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: nameRow }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle(),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Manager'
  const establishmentName = nameRow?.value && nameRow.value !== 'Mon établissement'
    ? nameRow.value
    : null

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <ManagerMetricsClient firstName={firstName} establishmentName={establishmentName} />
      </div>
    </div>
  )
}
