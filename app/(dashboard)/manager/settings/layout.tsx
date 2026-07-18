import { createClient } from '@/lib/supabase/server'
import { getSubscription, isActiveSubscription } from '@/lib/subscription'
import { getPlanTier, PLAN_EMPLOYEE_LIMITS } from '@/lib/plan-guard'
import SettingsSidebar, { type BillingSummary } from './_sidebar'
import { ShieldAlert } from 'lucide-react'
import './settings.css'

const PLAN_LABELS: Record<string, string> = { essential: 'Essentiel', pro: 'Pro', multisite: 'Multi-site' }

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isSupervisor = false
  let billing: BillingSummary | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, establishment_id, active_establishment_id')
      .eq('id', user.id)
      .single()
    isSupervisor = profile?.role === 'supervisor'

    const estId = profile?.active_establishment_id ?? profile?.establishment_id ?? ''
    const subscription = await getSubscription(supabase, estId)
    const isActive = isActiveSubscription(subscription)
    const limit = PLAN_EMPLOYEE_LIMITS[getPlanTier(subscription)]
    const employeeLimit = isFinite(limit) ? limit : null

    let employeeCount = 0
    if (estId) {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'employee')
        .eq('archived', false)
        .eq('establishment_id', estId)
      employeeCount = count ?? 0
    }

    const periodEnd = subscription?.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
      : null

    billing = {
      planLabel: isActive && subscription?.plan ? (PLAN_LABELS[subscription.plan] ?? subscription.plan) : 'Essai gratuit',
      isActive,
      employeeCount,
      employeeLimit,
      renewalText: periodEnd
        ? `${subscription?.cancel_at_period_end ? 'Fin le' : 'Renouvellement le'} ${periodEnd}`
        : null,
    }
  }

  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: 'calc(100vh - 44px)' }}>
      <SettingsSidebar billing={billing} />
      <main className="nx-settings-main flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-page)' }}>
        {isSupervisor && (
          <div className="flex items-center gap-2 px-5 py-2.5 text-xs font-medium" style={{ backgroundColor: '#FEF3C7', borderBottom: '0.5px solid #FDE68A', color: 'var(--warning)' }}>
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            Accès en lecture seule — les modifications de paramètres sont réservées aux managers.
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
