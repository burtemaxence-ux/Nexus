import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { calcHours, timeToMinutes } from '@/lib/planning-utils'
import { getMondayOfWeek, addDays, toISODate } from '@/lib/utils/dates'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic()

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

// ── Types ──────────────────────────────────────────────────────────────────────

type ScoredCandidate = {
  employee_id: string
  full_name: string
  position: string | null
  contract_type: string | null
  experience_score: number
  availability_score: number
  response_score: number
  score_final: number
  weekly_hours_planned: number
  contract_weekly_hours: number | null
  compliance_warning: boolean
  compliance_details: string[]
  explanation: string
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, establishment_id, active_establishment_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'supervisor'].includes(profile.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
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

  const [
    { data: expShifts },
    { data: weekShifts },
    { data: contracts },
    { data: marketplaceApps },
    { data: prevDayShifts },
    { data: dayShiftsForCompliance },
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
  ])

  // ── 4. Calculer les scores ─────────────────────────────────────────────────

  // Regrouper par employee_id
  type ShiftRow = { employee_id: string; start_time: string; end_time: string; break_minutes: number }
  type ContractRow = { employee_id: string; weekly_hours: number; start_date: string; end_date: string | null }
  type AppRow = { employee_id: string; status: string }

  const expCountMap = new Map<string, number>()
  for (const s of (expShifts ?? []) as { employee_id: string }[]) {
    if (shift.poste_id) {
      expCountMap.set(s.employee_id, (expCountMap.get(s.employee_id) ?? 0) + 1)
    }
  }

  const weekHoursMap = new Map<string, number>()
  for (const s of (weekShifts ?? []) as ShiftRow[]) {
    const h = calcHours(s.start_time, s.end_time, s.break_minutes ?? 0)
    weekHoursMap.set(s.employee_id, (weekHoursMap.get(s.employee_id) ?? 0) + h)
  }

  // Contrat actif par employé (le plus récent)
  const contractMap = new Map<string, number>()
  for (const c of (contracts ?? []) as ContractRow[]) {
    if (!contractMap.has(c.employee_id)) {
      contractMap.set(c.employee_id, c.weekly_hours)
    }
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

  type CandidateProfile = { id: string; full_name: string | null; position: string | null; contract_type: string | null }
  const scored: ScoredCandidate[] = (candidateProfiles as CandidateProfile[]).map(emp => {
    // Experience score
    let experience_score: number
    if (!shift.poste_id) {
      experience_score = 5
    } else {
      const count = expCountMap.get(emp.id) ?? 0
      experience_score = Math.min(count, 10)
    }

    // Availability score
    const weeklyPlanned = weekHoursMap.get(emp.id) ?? 0
    const contractHours = contractMap.get(emp.id) ?? null
    let availability_score: number
    if (!contractHours) {
      availability_score = 5
    } else {
      availability_score = Math.min(10, Math.max(0, 10 - (weeklyPlanned / contractHours) * 10))
    }

    // Response score
    const apps = appMap.get(emp.id)
    let response_score: number
    if (!apps || apps.total === 0) {
      response_score = 5
    } else {
      response_score = (apps.confirmed / apps.total) * 10
    }

    // Score final — guard against NaN in any sub-score
    const safe = (s: number) => Number.isFinite(s) ? s : 5
    const score_final = safe(experience_score) * 0.4 + safe(availability_score) * 0.3 + safe(response_score) * 0.3

    // Compliance check
    const compliance_details: string[] = []

    // 1. Dépassement 48h semaine
    const totalWeekWithNew = weeklyPlanned + shiftDuration
    if (totalWeekWithNew > 48) {
      compliance_details.push(`Dépassement 48h semaine (${totalWeekWithNew.toFixed(1)}h)`)
    }

    // 2. Dépassement 10h jour
    const todayHours = (dayHoursMap.get(emp.id) ?? 0) + shiftDuration
    if (todayHours > 10) {
      compliance_details.push(`Dépassement 10h jour (${todayHours.toFixed(1)}h)`)
    }

    // 3. Repos 11h (vérifier shift de la veille)
    const prevShifts = prevDayShiftMap.get(emp.id) ?? []
    for (const ps of prevShifts) {
      const prevEndMin = timeToMinutes(ps.end_time)
      const newStartMin = timeToMinutes(shift.start_time)
      // Repos entre fin du shift précédent (hier) et début du nouveau (aujourd'hui)
      const restMinutes = (newStartMin + 1440) - prevEndMin
      if (restMinutes < 11 * 60) {
        compliance_details.push(`Repos insuffisant (${Math.floor(restMinutes / 60)}h${restMinutes % 60 > 0 ? String(restMinutes % 60).padStart(2, '0') : ''} < 11h)`)
      }
    }

    return {
      employee_id: emp.id,
      full_name: emp.full_name ?? 'Inconnu',
      position: emp.position,
      contract_type: emp.contract_type,
      experience_score: Math.round(experience_score * 10) / 10,
      availability_score: Math.round(availability_score * 10) / 10,
      response_score: Math.round(response_score * 10) / 10,
      score_final: Math.round(score_final * 10) / 10,
      weekly_hours_planned: Math.round(weeklyPlanned * 10) / 10,
      contract_weekly_hours: contractHours,
      compliance_warning: compliance_details.length > 0,
      compliance_details,
      explanation: '', // sera rempli par Claude
    }
  })

  // Trier par score_final DESC, garder les 3 premiers
  scored.sort((a, b) => b.score_final - a.score_final)
  const top3 = scored.slice(0, 3)

  // ── 5. Appel Claude Haiku pour les explications ────────────────────────────

  if (process?.env?.ANTHROPIC_API_KEY) {
    try {
      const candidateDescriptions = top3.map((c, i) => {
        const expDesc = shift.poste_id
          ? `${c.experience_score} fois sur ce poste (90j)`
          : 'Poste non spécifié'
        const availDesc = c.contract_weekly_hours
          ? `${c.weekly_hours_planned}h planifiées / ${c.contract_weekly_hours}h contrat cette semaine`
          : `${c.weekly_hours_planned}h cette semaine (contrat inconnu)`
        const respDesc = appMap.get(c.employee_id)?.total
          ? `${Math.round((appMap.get(c.employee_id)!.confirmed / appMap.get(c.employee_id)!.total) * 100)}% taux de confirmation marketplace`
          : 'Pas de données marketplace'
        return `Candidat ${i + 1} — ${c.full_name} (${c.contract_type ?? 'contrat inconnu'}) :
- Expérience : ${expDesc}
- Disponibilité : ${availDesc}
- Réactivité : ${respDesc}
- Score final : ${c.score_final}/10`
      }).join('\n\n')

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Tu es un assistant RH. Pour chaque candidat ci-dessous, génère UNE phrase courte (max 10 mots, ton direct, en français) qui résume pourquoi ce candidat est recommandé ou non pour remplacer un employé absent.

Format de réponse : une ligne par candidat, numérotée (1. 2. 3.)
Exemples de style :
- "A fait ce poste 9 fois · Disponible · Répond vite"
- "Très disponible · Jamais fait ce poste · Peu de données"
- "Contrat Extra · 22h cette semaine · Bonne réactivité"

${candidateDescriptions}`,
        }],
      })

      const text = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
      const lines = text.split('\n').filter((l: string) => /^\d\./.test(l.trim()))
      lines.forEach((line: string, i: number) => {
        if (top3[i]) {
          top3[i].explanation = line.replace(/^\d\.\s*/, '').trim()
        }
      })
    } catch (e) {
      console.error('[ai/replacement] Claude Haiku error:', e)
      // Fallback : explication auto-générée
      top3.forEach(c => {
        const parts: string[] = []
        if (shift.poste_id) {
          parts.push(c.experience_score >= 5 ? `${Math.round(c.experience_score)} fois sur ce poste` : 'Peu d\'expérience sur ce poste')
        }
        parts.push(c.availability_score >= 7 ? 'Très disponible' : c.availability_score >= 4 ? 'Disponible' : 'Peu disponible')
        if (c.contract_type === 'Extra') parts.push('Contrat Extra')
        c.explanation = parts.join(' · ')
      })
    }
  } else {
    // Sans clé API
    top3.forEach(c => {
      const parts: string[] = []
      if (shift.poste_id && c.experience_score >= 5) parts.push(`${Math.round(c.experience_score)} fois sur ce poste`)
      else if (shift.poste_id) parts.push('Peu d\'expérience sur ce poste')
      parts.push(c.availability_score >= 7 ? 'Très disponible' : 'Disponible')
      c.explanation = parts.join(' · ')
    })
  }

  // ── 6. Créer le replacement_request en DB ──────────────────────────────────

  const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString()

  const candidatesPayload = top3.map(c => ({
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
        const finalCandidates = top3.filter(c => existingCandidateIds.includes(c.employee_id))

        return NextResponse.json({
          replacement_request_id: existingRR.id,
          expires_at: existingRR.expires_at,
          shift: { id: shift.id, date: shift.date, start_time: shift.start_time, end_time: shift.end_time, position: shift.position, poste_id: shift.poste_id },
          candidates: finalCandidates.length > 0 ? finalCandidates : top3,
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
    candidates: top3,
  }, { status: 201 })
}
