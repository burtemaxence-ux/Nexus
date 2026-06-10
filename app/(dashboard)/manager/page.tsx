import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar } from 'lucide-react'
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
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap pt-1 dashboard-s0">
          <div>
            <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
              Bonjour {firstName} 👋
            </h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Voici un aperçu de votre activité.
            </p>
            <p className="text-[11px] uppercase tracking-[0.06em] mt-1.5 capitalize" style={{ color: 'var(--text-tertiary)' }}>
              {establishmentLabel
                ? <>{establishmentLabel} · {todayLabel}</>
                : todayLabel
              }
            </p>
          </div>
          <Link href="/manager/planning" className="btn-primary flex-shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            Voir le planning
          </Link>
        </div>

        {/* ── MÉTRIQUES, ALERTES, MODULES (chargés côté client) ────────────── */}
        <ManagerMetricsClient />

      </div>
    </div>
  )
}
