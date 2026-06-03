import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getSubscription } from '@/lib/subscription'
import { getPlanTier } from '@/lib/plan-guard'

const client = new Anthropic()

export type ProposedShift = {
  employee_id: string
  employee_name: string
  date: string
  start_time: string
  end_time: string
  break_minutes: number
  poste_id: string | null
  position: string | null
  notes: string | null
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'Clé API Anthropic manquante. Ajoutez ANTHROPIC_API_KEY dans vos variables d\'environnement.' },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  let authUser: { id: string }
  let estId: string
  try {
    const { user, profile } = await requireManager(supabase)
    authUser = user
    estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  // ── Guard : quota IA mensuel pour le plan Essentiel ───────────────
  const sub  = await getSubscription(supabase, estId)
  const tier = getPlanTier(sub)

  if (tier === 'essential') {
    const rlMonthly = await checkRateLimit({
      key: `ai-plan-monthly:${estId}`,
      limit: 3,
      windowMs: 30 * 24 * 60 * 60 * 1000,
    })
    if (!rlMonthly.allowed) {
      return Response.json(
        { error: 'Quota IA atteint', upgrade_url: '/manager/settings/billing' },
        { status: 402 }
      )
    }
  }
  // ─────────────────────────────────────────────────────────────────

  const rl = await checkRateLimit({ key: `ai-plan:${authUser.id}`, limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { week_monday, context } = await req.json() as { week_monday: string; context?: string }

  const weekStart = new Date(week_monday + 'T00:00:00')
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const weekDays: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    weekDays.push(d.toISOString().split('T')[0])
  }

  const [
    { data: employees },
    { data: leaves },
    { data: existingShifts },
    { data: postes },
    { data: settings },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, position, contract_type, weekly_hours').eq('role', 'employee').eq('archived', false).limit(200),
    supabase.from('leave_requests')
      .select('employee_id, type, start_date, end_date, profiles(full_name)')
      .lte('start_date', weekEndStr)
      .gte('end_date', week_monday)
      .in('status', ['approved', 'pending']),
    supabase.from('shifts').select('employee_id, date, start_time, end_time, position').gte('date', week_monday).lte('date', weekEndStr).is('deleted_at', null),
    supabase.from('postes').select('id, name, break_minutes'),
    supabase.from('settings').select('key, value').in('key', ['collective_agreement', 'opening_time', 'closing_time', 'establishment_name']),
  ])

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))
  const posteMap = Object.fromEntries((postes ?? []).map(p => [p.id, p]))
  const employeeNameMap = Object.fromEntries((employees ?? []).map(e => [e.id, e.full_name ?? e.id]))
  const employeePositionMap = Object.fromEntries((employees ?? []).map(e => [e.id, e.position ?? null]))

  // Map employees on leave per day
  type LeaveRow = { employee_id: string; type: string; start_date: string; end_date: string; profiles: unknown }
  const leaveByEmployee: Record<string, string[]> = {}
  for (const leave of (leaves ?? []) as unknown as LeaveRow[]) {
    for (const day of weekDays) {
      if (day >= leave.start_date && day <= leave.end_date) {
        if (!leaveByEmployee[leave.employee_id]) leaveByEmployee[leave.employee_id] = []
        leaveByEmployee[leave.employee_id].push(day)
      }
    }
  }

  const systemPrompt = `Tu es l'assistant IA de Nexus, expert en génération de plannings pour la restauration française.

## Établissement : ${settingsMap.establishment_name ?? 'Non renseigné'}
- Convention collective : ${settingsMap.collective_agreement ?? 'Non définie — applique les règles générales'}
- Horaires d'ouverture : ${settingsMap.opening_time ?? '?'} → ${settingsMap.closing_time ?? '?'}
- Semaine : ${week_monday} (lundi) au ${weekEndStr} (dimanche)

## Employés actifs (${employees?.length ?? 0})
${employees?.map(e => {
  const offDays = leaveByEmployee[e.id]
  return `- ID: ${e.id} | ${e.full_name ?? 'Sans nom'} | Poste: ${e.position ?? '—'} | ${e.contract_type ?? '—'} | ${e.weekly_hours ?? '?'}h/sem${offDays ? ` | ABSENT: ${offDays.join(', ')}` : ''}`
}).join('\n') ?? 'Aucun employé'}

## Postes disponibles
${postes?.map(p => `- ID: ${p.id} | ${p.name} | pause standard: ${p.break_minutes}min`).join('\n') ?? 'Aucun poste défini'}

## Shifts déjà planifiés cette semaine
${existingShifts?.length ? existingShifts.map(s => `- ${employeeNameMap[s.employee_id] ?? s.employee_id} | ${s.date} | ${s.start_time}-${s.end_time} | ${s.position ?? '—'}`).join('\n') : 'Aucun shift existant — semaine vierge'}

## Règles légales à respecter
- Maximum 10h de travail effectif par jour
- Minimum 11h de repos entre deux shifts consécutifs
- Maximum 48h par semaine (idéal : respecter le contrat hebdomadaire)
- Ne JAMAIS planifier un employé marqué ABSENT
- Pause obligatoire si shift > 6h

## Demande du manager
${context?.trim() || 'Générer un planning équilibré pour toute la semaine en couvrant les besoins standard de l\'établissement.'}

Utilise l'outil propose_shift pour chaque créneau. Après avoir créé tous les shifts, écris un bref résumé (2-3 phrases) de ta logique.`

  const tool: Anthropic.Tool = {
    name: 'propose_shift',
    description: 'Propose un créneau horaire pour un employé. Appelle cet outil une fois par shift à créer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        employee_id: { type: 'string', description: 'UUID de l\'employé' },
        date: { type: 'string', description: 'Date YYYY-MM-DD' },
        start_time: { type: 'string', description: 'Heure début HH:MM' },
        end_time: { type: 'string', description: 'Heure fin HH:MM' },
        break_minutes: { type: 'number', description: 'Durée pause en minutes (0 si aucune)' },
        poste_id: { type: 'string', description: 'ID du poste (optionnel)' },
        notes: { type: 'string', description: 'Notes optionnelles' },
      },
      required: ['employee_id', 'date', 'start_time', 'end_time', 'break_minutes'],
    },
  }

  const proposedShifts: ProposedShift[] = []
  let summary = ''

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: 'Génère le planning complet pour cette semaine.' },
  ]

  for (let iteration = 0; iteration < 12; iteration++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools: [tool],
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      for (const block of response.content) {
        if (block.type === 'text') summary += block.text
      }
      break
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type === 'tool_use' && block.name === 'propose_shift') {
          const input = block.input as {
            employee_id: string
            date: string
            start_time: string
            end_time: string
            break_minutes: number
            poste_id?: string
            notes?: string
          }
          proposedShifts.push({
            employee_id: input.employee_id,
            employee_name: employeeNameMap[input.employee_id] ?? input.employee_id,
            date: input.date,
            start_time: input.start_time,
            end_time: input.end_time,
            break_minutes: input.break_minutes ?? 0,
            poste_id: input.poste_id ?? null,
            position: input.poste_id
              ? (posteMap[input.poste_id]?.name ?? employeePositionMap[input.employee_id])
              : employeePositionMap[input.employee_id],
            notes: input.notes ?? null,
          })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `OK: ${input.date} ${input.start_time}-${input.end_time} pour ${employeeNameMap[input.employee_id] ?? input.employee_id}`,
          })
        }
      }
      messages.push({ role: 'user', content: toolResults })
    }
  }

  return Response.json({ shifts: proposedShifts, summary })
}
