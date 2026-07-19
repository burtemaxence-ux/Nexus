import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireManager } from '@/lib/api-auth'
import { calcHours, timeToMinutes } from '@/lib/planning-utils'
import { getMondayOfWeek, addDays, toISODate } from '@/lib/utils/dates'
import { NextRequest, NextResponse } from 'next/server'
import { scoreCandidate, rankCandidates, type CandidateScore } from '@/lib/replacement/score'

// Combien de candidats on remonte au manager (3 → 5 pour donner plus de marge).
const TOP_N = 5
// Fenêtre rotation : remplacements confirmés sur les 30 derniers jours.
const ROTATION_WINDOW_DAYS = 30

// ── Helpers ────────────────────────────────────────────────────────────────────

function mondayOfWeek(dateStr: string): string {
  return toISODate(getMondayOfWeek(new Date(dateStr + 'T00:00:00')))
}

function sundayOfWeek(monday: string): string {
  return toISODate(addDays(new Date(monday + 'T00:00:00'), 6))
}

function prevDayStr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  let profile: { establishment_id: string | null; active_establishment_id: string | null }
  try {
    const result = await requireManager(supabase)
    profile = result.profile
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id
  if (!establishmentId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as { shift_id?: string }
  if (!body.shift_id) return NextResponse.json({ error: 'shift_id requis' }, { status: 400 })

  // ── 1. Récupérer le shift ──────────────────────────────────────────────────

  const { data: shift, error: shiftErr } = await supabaseAdmin
    .from('shifts')
    .select('id, employee_id, date, start_time, end_time, poste_id, position, break_minutes')
    .eq('id', body.shift_id)
    .eq('establishment_id', establishmentId)
    .is('deleted_at', null)
    .single()

  if (shiftErr || !shift) return NextResponse.json({ error: 'Shift introuvable' }, { status: 404 })

  // Vérifier qu'il n'y a pas déjà un replacement_request actif pour ce shift
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('replacement_requests')
    .select('id, status, candidates, expires_at')
    .eq('shift_id', body.shift_id)
    .in('status', ['pending', 'confirmed'])
    .maybeSingle()

  if (existingErr) {
    console.error('[ai/replacement] pre-check error:', existingErr.code, existingErr.message)
    return NextResponse.json({ error: `Erreur base de données : ${existingErr.message}` }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({ error: 'Une demande de remplacement est déjà active pour ce shift', existing }, { status: 409 })
  }

  const monday = mondayOfWeek(shift.date)
  const sunday = sundayOfWeek(monday)
  const prevDay = prevDayStr(shift.date)
  const shiftDuration = calcHours(shift.start_time, shift.end_time, shift.break_minutes ?? 0)

  // ── 2. Candidats disponibles ───────────────────────────────────────────────

  // Tous les employés actifs de l'établissement (sauf l'absent)
  const { data: allEmployees } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, position, contract_type')
    .eq('establishment_id', establishmentId)
    .eq('role', 'employee')
    .eq('archived', false)
    .neq('id', shift.employee_id)

  if (!allEmployees || allEmployees.length === 0) {
    return NextResponse.json({ error: 'Aucun employé disponible' }, { status: 404 })
  }

  // Shifts ce même jour (pour exclure les conflits)
  const { data: dayShifts } = await supabaseAdmin
    .from('shifts')
    .select('employee_id')
    .eq('date', shift.date)
    .eq('establishment_id', establishmentId)
    .is('deleted_at', null)

  const busyTodayIds = new Set((dayShifts ?? []).map((s: { employee_id: string }) => s.employee_id))

  // Congés approuvés ce jour
  const { data: leaves } = await supabaseAdmin
    .from('leave_requests')
    .select('employee_id')
    .eq('status', 'approved')
    .lte('start_date', shift.date)
    .gte('end_date', shift.date)

  const onLeaveIds = new Set((leaves ?? []).map((l: { employee_id: string }) => l.employee_id))

  const candidateProfiles = allEmployees.filter(e =>
    !busyTodayIds.has(e.id) && !onLeaveIds.has(e.id)
  )

  if (candidateProfiles.length === 0) {
    return NextResponse.json({ error: 'Aucun candidat disponible pour ce shift' }, { status: 404 })
  }

  const candidateIds = candidateProfiles.map(e => e.id)

  // ── 3. Données brutes pour le scoring (requêtes parallèles) ───────────────

  const rotationFrom = new Date(Date.now() - ROTATION_WINDOW_DAYS * 86400000).toISOString()
  const [
    { data: expShifts },
    { data: weekShifts },
    { data: contracts },
    { data: marketplaceApps },
    { data: prevDayShifts },
    { data: dayShiftsForCompliance },
    { data: recentReplacements },
    { data: availRows },
  ] = await Promise.all([
    // Experience : shifts sur même poste, 90 jours
    supabaseAdmin
      .from('shifts')
      .select('employee_id, poste_id')
      .in('employee_id', candidateIds)
      .eq('poste_id', shift.poste_id ?? '__none__')
      .gte('date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0])
      .is('deleted_at', null),

    // Availability : heures planifiées cette semaine
    supabaseAdmin
      .from('shifts')
      .select('employee_id, start_time, end_time, break_minutes')
      .in('employee_id', candidateIds)
      .gte('date', monday)
      .lte('date', sunday)
      .is('deleted_at', null),

    // Contrats actifs
    supabaseAdmin
      .from('contracts')
      .select('employee_id, weekly_hours, start_date, end_date')
      .in('employee_id', candidateIds)
      .lte('start_date', shift.date)
      .or(`end_date.is.null,end_date.gte.${shift.date}`)
      .order('start_date', { ascending: false }),

    // Response score : marketplace applications 60 jours
    supabaseAdmin
      .from('marketplace_applications')
      .select('employee_id, status')
      .in('employee_id', candidateIds)
      .gte('created_at', new Date(Date.now() - 60 * 86400000).toISOString()),

    // Compliance : shifts la veille (repos 11h)
    supabaseAdmin
      .from('shifts')
      .select('employee_id, start_time, end_time, break_minutes')
      .in('employee_id', candidateIds)
      .eq('date', prevDay)
      .is('deleted_at', null),

    // Compliance : total heures ce jour (ne devrait pas exister pour les candidats mais sécurité)
    supabaseAdmin
      .from('shifts')
      .select('employee_id, start_time, end_time, break_minutes')
      .in('employee_id', candidateIds)
      .eq('date', shift.date)
      .is('deleted_at', null),

    // Rotation : combien de remplacements confirmés sur la fenêtre récente
    supabaseAdmin
      .from('replacement_requests')
      .select('confirmed_employee_id')
      .eq('establishment_id', establishmentId)
      .eq('status', 'confirmed')
      .in('confirmed_employee_id', candidateIds)
      .gte('confirmed_at', rotationFrom),

    // Disponibilités déclarées (0=lundi…6=dimanche) : un candidat hors de sa
    // fenêtre déclarée reste listé mais est signalé et rétrogradé.
    supabaseAdmin
      .from('availabilities')
      .select('employee_id, day_of_week, start_time, end_time')
      .in('employee_id', candidateIds),
  ])

  // ── 4. Agréger les signaux par candidat ────────────────────────────────────

  type ShiftRow = { employee_id: string; start_time: string; end_time: string; break_minutes: number }
  type ContractRow = { employee_id: string; weekly_hours: number; start_date: string; end_date: string | null }
  type AppRow = { employee_id: string; status: string }

  const expCountMap = new Map<string, number>()
  if (shift.poste_id) {
    for (const s of (expShifts ?? []) as { employee_id: string }[]) {
      expCountMap.set(s.employee_id, (expCountMap.get(s.employee_id) ?? 0) + 1)
    }
  }

  const weekHoursMap = new Map<string, number>()
  for (const s of (weekShifts ?? []) as ShiftRow[]) {
    const h = calcHours(s.start_time, s.end_time, s.break_minutes ?? 0)
    weekHoursMap.set(s.employee_id, (weekHoursMap.get(s.employee_id) ?? 0) + h)
  }

  const contractMap = new Map<string, number>()
  for (const c of (contracts ?? []) as ContractRow[]) {
    if (!contractMap.has(c.employee_id)) contractMap.set(c.employee_id, c.weekly_hours)
  }

  const appMap = new Map<string, { confirmed: number; total: number }>()
  for (const a of (marketplaceApps ?? []) as AppRow[]) {
    const cur = appMap.get(a.employee_id) ?? { confirmed: 0, total: 0 }
    cur.total++
    if (a.status === 'confirmed') cur.confirmed++
    appMap.set(a.employee_id, cur)
  }

  const prevDayShiftMap = new Map<string, ShiftRow[]>()
  for (const s of (prevDayShifts ?? []) as ShiftRow[]) {
    if (!prevDayShiftMap.has(s.employee_id)) prevDayShiftMap.set(s.employee_id, [])
    prevDayShiftMap.get(s.employee_id)!.push(s)
  }

  const dayHoursMap = new Map<string, number>()
  for (const s of (dayShiftsForCompliance ?? []) as ShiftRow[]) {
    const h = calcHours(s.start_time, s.end_time, s.break_minutes ?? 0)
    dayHoursMap.set(s.employee_id, (dayHoursMap.get(s.employee_id) ?? 0) + h)
  }

  const rotationMap = new Map<string, number>()
  for (const r of (recentReplacements ?? []) as { confirmed_employee_id: string | null }[]) {
    if (!r.confirmed_employee_id) continue
    rotationMap.set(r.confirmed_employee_id, (rotationMap.get(r.confirmed_employee_id) ?? 0) + 1)
  }

  // Disponibilités déclarées par candidat. Sans ligne = disponible partout ;
  // avec des lignes = disponible uniquement ces jours-là, dans la fenêtre.
  type AvailRow = { employee_id: string; day_of_week: number; start_time: string; end_time: string }
  const availMap = new Map<string, AvailRow[]>()
  for (const a of (availRows ?? []) as AvailRow[]) {
    if (!availMap.has(a.employee_id)) availMap.set(a.employee_id, [])
    availMap.get(a.employee_id)!.push(a)
  }
  const shiftDow = (new Date(shift.date + 'T00:00:00').getDay() + 6) % 7
  const shiftStartHM = shift.start_time.slice(0, 5)
  const shiftEndHM = shift.end_time.slice(0, 5)
  function availabilityMismatch(empId: string): boolean {
    const rows = availMap.get(empId)
    if (!rows || rows.length === 0) return false
    const row = rows.find(r => r.day_of_week === shiftDow)
    if (!row) return true
    return shiftStartHM < row.start_time.slice(0, 5) || shiftEndHM > row.end_time.slice(0, 5)
  }

  // ── 5. Compliance préventive + scoring déterministe ───────────────────────

  type CandidateProfile = { id: string; full_name: string | null; position: string | null; contract_type: string | null }
  const scored: CandidateScore[] = (candidateProfiles as CandidateProfile[]).map(emp => {
    const weeklyPlanned = weekHoursMap.get(emp.id) ?? 0

    // Vérifications conformité sur l'attribution hypothétique de ce shift.
    const complianceDetails: string[] = []

    // 1. Plafond hebdomadaire 48h (L3121-20).
    const totalWeekWithNew = weeklyPlanned + shiftDuration
    if (totalWeekWithNew > 48) {
      complianceDetails.push(`Dépassement 48h semaine (${totalWeekWithNew.toFixed(1)}h)`)
    }

    // 2. Plafond journalier 10h (L3121-18).
    const todayHours = (dayHoursMap.get(emp.id) ?? 0) + shiftDuration
    if (todayHours > 10) {
      complianceDetails.push(`Dépassement 10h jour (${todayHours.toFixed(1)}h)`)
    }

    // 3. Repos quotidien 11h (L3131-1) — calculé sur le shift de la veille.
    for (const ps of prevDayShiftMap.get(emp.id) ?? []) {
      const prevEndMin = timeToMinutes(ps.end_time)
      const newStartMin = timeToMinutes(shift.start_time)
      const restMinutes = (newStartMin + 1440) - prevEndMin
      if (restMinutes < 11 * 60) {
        const h = Math.floor(restMinutes / 60)
        const m = restMinutes % 60
        complianceDetails.push(`Repos insuffisant (${h}h${m > 0 ? String(m).padStart(2, '0') : ''} < 11h)`)
      }
    }

    return scoreCandidate(
      { id: emp.id, full_name: emp.full_name, position: emp.position, contract_type: emp.contract_type },
      {
        experienceCount: expCountMap.get(emp.id) ?? 0,
        weeklyHoursPlanned: weeklyPlanned,
        contractWeeklyHours: contractMap.get(emp.id) ?? null,
        marketplaceConfirmed: appMap.get(emp.id)?.confirmed ?? 0,
        marketplaceTotal: appMap.get(emp.id)?.total ?? 0,
        recentReplacementsConfirmed: rotationMap.get(emp.id) ?? 0,
        complianceDetails,
        declaredAvailabilityMismatch: availabilityMismatch(emp.id),
      },
      { hasPosteId: Boolean(shift.poste_id) },
    )
  })

  // Tri composite : conformité OK d'abord, puis score décroissant.
  const ranked = rankCandidates(scored)
  const topCandidates = ranked.slice(0, TOP_N)

  // ── 6. Créer le replacement_request en DB ──────────────────────────────────

  const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString()

  const candidatesPayload = topCandidates.map(c => ({
    employee_id: c.employee_id,
    score: c.score_final,
    explanation: c.explanation,
    notified_at: null,
    response: null,
  }))

  const { data: replacementRequest, error: rrErr } = await supabaseAdmin
    .from('replacement_requests')
    .insert({
      establishment_id: establishmentId,
      absent_employee_id: shift.employee_id,
      shift_id: body.shift_id,
      status: 'pending',
      candidates: candidatesPayload,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (rrErr || !replacementRequest) {
    console.error('[ai/replacement] DB insert error:', rrErr?.code, rrErr?.message)

    // Contrainte unique violée : une demande active existe déjà (race condition ou retry)
    if (rrErr?.code === '23505') {
      const { data: existingRR } = await supabaseAdmin
        .from('replacement_requests')
        .select('id, candidates, expires_at')
        .eq('shift_id', body.shift_id)
        .in('status', ['pending', 'confirmed'])
        .maybeSingle()

      if (existingRR) {
        const existingCandidateIds = (existingRR.candidates as { employee_id: string }[]).map(c => c.employee_id)
        const finalCandidates = topCandidates.filter(c => existingCandidateIds.includes(c.employee_id))

        return NextResponse.json({
          replacement_request_id: existingRR.id,
          expires_at: existingRR.expires_at,
          shift: { id: shift.id, date: shift.date, start_time: shift.start_time, end_time: shift.end_time, position: shift.position, poste_id: shift.poste_id },
          candidates: finalCandidates.length > 0 ? finalCandidates : topCandidates,
        }, { status: 200 })
      }
    }

    return NextResponse.json(
      { error: `Erreur lors de la création de la demande${rrErr ? ` : ${rrErr.message}` : ''}` },
      { status: 500 }
    )
  }

  // ── 7. Retourner les résultats ─────────────────────────────────────────────

  return NextResponse.json({
    replacement_request_id: replacementRequest.id,
    expires_at: expiresAt,
    shift: {
      id: shift.id,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      position: shift.position,
      poste_id: shift.poste_id,
    },
    candidates: topCandidates,
  }, { status: 201 })
}
