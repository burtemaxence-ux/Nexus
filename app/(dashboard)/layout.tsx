import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/ui/app-shell'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role: 'manager' | 'employee' = 'employee'
  let userName = ''
  let userEmail = user?.email ?? ''

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()
    role = (profile?.role as 'manager' | 'employee') ?? 'employee'
    userName = profile?.full_name ?? ''
  }

  // Fetch settings in parallel
  const [
    { data: nameRow },
    { data: logoRow },
    { data: pendingLeaves },
  ] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'org_logo_url').maybeSingle(),
    role === 'manager'
      ? supabase.from('leave_requests').select('id').eq('status', 'pending')
      : Promise.resolve({ data: [] }),
  ])

  const establishmentName = nameRow?.value ?? 'Mon établissement'
  const orgLogoUrl = logoRow?.value ?? ''
  const pendingLeavesCount = pendingLeaves?.length ?? 0

  return (
    <AppShell
      role={role}
      userName={userName}
      userEmail={userEmail}
      establishmentName={establishmentName}
      orgLogoUrl={orgLogoUrl}
      pendingLeavesCount={pendingLeavesCount}
    >
      {children}
    </AppShell>
  )
}
