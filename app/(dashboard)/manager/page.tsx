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
  const isDefaultName = !nameRow?.value || nameRow.value === 'Mon établissement'
  const establishmentLabel = !isDefaultName ? nameRow!.value : null

  const today = new Date()
  const todayLabel = today.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen dashboard-content" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div className="pt-1 dashboard-s0">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
            Bonjour {firstName}
          </h1>
          <p className="text-[12px] mt-1 capitalize" style={{ color: 'var(--text-tertiary)' }}>
            {establishmentLabel ? <>{establishmentLabel} · {todayLabel}</> : todayLabel}
          </p>
        </div>

        {/* ── MÉTRIQUES, ALERTES, MODULES (chargés côté client) ────────────── */}
        <ManagerMetricsClient />

      </div>
    </div>
  )
}
