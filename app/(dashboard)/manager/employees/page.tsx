import { createClient } from '@/lib/supabase/server'
import EmployeesClient, { type Employee } from './employees-client'

export default async function EmployeesPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, position, contract_type, weekly_hours, phone, created_at, archived')
    .eq('role', 'employee')
    .eq('archived', false)
    .order('created_at', { ascending: false })

  return <EmployeesClient initialEmployees={(data ?? []) as Employee[]} />
}
