import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getSubscription } from '@/lib/subscription'
import { getPlanTier, isPro } from '@/lib/plan-guard'
import { forecastRevenue, sectorTargetPct, median, shiftHours, isoWeekKey, type DayCA } from '@/lib/forecast'
import { solvePlanning } from '@/lib/planning/solver'
import { repairPlan } from '@/lib/planning/repair'
import { applyPlanAdjustment } from '@/lib/planning/adjust'

// La boucle LLM (jusqu'à 12 itérations Claude Sonnet) peut prendre 30–60s sur
// une semaine vierge avec beaucoup d'employés. Sans maxDuration explicite,
// Vercel coupe à 10s (Hobby) → réponse tronquée → "Erreur réseau" côté client.
// 60s couvre les deux tiers (max Hobby, default Pro).
export const maxDuration = 60

const client = new Anthropic()

const FR_DOW = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

function weekRange(weekMonday: string): { weekDays: string[]; weekEndStr: string } {
  const weekStart = new Date(weekMonday + 'T00:00:00')
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekDays: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    weekDays.push(d.toISOString().split('T')[0])
  }
  return { weekDays, weekEndStr: weekEnd.toISOString().split('T')[0] }
}

type Economics = {
  forecast: DayCA[]
  forecastTotal: number
  suggestedTargetPct: number
  targetBasis: 'history' | 'sector'
  historicalRatioPct: number | null
  rateMap: Record<string, number>
}

// Prévision de CA + cible de productivité auto-calibrée (historique → secteur).
async function loadEconomics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  weekMonday: string,
  weekDays: string[],
  weekEndStr: string,
): Promise<Economics> {
  const ws = new Date(weekMonday + 'T00:00:00')
  ws.setDate(ws.getDate() - 56)
  const windowStartStr = ws.toISOString().split('T')[0]

  const [{ data: rev }, { data: histShifts }, { data: contracts }, { data: actSetting }] = await Promise.all([
    supabase.from('revenues').select('date, amount').gte('date', windowStartStr).lte('date', weekEndStr),
    supabase.from('shifts').select('employee_id, date, start_time, end_time, break_minutes').gte('date', windowStartStr).lt('date', weekMonday).is('deleted_at', null),
    supabase.from('contracts').select('employee_id, hourly_rate, start_date').is('deleted_at', null).order('start_date', { ascending: false }),
    supabase.from('settings').select('value').eq('key', 'activity_type').maybeSingle(),
  ])

  const rateMap: Record<string, number> = {}
  for (const c of (contracts ?? []) as { employee_id: string; hourly_rate: number | null }[]) {
    if (!rateMap[c.employee_id] && c.hourly_rate) rateMap[c.employee_id] = Number(c.hourly_rate)
  }

  const pastRevenues: DayCA[] = ((rev ?? []) as { date: string; amount: number }[])
    .map(r => ({ date: r.date, amount: Number(r.amount) }))
    .filter(r => r.date < weekMonday)

  const forecast = forecastRevenue(pastRevenues, weekDays)
  const forecastTotal = forecast.reduce((s, d) => s + d.amount, 0)

  // Ratio coût/CA réalisé par semaine ISO → médiane = point de fonctionnement réel.
  const caByWeek: Record<string, number> = {}
  const costByWeek: Record<string, number> = {}
  for (const r of pastRevenues) {
    if (r.amount > 0) { const k = isoWeekKey(r.date); caByWeek[k] = (caByWeek[k] ?? 0) + r.amount }
  }
  for (const s of (histShifts ?? []) as { employee_id: string; date: string; start_time: string; end_time: string; break_minutes: number | null }[]) {
    const rate = rateMap[s.employee_id]
    if (!rate) continue
    const k = isoWeekKey(s.date)
    costByWeek[k] = (costByWeek[k] ?? 0) + shiftHours(s.start_time, s.end_time, s.break_minutes ?? 0) * rate
  }
  const ratios: number[] = []
  for (const k of Object.keys(caByWeek)) {
    if (caByWeek[k] > 0 && costByWeek[k] > 0) ratios.push((costByWeek[k] / caByWeek[k]) * 100)
  }
  const med = median(ratios)

  if (med != null) {
    // Tenir sa moyenne et grignoter 1 point.
    return { forecast, forecastTotal, suggestedTargetPct: Math.max(10, Math.round(med) - 1), targetBasis: 'history', historicalRatioPct: Math.round(med), rateMap }
  }
  return { forecast, forecastTotal, suggestedTargetPct: sectorTargetPct(actSetting?.value), targetBasis: 'sector', historicalRatioPct: null, rateMap }
}

// GET — aperçu (CA prévu + cible suggérée) pour pré-remplir le modal, sans IA.
export async function GET(req: Request) {
  const supabase = await createClient()
  let estId: string
  try {
    const { profile } = await requireManager(supabase)
    estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
  const weekMonday = new URL(req.url).searchParams.get('week_monday')
  if (!weekMonday) return Response.json({ error: 'week_monday requis' }, { status: 400 })

  // Le copilote de productivité (prévision CA + cible coût/CA) est premium.
  if (!isPro(getPlanTier(await getSubscription(supabase, estId)))) {
    return Response.json({ premium: false, forecastTotal: 0 })
  }

  const { weekDays, weekEndStr } = weekRange(weekMonday)
  const eco = await loadEconomics(supabase, weekMonday, weekDays, weekEndStr)
  return Response.json({
    forecastTotal: eco.forecastTotal,
    suggestedTargetPct: eco.suggestedTargetPct,
    targetBasis: eco.targetBasis,
    historicalRatioPct: eco.historicalRatioPct,
  })
}

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

  // Choix du moteur de génération (réglage par établissement) : 'ai' (LLM) ou
  // 'algorithm' (solveur déterministe gratuit). Default : 'ai' pour préserver
  // le comportement existant.
  const { data: engineSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('establishment_id', estId)
    .eq('key', 'planning_engine')
    .maybeSingle()
  // Défaut = algorithme déterministe (instantané, conforme, gratuit). L'IA est
  // opt-in : on ne l'utilise que si le réglage vaut explicitement 'ai'.
  const engine: 'ai' | 'algorithm' = engineSetting?.value === 'ai' ? 'ai' : 'algorithm'

  const sub  = await getSubscription(supabase, estId)
  const tier = getPlanTier(sub)

  // Guards qui ne s'appliquent qu'au moteur LLM (clé API, quota mensuel).
  if (engine === 'ai') {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'Clé API Anthropic manquante. Ajoutez ANTHROPIC_API_KEY dans vos variables d\'environnement.' },
        { status: 503 }
      )
    }
    if (tier === 'essential') {
      // DB-backed monthly quota: authoritative and persistent (unlike KV/in-memory,
      // which was bypassable across serverless instances).
      const { data: quota, error: quotaErr } = await supabase.rpc('consume_ai_credit', { p_limit: 3 })
      if (quotaErr) {
        return Response.json(
          { error: "Impossible de vérifier votre quota IA pour le moment. Réessayez dans un instant." },
          { status: 503 }
        )
      }
      if (quota && (quota as { allowed: boolean }).allowed === false) {
        return Response.json(
          { error: 'Quota IA atteint', upgrade_url: '/manager/settings/billing' },
          { status: 402 }
        )
      }
    }
  }

  // Rate-limit commun aux deux moteurs (anti-abus).
  const rl = await checkRateLimit({ key: `ai-plan:${authUser.id}`, limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { week_monday, context, target_ratio } = await req.json() as { week_monday: string; context?: string; target_ratio?: number }

  const { weekDays, weekEndStr } = weekRange(week_monday)

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
    supabase.from('settings').select('key, value').in('key', ['collective_agreement', 'opening_time', 'closing_time', 'establishment_name', 'closed_days', 'break_trigger_minutes']),
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

  // Copilote de productivité : prévision de CA + cible coût/CA.
  // Premium (Pro/Multi-site) — les autres plans n'ont pas le forecast.
  const eco = isPro(tier) ? await loadEconomics(supabase, week_monday, weekDays, weekEndStr) : null
  const targetPct = (typeof target_ratio === 'number' && target_ratio > 0) ? Math.round(target_ratio) : (eco?.suggestedTargetPct ?? 0)

  // ── Moteur déterministe (gratuit, instantané, conforme par construction) ──
  // Produit le planning de base. Réutilisé : moteur par défaut, base que l'IA
  // ajuste, et filet de secours si l'IA échoue.
  function solveBaselineShifts(): { shifts: ProposedShift[]; summary: string } {
    const closedDaysIdx: number[] = (() => {
      try { const v = JSON.parse(settingsMap.closed_days ?? '[]'); return Array.isArray(v) ? v.filter((n: unknown) => typeof n === 'number') : [] }
      catch { return [] }
    })()
    const breakTrigger = parseInt(settingsMap.break_trigger_minutes ?? '360', 10) || 360

    const { shifts: algoShifts, summary: algoSummary } = solvePlanning({
      weekDays,
      openingTime: settingsMap.opening_time ?? '07:00',
      closingTime: settingsMap.closing_time ?? '23:00',
      closedDaysIdx,
      employees: (employees ?? []).map(e => ({
        id: e.id,
        full_name: e.full_name ?? 'Sans nom',
        position: e.position ?? null,
        weekly_hours: e.weekly_hours ?? null,
      })),
      leaveByEmployee,
      existingShifts: (existingShifts ?? []).map(s => ({
        employee_id: s.employee_id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        break_minutes: 0,
      })),
      forecast: eco?.forecast ?? null,
      targetPct: eco ? targetPct : null,
      rateMap: eco?.rateMap ?? {},
      breakTriggerMinutes: breakTrigger,
    })

    // Position du shift : si le poste de l'employé existe en base, on remonte
    // le poste_id correspondant (le solveur ne fait pas cette correspondance).
    const posteByName = new Map<string, string>()
    for (const p of (postes ?? [])) if (p.name) posteByName.set(p.name, p.id)
    const enriched = algoShifts.map(s => ({
      ...s,
      poste_id: s.position ? (posteByName.get(s.position) ?? null) : null,
    }))

    // Filet de sécurité : zéro infraction actionnable (no-op sur la sortie du
    // solveur, déjà conforme par construction).
    const { shifts: cleaned } = repairPlan(enriched)
    return { shifts: cleaned, summary: algoSummary }
  }

  // Coût main d'œuvre + ratio coût/CA d'un ensemble de créneaux (premium).
  function costFor(shifts: ProposedShift[]): { estimatedCost: number; estimatedRatioPct: number | null } {
    let cost = 0
    if (eco) {
      for (const s of shifts) {
        const rate = eco.rateMap[s.employee_id]
        if (rate) cost += shiftHours(s.start_time, s.end_time, s.break_minutes) * rate
      }
    }
    const ratio = (eco && eco.forecastTotal > 0 && cost > 0)
      ? Math.round((cost / eco.forecastTotal) * 100)
      : null
    return { estimatedCost: Math.round(cost), estimatedRatioPct: ratio }
  }

  // Enveloppe de réponse commune (algo et IA).
  function planPayload(shifts: ProposedShift[], summary: string, engine: 'ai' | 'algorithm', extra?: Record<string, unknown>) {
    const { estimatedCost, estimatedRatioPct } = costFor(shifts)
    return {
      shifts,
      summary,
      forecastTotal: eco?.forecastTotal ?? 0,
      targetPct,
      targetBasis: eco?.targetBasis ?? 'sector',
      historicalRatioPct: eco?.historicalRatioPct ?? null,
      estimatedCost,
      estimatedRatioPct,
      engine,
      ...extra,
    }
  }

  async function buildAlgorithmResponse(feature: string) {
    const { shifts, summary } = solveBaselineShifts()
    // Compteur de génération (illimité, juste pour le suivi).
    try { await supabase.rpc('consume_ai_credit', { p_limit: 1_000_000, p_feature: feature }) } catch { /* non bloquant */ }
    return planPayload(shifts, summary, 'algorithm')
  }

  if (engine === 'algorithm') {
    return Response.json(await buildAlgorithmResponse('plan_algo'))
  }

  const economicsSection = eco && eco.forecastTotal > 0 ? `
## Prévision d'activité (chiffre d'affaires estimé, basé sur l'historique)
${eco.forecast.map(d => `- ${d.date} (${FR_DOW[new Date(d.date + 'T12:00:00').getDay()]}) : ~${d.amount} €`).join('\n')}
CA total prévu : ~${eco.forecastTotal} € sur la semaine.

## Objectif de productivité — coût main d'œuvre / CA
- Cible : ${targetPct} % du CA.
- Dimensionne l'effectif selon le CA prévu : renforce les jours et services à fort CA, allège nettement les jours creux.
- Vise une couverture suffisante AU MOINDRE COÛT pour tenir cette cible, sans jamais descendre sous le minimum opérationnel de sécurité.
` : ''

  // ── Branche IA : un seul appel qui AJUSTE un planning de base déterministe ─
  // On part d'un planning déjà conforme (instantané) et on demande à Claude
  // UNIQUEMENT les changements à appliquer selon le texte du manager. La sortie
  // est courte (un diff) → un seul appel rapide et borné, au lieu d'une boucle
  // multi-tours qui regénérait tout (lente → timeout 60s Vercel).
  const base = solveBaselineShifts()

  const basePlanText = base.shifts.length
    ? base.shifts
        .slice()
        .sort((a, b) => (a.date === b.date ? a.employee_id.localeCompare(b.employee_id) : a.date.localeCompare(b.date)))
        .map(s => `- ${s.date} | emp:${s.employee_id} (${s.employee_name}) | ${s.start_time}-${s.end_time} | pause ${s.break_minutes}min`)
        .join('\n')
    : '(planning de base vide)'

  const systemPrompt = `Tu es l'assistant IA de Quartzbase, expert en plannings pour la restauration française.
Un planning de BASE déjà conforme au Code du travail vient d'être généré automatiquement. Ta mission : l'AJUSTER selon la demande du manager, en changeant le MOINS possible.

## Établissement : ${settingsMap.establishment_name ?? 'Non renseigné'}
- Convention collective : ${settingsMap.collective_agreement ?? 'Non définie — règles générales'}
- Horaires d'ouverture : ${settingsMap.opening_time ?? '?'} → ${settingsMap.closing_time ?? '?'}
- Semaine : ${week_monday} (lundi) au ${weekEndStr} (dimanche)

## Employés (${employees?.length ?? 0})
${employees?.map(e => {
  const offDays = leaveByEmployee[e.id]
  return `- ID: ${e.id} | ${e.full_name ?? 'Sans nom'} | Poste: ${e.position ?? '—'} | ${e.contract_type ?? '—'} | ${e.weekly_hours ?? '?'}h/sem${offDays ? ` | ABSENT: ${offDays.join(', ')}` : ''}`
}).join('\n') ?? 'Aucun employé'}

## Postes disponibles
${postes?.map(p => `- ID: ${p.id} | ${p.name} | pause standard: ${p.break_minutes}min`).join('\n') ?? 'Aucun poste défini'}

## Planning de BASE (déjà conforme — point de départ à ajuster)
${basePlanText}
${economicsSection}
## Règles légales à respecter ABSOLUMENT
- Volume horaire respecté : un employé Xh/sem totalise ~X h (un 35h fait ~35h).
- Max 10h effectives/jour, un seul service par employé par jour.
- Min 11h de repos entre deux services (garde des débuts réguliers d'un jour à l'autre).
- Max 6 jours/semaine, max 48h/semaine, amplitude ≤ 13h.
- Ne JAMAIS planifier un employé marqué ABSENT.
- Pause de 30 min dès qu'un service dépasse 6h.

## Demande du manager
${context?.trim() || 'Aucune instruction particulière — garde le planning de base tel quel (renvoie un diff vide).'}

## Comment répondre
Appelle l'outil adjust_planning UNE seule fois :
- "clear" : créneaux de base à SUPPRIMER (employee_id + date) — pour ceux que tu retires ou déplaces.
- "add" : créneaux à AJOUTER. Pour MODIFIER un créneau de base, ajoute la nouvelle version dans "add" (même employee_id + date) : l'ancienne sera écrasée automatiquement.
- "summary" : 1-2 phrases décrivant tes changements.
Ne touche PAS aux créneaux non concernés (ni dans clear ni dans add). Si la demande n'exige aucun changement, renvoie clear et add vides.`

  const adjustTool: Anthropic.Tool = {
    name: 'adjust_planning',
    description: 'Applique des changements (suppressions + ajouts) au planning de base.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clear: {
          type: 'array',
          description: 'Créneaux de base à supprimer (par employé + jour).',
          items: {
            type: 'object',
            properties: {
              employee_id: { type: 'string' },
              date: { type: 'string', description: 'YYYY-MM-DD' },
            },
            required: ['employee_id', 'date'],
          },
        },
        add: {
          type: 'array',
          description: 'Créneaux à ajouter (ou versions modifiées de créneaux existants).',
          items: {
            type: 'object',
            properties: {
              employee_id: { type: 'string', description: 'ID de l\'employé' },
              date: { type: 'string', description: 'YYYY-MM-DD' },
              start_time: { type: 'string', description: 'HH:MM' },
              end_time: { type: 'string', description: 'HH:MM' },
              break_minutes: { type: 'number', description: 'Pause en minutes (0 si aucune)' },
              poste_id: { type: 'string', description: 'ID de poste (optionnel)' },
              notes: { type: 'string', description: 'Notes (optionnel)' },
            },
            required: ['employee_id', 'date', 'start_time', 'end_time', 'break_minutes'],
          },
        },
        summary: { type: 'string', description: 'Résumé court des changements (1-2 phrases).' },
      },
      required: ['clear', 'add'],
    },
  }

  type RawAdd = { employee_id?: string; date?: string; start_time?: string; end_time?: string; break_minutes?: number; poste_id?: string; notes?: string }
  type AdjustInput = { clear?: { employee_id?: string; date?: string }[]; add?: RawAdd[]; summary?: string }

  let aiShifts: ProposedShift[] | null = null
  let aiSummary = ''

  try {
    // Un SEUL appel, borné à 35s, sans retry SDK (sinon le retry sur timeout
    // ferait dépasser maxDuration 60s). tool_choice force le diff structuré.
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      tools: [adjustTool],
      tool_choice: { type: 'tool', name: 'adjust_planning' },
      messages: [{ role: 'user', content: 'Renvoie le diff (clear + add) à appliquer au planning de base selon la demande du manager.' }],
    }, { timeout: 35_000, maxRetries: 0 })

    const toolUse = response.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined
    if (toolUse && toolUse.name === 'adjust_planning') {
      const input = (toolUse.input ?? {}) as AdjustInput

      const clear = (input.clear ?? [])
        .filter(c => !!c.employee_id && !!c.date)
        .map(c => ({ employee_id: c.employee_id!, date: c.date! }))

      const add: ProposedShift[] = (input.add ?? [])
        .filter(s => !!s.employee_id && !!s.date && !!s.start_time && !!s.end_time)
        .map(s => {
          // Ne garder un poste_id que s'il existe vraiment (sinon insert rejeté).
          const poste = s.poste_id ? posteMap[s.poste_id] : undefined
          return {
            employee_id: s.employee_id!,
            employee_name: employeeNameMap[s.employee_id!] ?? s.employee_id!,
            date: s.date!,
            start_time: s.start_time!,
            end_time: s.end_time!,
            break_minutes: s.break_minutes ?? 0,
            poste_id: poste ? (s.poste_id ?? null) : null,
            position: poste?.name ?? employeePositionMap[s.employee_id!] ?? null,
            notes: s.notes ?? null,
          }
        })

      const adjusted = applyPlanAdjustment(base.shifts, { clear, add })
      // Filet conformité : retire tout créneau (ajouté par l'IA) qui créerait
      // une infraction. No-op sur la base, déjà conforme.
      const { shifts: cleaned } = repairPlan(adjusted)
      aiShifts = cleaned
      aiSummary = input.summary ?? ''
    }
  } catch (e) {
    // Échec / timeout → on garde le planning de base (jamais d'erreur de délai).
    console.error('[ai/plan] adjust error → base déterministe:', e instanceof Error ? e.message : e)
  }

  const usedAi = aiShifts != null && aiShifts.length > 0
  const finalShifts = usedAi ? aiShifts! : base.shifts

  // Compteur IA. Le plan Essentiel est déjà décompté en amont (gate 3/mois) ;
  // les autres plans sont enregistrés ici. On distingue le repli pour le suivi.
  if (tier !== 'essential') {
    try { await supabase.rpc('consume_ai_credit', { p_limit: 1_000_000, p_feature: usedAi ? 'plan' : 'plan_ai_fallback' }) } catch { /* non bloquant */ }
  }

  return Response.json(planPayload(
    finalShifts,
    usedAi ? (aiSummary || 'Planning ajusté par l\'IA selon vos instructions.') : base.summary,
    'ai',
    { aiFallback: !usedAi },
  ))
}
