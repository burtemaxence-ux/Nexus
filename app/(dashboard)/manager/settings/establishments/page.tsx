import { createClient } from '@/lib/supabase/server'
import EstablishmentsClient from './establishments-client'

export default async function EstablishmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let callerRole: 'manager' | 'supervisor' | 'employee' = 'employee'
  let activeEstablishmentId = ''

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, establishment_id, active_establishment_id')
      .eq('id', user.id)
      .single()
    callerRole = (profile?.role as typeof callerRole) ?? 'employee'
    activeEstablishmentId = profile?.active_establishment_id ?? profile?.establishment_id ?? ''
  }

  const { data: rows } = user
    ? await supabase
        .from('user_establishments')
        .select('establishment_id, role, establishments(id, name, created_at)')
        .eq('user_id', user.id)
    : { data: [] }

  const establishments = (rows ?? []).map(row => {
    const est = (Array.isArray(row.establishments) ? row.establishments[0] : row.establishments) as
      { id: string; name: string; created_at: string } | null
    return {
      id: est?.id ?? '',
      name: est?.name ?? '',
      createdAt: est?.created_at ?? '',
      role: row.role as 'manager' | 'supervisor',
    }
  }).filter(e => e.id)

  return (
    <EstablishmentsClient
      establishments={establishments}
      activeEstablishmentId={activeEstablishmentId}
      callerRole={callerRole}
    />
  )
}
