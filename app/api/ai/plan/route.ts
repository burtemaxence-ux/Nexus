import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getSubscription } from '@/lib/subscription'
import { getPlanTier, isPro } from '@/lib/plan-guard'
import { forecastRevenue, sectorTargetPct, median, shiftHours, isoWeekKey, type DayCA } from '@/lib/forecast'
import { solvePlanning } from '@/lib/planning/solver'
import { repairPlan } from '@/lib/planning/repair'
import { collectProposedShifts } from '@/lib/planning/plan-tools'

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
  const engine: 'ai' | 'algorithm' = engineSetting?.value === 'algorithm' ? 'algorithm' : 'ai'

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
      // On VÉRIFIE ici (lecture seule) sans décompter : le crédit n'est débité
      // qu'après une génération réussie (cf. plus bas). Sinon un échec LLM (502)
      // brûlerait un des 3 crédits mensuels pour rien.
      const { data: used, error: quotaErr } = await supabase.rpc('get_ai_usage', { p_feature: 'plan' })
      if (quotaErr) {
        return Response.json(
          { error: "Impossible de vérifier votre quota IA pour le moment. Réessayez dans un instant." },
          { status: 503 }
        )
      }
      if (typeof used === 'number' && used >= 3) {
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
    supabase.from('profiles').select('id, full_name, position, contract_type, weekly_hours, birth_date').eq('role', 'employee').eq('archived', false).limit(200),
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
  // Métadonnées pour le réparateur de conformité (mineurs, temps partiel,
  // heures contractuelles) : le filet de sécurité retire les créneaux illégaux.
  const repairMeta = (employees ?? []).map(e => ({
    id: e.id,
    birthDate: e.birth_date ?? null,
    contractType: e.contract_type ?? null,
    weeklyHours: e.weekly_hours ?? null,
  }))

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

  // ── Branche algorithme déterministe (gratuit, instantané, auditable) ─────
  if (engine === 'algorithm') {
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

    // Filet de sécurité : garantit zéro infraction actionnable (no-op sur la
    // sortie du solveur, déjà conforme par construction).
    const { shifts: cleaned } = repairPlan(enriched, repairMeta)

    // Coût main d'œuvre estimé (premium).
    let algoCost = 0
    if (eco) {
      for (const s of cleaned) {
        const rate = eco.rateMap[s.employee_id]
        if (rate) algoCost += shiftHours(s.start_time, s.end_time, s.break_minutes) * rate
      }
    }
    const algoRatioPct = (eco && eco.forecastTotal > 0 && algoCost > 0)
      ? Math.round((algoCost / eco.forecastTotal) * 100)
      : null

    // Compteur de génération par algorithme (illimité, juste pour le suivi).
    try { await supabase.rpc('consume_ai_credit', { p_limit: 1_000_000, p_feature: 'plan_algo' }) } catch { /* non bloquant */ }

    return Response.json({
      shifts: cleaned,
      summary: algoSummary,
      forecastTotal: eco?.forecastTotal ?? 0,
      targetPct,
      targetBasis: eco?.targetBasis ?? 'sector',
      historicalRatioPct: eco?.historicalRatioPct ?? null,
      estimatedCost: Math.round(algoCost),
      estimatedRatioPct: algoRatioPct,
      engine: 'algorithm',
    })
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

  const systemPrompt = `Tu es l'assistant IA de Quartzbase, expert en génération de plannings pour la restauration française.

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
${economicsSection}
## Règles légales à respecter ABSOLUMENT (aucune infraction tolérée)
- Respecte le volume horaire de chaque employé : un employé Xh/sem doit totaliser ~X h sur la semaine (ni nettement moins, ni plus). Un 35h fait ~35h, pas 16h ni 23h.
- Maximum 10h de travail effectif par jour, et un seul service par employé par jour.
- Minimum 11h de repos entre la fin d'un service et le début du suivant. En pratique : pour un même employé, garde des horaires de début RÉGULIERS d'un jour à l'autre (ne fais jamais finir tard le soir puis commencer tôt le lendemain).
- Maximum 6 jours travaillés par semaine et par employé (repos hebdomadaire obligatoire).
- Maximum 48h par semaine.
- Amplitude d'une journée ≤ 13h (début → fin).
- Ne JAMAIS planifier un employé marqué ABSENT.
- Pause de 30 min dès qu'un service dépasse 6h.

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

  try {
    for (let iteration = 0; iteration < 16; iteration++) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: [tool],
        messages,
      })

      messages.push({ role: 'assistant', content: response.content })

      // Texte libre → résumé (on garde le dernier émis).
      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
      if (text) summary = text

      // CRITIQUE : chaque bloc tool_use DOIT recevoir un tool_result, quel que
      // soit le stop_reason (cf. lib/planning/plan-tools). Sinon l'appel suivant
      // échoue (« tool_use ids found without tool_result »).
      const { shifts: newShifts, toolResults, hasToolUse } = collectProposedShifts(
        response.content,
        { employeeNameMap, employeePositionMap, posteMap },
      )
      proposedShifts.push(...newShifts)

      if (!hasToolUse) break // plus d'outil en attente → terminé
      messages.push({ role: 'user', content: toolResults })
    }
  } catch (e) {
    // Toute exception du SDK Anthropic (5xx, rate-limit, timeout) doit
    // remonter en JSON exploitable côté client — sinon le fetch tombe sur
    // une réponse non-JSON et le frontend affiche un générique « Erreur
    // réseau ». Inclut un repli vers le moteur déterministe.
    console.error('[ai/plan] Anthropic error:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return Response.json(
      { error: `La génération IA a échoué (${msg}). Vous pouvez réessayer ou basculer sur l'algorithme déterministe dans Réglages › Planning.` },
      { status: 502 },
    )
  }

  // Filet de sécurité conformité : l'IA peut proposer des créneaux en
  // infraction (repos, 10h/jour, 6 jours…). On retire les fautifs pour que le
  // planning appliqué soit propre — le manager complète ensuite.
  const { shifts: cleanedAi } = repairPlan(proposedShifts, repairMeta)

  // Coût main d'œuvre estimé du planning proposé → ratio coût/CA estimé (premium).
  let estimatedCost = 0
  if (eco) {
    for (const s of cleanedAi) {
      const rate = eco.rateMap[s.employee_id]
      if (rate) estimatedCost += shiftHours(s.start_time, s.end_time, s.break_minutes) * rate
    }
  }
  const estimatedRatioPct = (eco && eco.forecastTotal > 0 && estimatedCost > 0)
    ? Math.round((estimatedCost / eco.forecastTotal) * 100)
    : null

  // Compteur de génération IA, décompté ici uniquement après une génération
  // réussie. Le plan Essentiel applique sa limite de 3/mois (le RPC est atomique
  // et re-plafonne en cas de course) ; les autres plans sont juste enregistrés.
  {
    const consumeLimit = tier === 'essential' ? 3 : 1_000_000
    try { await supabase.rpc('consume_ai_credit', { p_limit: consumeLimit, p_feature: 'plan' }) } catch { /* non bloquant */ }
  }

  return Response.json({
    shifts: cleanedAi,
    summary,
    forecastTotal: eco?.forecastTotal ?? 0,
    targetPct,
    targetBasis: eco?.targetBasis ?? 'sector',
    historicalRatioPct: eco?.historicalRatioPct ?? null,
    estimatedCost: Math.round(estimatedCost),
    estimatedRatioPct,
    engine: 'ai',
  })
}
