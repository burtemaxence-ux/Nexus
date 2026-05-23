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

  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'establishment_name')
    .maybeSingle()

  const establishmentName = setting?.value ?? 'Mon établissement'

  return (
    <AppShell
      role={role}
      userName={userName}
      userEmail={userEmail}
      establishmentName={establishmentName}
    >
      {children}
    </AppShell>
  )
}
