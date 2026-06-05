import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/ui/app-shell'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { PaywallGate } from '@/components/ui/paywall-gate'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role: 'manager' | 'employee' | 'supervisor' = 'employee'
  let userName = ''
  let userEmail = user?.email ?? ''
  let activeEstablishmentId = ''

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, establishment_id, active_establishment_id')
      .eq('id', user.id)
      .single()
    role = (profile?.role as 'manager' | 'employee' | 'supervisor') ?? 'employee'
    userName = profile?.full_name ?? ''
    activeEstablishmentId = profile?.active_establishment_id ?? profile?.establishment_id ?? ''
  }

  const isManagerOrSupervisor = role === 'manager' || role === 'supervisor'

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const ago7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const [
    { data: nameRow },
    { data: logoRow },
    { data: pendingLeaves },
    { data: userEstablishments },
    { count: cddCount },
    { count: latenessCount },
    { data: yesterdayShifts },
    { data: yesterdayPresences },
    { count: complianceCount },
  ] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'org_logo_url').maybeSingle(),
    isManagerOrSupervisor
      ? supabase.from('leave_requests').select('id').eq('status', 'pending')
      : Promise.resolve({ data: [] }),
    isManagerOrSupervisor && user
      ? supabase.from('user_establishments').select('establishment_id, establishments(id, name)').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    isManagerOrSupervisor
      ? supabase.from('contracts').select('id', { count: 'exact', head: true }).not('end_date', 'is', null).gte('end_date', today).lte('end_date', in30)
      : Promise.resolve({ count: 0, data: null, error: null, status: 200, statusText: 'OK' }),
    isManagerOrSupervisor
      ? supabase.from('lateness_records').select('id', { count: 'exact', head: true }).eq('justified', false).gte('date', ago7)
      : Promise.resolve({ count: 0, data: null, error: null, status: 200, statusText: 'OK' }),
    isManagerOrSupervisor
      ? supabase.from('shifts').select('employee_id').eq('date', yesterday)
      : Promise.resolve({ data: [], error: null, count: null, status: 200, statusText: 'OK' }),
    isManagerOrSupervisor
      ? supabase.from('presences').select('employee_id').eq('date', yesterday).not('clock_in', 'is', null)
      : Promise.resolve({ data: [], error: null, count: null, status: 200, statusText: 'OK' }),
    isManagerOrSupervisor && activeEstablishmentId
      ? supabase.from('compliance_alerts').select('id', { count: 'exact', head: true }).eq('establishment_id', activeEstablishmentId).eq('status', 'active').or(`ignored_until.is.null,ignored_until.lt.${new Date().toISOString()}`)
      : Promise.resolve({ count: 0, data: null, error: null, status: 200, statusText: 'OK' }),
  ])

  const establishmentName = nameRow?.value ?? 'Mon établissement'
  const orgLogoUrl = logoRow?.value ?? ''
  const pendingLeavesCount = pendingLeaves?.length ?? 0

  const presentSet = new Set((yesterdayPresences ?? []).map(p => (p as { employee_id: string }).employee_id))
  const absenceCount = (yesterdayShifts ?? []).filter(s => !presentSet.has((s as { employee_id: string }).employee_id)).length
  const alertsCount = (cddCount ?? 0) + (latenessCount ?? 0) + absenceCount
  const complianceAlertsCount = complianceCount ?? 0

  const establishments = (userEstablishments ?? []).map(row => {
    const est = (Array.isArray(row.establishments) ? row.establishments[0] : row.establishments) as
      { id: string; name: string } | null
    return { id: est?.id ?? '', name: est?.name ?? '' }
  }).filter(e => e.id)

  // ── Paywall — managers uniquement ───────────────────────────────────────────
  const headersList = await headers()
  const currentPathname = headersList.get('x-pathname') ?? headersList.get('x-invoke-path') ?? ''
  const isBillingPage = currentPathname.includes('/settings/billing')

  let paywallGate: ReactNode | null = null
  if (isManagerOrSupervisor && activeEstablishmentId && !isBillingPage) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('establishment_id', activeEstablishmentId)
      .maybeSingle()

    const isActive = sub?.status === 'active' || sub?.status === 'trialing'
    if (!isActive) {
      const trialEnd = user
        ? new Date(new Date(user.created_at).getTime() + 14 * 24 * 60 * 60 * 1000)
        : new Date(0)
      const inTrial = Date.now() < trialEnd.getTime()
      if (!inTrial) {
        paywallGate = <PaywallGate trialDaysLeft={sub ? undefined : 0} />
      }
    }
  }

  return (
    <AppShell
      role={role}
      userName={userName}
      userEmail={userEmail}
      establishmentName={establishmentName}
      orgLogoUrl={orgLogoUrl}
      pendingLeavesCount={pendingLeavesCount}
      alertsCount={alertsCount}
      complianceAlertsCount={complianceAlertsCount}
      establishments={establishments}
      activeEstablishmentId={activeEstablishmentId}
    >
      <ErrorBoundary>
        {paywallGate ?? children}
      </ErrorBoundary>
    </AppShell>
  )
}
