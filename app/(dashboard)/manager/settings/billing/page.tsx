import { createClient } from '@/lib/supabase/server'
import { getSubscription, isActiveSubscription } from '@/lib/subscription'
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
  const trialEnd = new Date(new Date(user.created_at).getTime() + 14 * 24 * 60 * 60 * 1000)
  const trialDaysLeft = isPro ? 0 : Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))

  return <BillingClient subscription={subscription} trialDaysLeft={trialDaysLeft} />
}
