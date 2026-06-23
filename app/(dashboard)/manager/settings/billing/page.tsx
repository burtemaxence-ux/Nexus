import { createClient } from '@/lib/supabase/server'
import { getSubscription, isActiveSubscription, TRIAL_DAYS } from '@/lib/subscription'
import { getPlanTier, PLAN_EMPLOYEE_LIMITS } from '@/lib/plan-guard'
import { BillingClient } from './billing-client'

export const metadata = { title: 'Abonnement — Quartzbase' }

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('establishment_id, active_establishment_id')
    .eq('id', user.id)
    .single()

  const estId = profile?.active_establishment_id ?? profile?.establishment_id ?? ''
  const subscription = await getSubscription(supabase, estId)

  const isPro = isActiveSubscription(subscription)
  const trialEnd = new Date(new Date(user.created_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const trialDaysLeft = isPro ? 0 : Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))

  // Usage employés : même comptage que le garde-fou d'invitation (role employee,
  // non archivé, établissement courant). Limite null = illimité (Multi-site).
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

  return (
    <BillingClient
      subscription={subscription}
      trialDaysLeft={trialDaysLeft}
      employeeCount={employeeCount}
      employeeLimit={employeeLimit}
    />
  )
}
