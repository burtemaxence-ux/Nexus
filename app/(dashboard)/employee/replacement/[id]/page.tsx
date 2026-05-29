import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ReplacementConfirmClient } from './replacement-confirm-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReplacementPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Vérifier que c'est bien un employé
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, establishment_id, active_establishment_id')
    .eq('id', user.id)
    .single()

  // Managers peuvent aussi accéder pour test, mais flow prévu pour employés
  if (!profile) redirect('/login')

  // Récupérer la demande de remplacement
  const { data: rr } = await supabaseAdmin
    .from('replacement_requests')
    .select('id, status, candidates, shift_id, establishment_id, expires_at, confirmed_employee_id')
    .eq('id', id)
    .single()

  if (!rr) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-[16px] font-medium" style={{ color: 'var(--text-primary)' }}>
          Demande introuvable
        </p>
        <p className="text-[13px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          Ce lien est invalide ou a expiré.
        </p>
      </div>
    )
  }

  // Vérifier que l'employé est bien dans les candidats (ou manager)
  const isManager = ['manager', 'supervisor'].includes(profile.role)
  type Candidate = {
    employee_id: string
    score: number
    explanation: string
    notified_at: string | null
    response: string | null
  }
  const candidates: Candidate[] = Array.isArray(rr.candidates) ? rr.candidates : []
  const isCandidate = candidates.some(c => c.employee_id === user.id)

  if (!isManager && !isCandidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-[16px] font-medium" style={{ color: 'var(--text-primary)' }}>
          Accès non autorisé
        </p>
        <p className="text-[13px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          Tu ne fais pas partie des candidats pour ce remplacement.
        </p>
      </div>
    )
  }

  // Récupérer les infos du shift
  const { data: shift } = await supabaseAdmin
    .from('shifts')
    .select('date, start_time, end_time, position, poste_id, break_minutes')
    .eq('id', rr.shift_id)
    .single()

  // Récupérer le nom de l'établissement
  const { data: estRow } = await supabaseAdmin
    .from('establishments')
    .select('name, address')
    .eq('id', rr.establishment_id)
    .maybeSingle()

  // Récupérer le poste si disponible
  let posteName: string | null = shift?.position ?? null
  let posteColor: string | null = null
  if (shift?.poste_id) {
    const { data: poste } = await supabaseAdmin
      .from('postes')
      .select('name, color')
      .eq('id', shift.poste_id)
      .maybeSingle()
    if (poste) {
      posteName = poste.name
      posteColor = poste.color
    }
  }

  // Trouver la réponse déjà donnée par cet employé
  const myCandidate = candidates.find(c => c.employee_id === user.id)

  return (
    <ReplacementConfirmClient
      replacementRequestId={rr.id}
      employeeId={user.id}
      status={rr.status}
      myResponse={myCandidate?.response ?? null}
      expiresAt={rr.expires_at}
      confirmedEmployeeId={rr.confirmed_employee_id}
      shift={shift ? {
        date: shift.date,
        startTime: shift.start_time,
        endTime: shift.end_time,
        breakMinutes: shift.break_minutes ?? 0,
      } : null}
      posteName={posteName}
      posteColor={posteColor}
      establishmentName={estRow?.name ?? 'Établissement'}
      establishmentAddress={estRow?.address ?? null}
    />
  )
}
