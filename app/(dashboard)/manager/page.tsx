import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ManagerHomeHeader } from '@/components/dashboard/manager-home-header'
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
  const isDefaultName = !nameRow?.value || nameRow.value === 'Mon établissement'
  const establishmentLabel = !isDefaultName ? nameRow!.value : null

  return (
    <div className="min-h-screen dashboard-content" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="max-w-[1000px] mx-auto px-6 pt-[30px] pb-16 flex flex-col gap-[22px]">

        {/* ── EN-TÊTE DE BIENVENUE ──────────────────────────────────────────── */}
        <div className="dashboard-s0">
          <ManagerHomeHeader firstName={firstName} establishmentName={establishmentLabel} />
        </div>

        {/* ── MÉTRIQUES & MODULES (chargés côté client) ─────────────────────── */}
        <ManagerMetricsClient />

      </div>
    </div>
  )
}
