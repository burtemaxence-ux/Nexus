import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ReplacementsClient } from './replacements-client'

export default async function ReplacementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, establishment_id, active_establishment_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'supervisor'].includes(profile.role)) {
    redirect('/manager')
  }

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id
  if (!establishmentId) redirect('/manager')

  const since30 = new Date(Date.now() - 30 * 86400000).toISOString()

  // Récupérer les replacement_requests des 30 derniers jours
  const { data: requests } = await supabaseAdmin
    .from('replacement_requests')
    .select('id, status, candidates, shift_id, absent_employee_id, confirmed_employee_id, confirmed_at, created_at, expires_at')
    .eq('establishment_id', establishmentId)
    .gte('created_at', since30)
    .order('created_at', { ascending: false })

  if (!requests || requests.length === 0) {
    return <ReplacementsClient requests={[]} avgMinutes={null} />
  }

  // Récupérer les shifts associés
  const shiftIds = [...new Set(requests.map(r => r.shift_id))]
  const { data: shifts } = await supabaseAdmin
    .from('shifts')
    .select('id, date, start_time, end_time, position, poste_id')
    .in('id', shiftIds)

  // Récupérer les profils (absents + remplaçants)
  const profileIds = [
    ...new Set([
      ...requests.map(r => r.absent_employee_id).filter(Boolean),
      ...requests.map(r => r.confirmed_employee_id).filter(Boolean),
    ])
  ] as string[]

  const { data: profiles } = profileIds.length > 0
    ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', profileIds)
    : { data: [] }

  type ShiftRow = { id: string; date: string; start_time: string; end_time: string; position: string | null; poste_id: string | null }
  const shiftMap = new Map<string, ShiftRow>((shifts ?? []).map(s => [s.id, s as ShiftRow]))
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name ?? 'Inconnu']))

  // Calculer le temps moyen de résolution (sur les confirmés des 30 derniers jours)
  const confirmed = requests.filter(r => r.status === 'confirmed' && r.confirmed_at)
  const avgMinutes = confirmed.length > 0
    ? Math.round(
        confirmed.reduce((sum, r) => {
          const ms = new Date(r.confirmed_at!).getTime() - new Date(r.created_at).getTime()
          return sum + ms / 60000
        }, 0) / confirmed.length
      )
    : null

  type RequestRow = {
    id: string
    status: string
    shiftDate: string | null
    shiftStart: string | null
    shiftEnd: string | null
    shiftPosition: string | null
    absentName: string | null
    replacementName: string | null
    createdAt: string
    confirmedAt: string | null
    resolutionMinutes: number | null
    candidatesCount: number
  }

  const rows: RequestRow[] = requests.map(r => {
    const shift = shiftMap.get(r.shift_id)
    const resolutionMs = r.confirmed_at
      ? new Date(r.confirmed_at).getTime() - new Date(r.created_at).getTime()
      : null

    return {
      id: r.id,
      status: r.status,
      shiftDate: shift?.date ?? null,
      shiftStart: shift?.start_time ?? null,
      shiftEnd: shift?.end_time ?? null,
      shiftPosition: shift?.position ?? null,
      absentName: r.absent_employee_id ? (profileMap.get(r.absent_employee_id) ?? null) : null,
      replacementName: r.confirmed_employee_id ? (profileMap.get(r.confirmed_employee_id) ?? null) : null,
      createdAt: r.created_at,
      confirmedAt: r.confirmed_at ?? null,
      resolutionMinutes: resolutionMs !== null ? Math.round(resolutionMs / 60000) : null,
      candidatesCount: Array.isArray(r.candidates) ? r.candidates.length : 0,
    }
  })

  return <ReplacementsClient requests={rows} avgMinutes={avgMinutes} />
}
