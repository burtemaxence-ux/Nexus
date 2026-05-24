import { createClient } from '@/lib/supabase/server'
import EmployeesClient, { type Employee } from './employees-client'

export default async function EmployeesPage() {
  const supabase = await createClient()

  const [{ data }, { data: { user } }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, position, contract_type, weekly_hours, phone, created_at, archived')
      .eq('role', 'employee')
      .eq('archived', false)
      .order('created_at', { ascending: false }),
    supabase.auth.getUser(),
  ])

  let callerRole: 'manager' | 'supervisor' | 'employee' = 'employee'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    callerRole = (profile?.role as typeof callerRole) ?? 'employee'
  }

  return <EmployeesClient initialEmployees={(data ?? []) as Employee[]} callerRole={callerRole} />
}
