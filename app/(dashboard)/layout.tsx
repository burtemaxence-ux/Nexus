import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/ui/app-shell'

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

  // Fetch settings and establishments list in parallel
  const [
    { data: nameRow },
    { data: logoRow },
    { data: pendingLeaves },
    { data: userEstablishments },
  ] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'org_logo_url').maybeSingle(),
    isManagerOrSupervisor
      ? supabase.from('leave_requests').select('id').eq('status', 'pending')
      : Promise.resolve({ data: [] }),
    isManagerOrSupervisor && user
      ? supabase
          .from('user_establishments')
          .select('establishment_id, establishments(id, name)')
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
  ])

  const establishmentName = nameRow?.value ?? 'Mon établissement'
  const orgLogoUrl = logoRow?.value ?? ''
  const pendingLeavesCount = pendingLeaves?.length ?? 0

  const establishments = (userEstablishments ?? []).map(row => {
    const est = (Array.isArray(row.establishments) ? row.establishments[0] : row.establishments) as
      { id: string; name: string } | null
    return { id: est?.id ?? '', name: est?.name ?? '' }
  }).filter(e => e.id)

  return (
    <AppShell
      role={role}
      userName={userName}
      userEmail={userEmail}
      establishmentName={establishmentName}
      orgLogoUrl={orgLogoUrl}
      pendingLeavesCount={pendingLeavesCount}
      establishments={establishments}
      activeEstablishmentId={activeEstablishmentId}
    >
      {children}
    </AppShell>
  )
}
