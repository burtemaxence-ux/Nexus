import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getSubscription } from '@/lib/subscription'
import { getPlanTier, isPro } from '@/lib/plan-guard'
import { forecastRevenue, sectorTargetPct, median, shiftHours, isoWeekKey, type DayCA } from '@/lib/forecast'
import { solvePlanning } from '@/lib/planning/solver'
import { repairPlan, shiftKey } from '@/lib/planning/repair'
import { collectProposedShifts } from '@/lib/planning/plan-tools'

// La boucle LLM (1 aller-retour Anthropic par lot de créneaux, jusqu'à
// AI_LOOP_ITERATIONS_LIMIT) peut prendre 30–60s sur une semaine vierge avec
// beaucoup d'employés. Sans maxDuration explicite, Vercel coupe à 10s (Hobby)
// → réponse tronquée → "Erreur réseau" côté client. 60s couvre les deux tiers
// (max Hobby, default Pro).
export const maxDuration = 60

// Marge sous maxDuration pour arrêter la boucle LLM AVANT que Vercel ne tue la
// fonction (ce qui renvoie un 504 non-JSON → « Erreur réseau » côté client,
// avec zéro créneau récupérable). On préfère un plan partiel (créneaux déjà
// acceptés + repairPlan) à une coupure sèche. C'est ce délai — pas le compteur
// d'itérations ci-dessous — qui borne le temps réel de la boucle : le compteur
// n'est qu'un filet de sécurité généreux pour les cas rapides (peu d'employés)
// où le délai n'est jamais atteint.
const AI_LOOP_DEADLINE_MS = 42_000
const ANTHROPIC_CALL_TIMEOUT_MS = 20_000
const AI_LOOP_ITERATIONS_LIMIT = 40

// Génération JOUR PAR JOUR (target_date fourni) : le client (ai-plan-modal)
// appelle cet endpoint une fois par jour de la semaine plutôt qu'une seule
// fois pour les 7 jours. Un seul jour demande beaucoup moins d'allers-retours
// LLM, donc un budget de temps plus court suffit largement — et ça borne le
// pire cas à ~20s par requête HTTP au lieu de ~42s pour la semaine entière.
const AI_LOOP_DEADLINE_MS_PER_DAY = 20_000
const AI_LOOP_ITERATIONS_LIMIT_PER_DAY = 12

const client = new Anthropic()

const FR_DOW = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
// Abréviations indexées comme la table availabilities (0=lundi … 6=dimanche).
const FR_DOW_SHORT = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

// 0 = lundi … 6 = dimanche (aligné sur closed_days, cf. lib/planning/solver.ts).
function isoDayIdx(date: string): number {
  return (new Date(date + 'T00:00:00').getDay() + 6) % 7
}

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

// Moteur de génération de l'établissement. 'algorithm' (déterministe,
// instantané, conforme par construction) est le DÉFAUT ; 'ai' (LLM, texte
// libre) uniquement si explicitement choisi dans Réglages › Règles.
async function readEngine(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estId: string,
): Promise<'ai' | 'algorithm'> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('establishment_id', estId)
    .eq('key', 'planning_engine')
    .maybeSingle()
  return data?.value === 'ai' ? 'ai' : 'algorithm'
}

// GET — aperçu (moteur actif + CA prévu + cible suggérée) pour pré-remplir le
// modal, sans IA. Le moteur est renvoyé pour TOUS les plans : le modal choisit
// le bon flux (algorithme = 1 appel semaine entière ; IA = jour par jour).
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

  const engine = await readEngine(supabase, estId)

  // Le copilote de productivité (prévision CA + cible coût/CA) est premium.
  if (!isPro(getPlanTier(await getSubscription(supabase, estId)))) {
    return Response.json({ premium: false, forecastTotal: 0, engine })
  }

  const { weekDays, weekEndStr } = weekRange(weekMonday)
  const eco = await loadEconomics(supabase, weekMonday, weekDays, weekEndStr)
  return Response.json({
    forecastTotal: eco.forecastTotal,
    suggestedTargetPct: eco.suggestedTargetPct,
    targetBasis: eco.targetBasis,
    historicalRatioPct: eco.historicalRatioPct,
    engine,
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
  const requestStartedAt = Date.now()
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

  const {
    week_monday, context, target_ratio, target_date, is_last_day, engine: engineOverride,
  } = await req.json() as {
    week_monday: string; context?: string; target_ratio?: number
    // Génération jour par jour (cf. AI_LOOP_DEADLINE_MS_PER_DAY) : target_date
    // restreint la génération à ce seul jour. Le contexte des jours précédents
    // vient directement de la base (existingProposed) — ils sont déjà
    // enregistrés au moment où le jour courant est généré. is_last_day indique
    // le dernier appel de la série, pour ne décompter qu'UN seul crédit IA par
    // semaine générée (pas un par jour). `engine` : override explicite du
    // moteur choisi côté client (toggle du modal) — évite toute désynchro avec
    // le réglage en base si celui-ci vient d'être changé (course PATCH/POST).
    target_date?: string; is_last_day?: boolean; engine?: string
  }

  // Choix du moteur de génération : override explicite du client s'il est
  // fourni (toggle du modal), sinon réglage par établissement. 'algorithm'
  // (solveur déterministe, instantané, conforme par construction) par DÉFAUT ;
  // 'ai' (LLM, texte libre) seulement si explicitement choisi.
  const engine: 'ai' | 'algorithm' = engineOverride === 'ai' || engineOverride === 'algorithm'
    ? engineOverride
    : await readEngine(supabase, estId)

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

  // Rate-limit commun aux deux moteurs (anti-abus). Une génération IA « jour
  // par jour » (cf. target_date) fait jusqu'à 7 appels à cet endpoint pour
  // UNE seule action manager — la limite est donc dimensionnée en appels
  // HTTP, pas en générations logiques (40 ≈ 5-6 semaines régénérées/heure).
  const rl = await checkRateLimit({ key: `ai-plan:${authUser.id}`, limit: 40, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { weekDays, weekEndStr } = weekRange(week_monday)
  const dayScoped = typeof target_date === 'string' && weekDays.includes(target_date)

  const [
    { data: employees },
    { data: leaves },
    { data: existingShifts },
    { data: postes },
    { data: settings },
    { data: availRows },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, position, contract_type, weekly_hours, birth_date').eq('role', 'employee').eq('archived', false).limit(200),
    supabase.from('leave_requests')
      .select('employee_id, type, start_date, end_date, profiles(full_name)')
      .lte('start_date', weekEndStr)
      .gte('end_date', week_monday)
      .in('status', ['approved', 'pending']),
    supabase.from('shifts').select('employee_id, date, start_time, end_time, position, break_minutes').gte('date', week_monday).lte('date', weekEndStr).is('deleted_at', null),
    supabase.from('postes').select('id, name, break_minutes'),
    supabase.from('settings').select('key, value').in('key', ['collective_agreement', 'opening_time', 'closing_time', 'establishment_name', 'closed_days', 'break_trigger_minutes']),
    supabase.from('availabilities').select('employee_id, day_of_week, start_time, end_time').limit(2000),
  ])

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))
  // Jours fermés (index 0=lundi..6=dimanche) : utilisé par le solveur ET par la
  // génération IA jour par jour (pour répondre instantanément sans appeler le
  // LLM quand target_date tombe un jour de fermeture).
  const closedDaysIdx: number[] = (() => {
    try { const v = JSON.parse(settingsMap.closed_days ?? '[]'); return Array.isArray(v) ? v.filter((n: unknown) => typeof n === 'number') : [] }
    catch { return [] }
  })()
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

  // Créneaux DÉJÀ enregistrés cette semaine, convertis au format ProposedShift.
  // Ils sont passés au réparateur ET au contrôle de conformité temps réel comme
  // contexte VERROUILLÉ : la conformité est évaluée sur la semaine complète
  // (repos entre jours, jours consécutifs, heures hebdo…) mais ces créneaux ne
  // sont jamais supprimés ni renvoyés au client (il les a déjà). Corrige les
  // infractions qui n'apparaissaient qu'après coup sur les semaines déjà
  // partiellement remplies.
  const existingProposed: ProposedShift[] = (existingShifts ?? []).map(s => ({
    employee_id: s.employee_id,
    employee_name: employeeNameMap[s.employee_id] ?? s.employee_id,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    break_minutes: s.break_minutes ?? 0,
    poste_id: null,
    position: s.position ?? null,
    notes: null,
  }))
  const lockedKeys = new Set(existingProposed.map(shiftKey))

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

  // Disponibilités déclarées (table availabilities, 0=lundi…6=dimanche) :
  // respectées par les DEUX moteurs — le solveur par construction, le LLM via
  // le prompt + le rejet en temps réel (cf. plan-tools.availabilityIssue).
  const availabilityByEmployee: Record<string, { day_of_week: number; start_time: string; end_time: string }[]> = {}
  const knownEmployeeIds = new Set((employees ?? []).map(e => e.id))
  for (const a of (availRows ?? []) as { employee_id: string; day_of_week: number; start_time: string; end_time: string }[]) {
    if (!knownEmployeeIds.has(a.employee_id)) continue
    if (!availabilityByEmployee[a.employee_id]) availabilityByEmployee[a.employee_id] = []
    availabilityByEmployee[a.employee_id].push({ day_of_week: a.day_of_week, start_time: a.start_time, end_time: a.end_time })
  }

  // Copilote de productivité : prévision de CA + cible coût/CA.
  // Premium (Pro/Multi-site) — les autres plans n'ont pas le forecast.
  const eco = isPro(tier) ? await loadEconomics(supabase, week_monday, weekDays, weekEndStr) : null
  const targetPct = (typeof target_ratio === 'number' && target_ratio > 0) ? Math.round(target_ratio) : (eco?.suggestedTargetPct ?? 0)

  // ── Branche algorithme déterministe (gratuit, instantané, auditable) ─────
  if (engine === 'algorithm') {
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
      availabilityByEmployee,
      existingShifts: (existingShifts ?? []).map(s => ({
        employee_id: s.employee_id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        break_minutes: s.break_minutes ?? 0,
      })),
      forecast: eco?.forecast ?? null,
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

    // Filet de sécurité : garantit zéro infraction actionnable, en tenant
    // compte des créneaux DÉJÀ en base (verrouillés) — sinon le solveur peut
    // créer un shift qui casse le repos de 11h contre un jour déjà planifié.
    // On ne renvoie ensuite que les NOUVEAUX créneaux (les existants sont déjà
    // enregistrés).
    const { shifts: repairedAll } = repairPlan([...existingProposed, ...enriched], repairMeta, lockedKeys)
    const cleaned = repairedAll.filter(s => !lockedKeys.has(shiftKey(s)))

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

  // Ne décompter qu'UN SEUL crédit IA pour toute la semaine, même si le client
  // fait 7 appels (un par jour) : sur une génération jour par jour, seul le
  // dernier appel (is_last_day) décompte. Sur une génération semaine entière
  // (target_date absent, comportement historique), on décompte comme avant.
  const shouldConsumeAiCredit = !dayScoped || is_last_day === true

  // Génération jour par jour tombant un jour de fermeture : rien à planifier,
  // on répond immédiatement sans appeler le LLM (économise un aller-retour
  // inutile). On respecte quand même is_last_day pour ne pas perdre le
  // décompte du crédit si ce jour fermé est le dernier de la boucle côté
  // client (ex. dimanche fermé = 7ème et dernier appel).
  if (dayScoped && closedDaysIdx.includes(isoDayIdx(target_date!))) {
    if (shouldConsumeAiCredit) {
      const consumeLimit = tier === 'essential' ? 3 : 1_000_000
      try { await supabase.rpc('consume_ai_credit', { p_limit: consumeLimit, p_feature: 'plan' }) } catch { /* non bloquant */ }
    }
    return Response.json({
      shifts: [],
      summary: '',
      forecastTotal: eco?.forecastTotal ?? 0,
      targetPct,
      targetBasis: eco?.targetBasis ?? 'sector',
      historicalRatioPct: eco?.historicalRatioPct ?? null,
      estimatedCost: 0,
      estimatedRatioPct: null,
      engine: 'ai',
      partial: false,
      day_skipped: true,
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

  // Créneaux déjà planifiés cette semaine, montrés au modèle comme contexte.
  // En génération jour par jour, les jours précédents ont déjà été enregistrés
  // en base avant l'appel du jour courant → ils sont donc déjà dans
  // existingProposed (source unique de vérité), indispensable pour le repos
  // entre jours et les jours consécutifs même en générant un jour à la fois.
  const priorShiftRows = existingProposed

  const dayScopeSection = dayScoped ? `

## Portée de cette génération — IMPORTANT
Tu génères UNIQUEMENT les créneaux du ${target_date} (${FR_DOW[new Date(target_date + 'T12:00:00').getDay()]}). Les autres jours de la semaine sont générés par des appels séparés, avant ou après celui-ci : n'appelle JAMAIS propose_shift pour une autre date que ${target_date}.` : ''

  const systemPrompt = `Tu es l'assistant IA de Quartzbase, expert en génération de plannings pour la restauration française.

## Établissement : ${settingsMap.establishment_name ?? 'Non renseigné'}
- Convention collective : ${settingsMap.collective_agreement ?? 'Non définie — applique les règles générales'}
- Horaires d'ouverture : ${settingsMap.opening_time ?? '?'} → ${settingsMap.closing_time ?? '?'}
- Semaine : ${week_monday} (lundi) au ${weekEndStr} (dimanche)${dayScopeSection}

## Employés actifs (${employees?.length ?? 0})
${employees?.map(e => {
  const offDays = leaveByEmployee[e.id]
  const avail = availabilityByEmployee[e.id]
  const availStr = avail
    ? ` | Dispos: ${[...avail].sort((a, b) => a.day_of_week - b.day_of_week).map(a => `${FR_DOW_SHORT[a.day_of_week]} ${a.start_time.slice(0, 5)}-${a.end_time.slice(0, 5)}`).join(', ')}`
    : ''
  return `- ID: ${e.id} | ${e.full_name ?? 'Sans nom'} | Poste: ${e.position ?? '—'} | ${e.contract_type ?? '—'} | ${e.weekly_hours ?? '?'}h/sem${availStr}${offDays ? ` | ABSENT: ${offDays.join(', ')}` : ''}`
}).join('\n') ?? 'Aucun employé'}

## Postes disponibles
${postes?.map(p => `- ID: ${p.id} | ${p.name} | pause standard: ${p.break_minutes}min`).join('\n') ?? 'Aucun poste défini'}

## Shifts déjà planifiés cette semaine
${priorShiftRows.length ? priorShiftRows.map(s => `- ${employeeNameMap[s.employee_id] ?? s.employee_id} | ${s.date} | ${s.start_time}-${s.end_time} | ${s.position ?? '—'}`).join('\n') : 'Aucun shift existant — semaine vierge'}
${economicsSection}
## Règles légales à respecter ABSOLUMENT (aucune infraction tolérée)
- Respecte le volume horaire de chaque employé : un employé Xh/sem doit totaliser ~X h sur la semaine (ni nettement moins, ni plus). Un 35h fait ~35h, pas 16h ni 23h.
- Maximum 10h de travail effectif par jour, et un seul service par employé par jour.
- Minimum 11h de repos entre la fin d'un service et le début du suivant. En pratique : pour un même employé, garde des horaires de début RÉGULIERS d'un jour à l'autre (ne fais jamais finir tard le soir puis commencer tôt le lendemain).
- Maximum 6 jours travaillés par semaine et par employé (repos hebdomadaire obligatoire).
- Maximum 48h par semaine.
- Amplitude d'une journée ≤ 13h (début → fin).
- Ne JAMAIS planifier un employé marqué ABSENT.
- Respecte STRICTEMENT les disponibilités déclarées (« Dispos » ci-dessus) : jamais de créneau un jour absent de la liste, ni en dehors de la fenêtre horaire indiquée. Un employé sans « Dispos » est disponible sur toute l'amplitude d'ouverture.
- Dès qu'un service (ou le total d'une journée pour un même employé) dépasse 6h de travail effectif, renseigne break_minutes ≥ 20 sur le créneau — sinon la pause légale est considérée manquante. Exemple : un service de 09:00 à 17:00 (8h) doit avoir break_minutes ≥ 20, jamais 0.
- Chaque appel à propose_shift est vérifié automatiquement. Si le résultat commence par « REJETÉ », le créneau N'A PAS été ajouté : corrige immédiatement les horaires ou la pause selon le motif indiqué et rappelle propose_shift pour ce même employé/jour — ne renvoie jamais deux fois un créneau rejeté à l'identique.

## Demande du manager
${context?.trim() || 'Générer un planning équilibré pour toute la semaine en couvrant les besoins standard de l\'établissement.'}

${dayScoped
  ? `Utilise l'outil propose_shift pour chaque créneau du ${target_date} UNIQUEMENT. Après avoir créé tous les créneaux du jour, écris un bref résumé (1 phrase) de ta logique pour cette journée.`
  : "Utilise l'outil propose_shift pour chaque créneau. Après avoir créé tous les shifts, écris un bref résumé (2-3 phrases) de ta logique."}`

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

  // On amorce avec les créneaux DÉJÀ en base cette semaine (verrouillés) : la
  // vérification de conformité en temps réel (rest_daily, jours consécutifs,
  // heures hebdo…) porte ainsi sur la semaine complète, pas seulement sur les
  // créneaux que ce même appel propose. Ces créneaux verrouillés sont retirés
  // du résultat final (le client les a déjà). Vaut pour les deux modes : jour
  // par jour (les jours précédents sont déjà enregistrés) et semaine entière.
  const proposedShifts: ProposedShift[] = [...existingProposed]
  const seedCount = proposedShifts.length
  const rejectionCounts = new Map<string, number>()
  let summary = ''
  let partial = false

  const loopDeadlineMs = dayScoped ? AI_LOOP_DEADLINE_MS_PER_DAY : AI_LOOP_DEADLINE_MS
  const loopIterationsLimit = dayScoped ? AI_LOOP_ITERATIONS_LIMIT_PER_DAY : AI_LOOP_ITERATIONS_LIMIT

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: dayScoped ? `Génère le planning du ${target_date} uniquement.` : 'Génère le planning complet pour cette semaine.' },
  ]

  try {
    for (let iteration = 0; iteration < loopIterationsLimit; iteration++) {
      // Garde-fou de délai : on n'entame pas un nouvel appel si on est trop
      // près de la coupure Vercel (maxDuration) — mieux vaut retourner ce qui
      // a déjà été accepté que de laisser la fonction se faire tuer en plein
      // appel (504 non-JSON, zéro créneau récupérable côté client).
      if (Date.now() - requestStartedAt > loopDeadlineMs) {
        partial = true
        break
      }

      const response = await client.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 8192,
        // Sonnet 5 active le thinking adaptatif par défaut quand le champ est
        // omis : on le désactive explicitement pour garder la latence stable
        // dans cette boucle d'outils bornée par ANTHROPIC_CALL_TIMEOUT_MS.
        thinking: { type: 'disabled' },
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: [tool],
        messages,
      }, { timeout: ANTHROPIC_CALL_TIMEOUT_MS })

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
        proposedShifts,
        repairMeta,
        rejectionCounts,
        dayScoped ? target_date : undefined,
        availabilityByEmployee,
      )
      proposedShifts.push(...newShifts)

      if (!hasToolUse) break // plus d'outil en attente → terminé
      messages.push({ role: 'user', content: toolResults })
    }
  } catch (e) {
    console.error('[ai/plan] Anthropic error:', e)
    // Si rien de NOUVEAU n'a été accepté (le compte des créneaux « seedés »
    // depuis les jours précédents n'a pas bougé), il n'y a rien d'exploitable
    // à renvoyer pour CE jour : on remonte l'erreur en JSON (sinon le fetch
    // tombe sur une réponse non-JSON et le frontend affiche un générique
    // « Erreur réseau »).
    if (proposedShifts.length === seedCount) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue'
      return Response.json(
        { error: `La génération IA a échoué (${msg}). Vous pouvez réessayer ou basculer sur l'algorithme déterministe dans Réglages › Planning.` },
        { status: 502 },
      )
    }
    // Des créneaux ont déjà été acceptés avant l'erreur (timeout d'un appel,
    // 5xx transitoire…) : on les garde et on retourne un plan partiel plutôt
    // que de tout jeter.
    partial = true
  }

  // Filet de sécurité conformité : l'IA peut proposer des créneaux en
  // infraction (repos, 10h/jour, 6 jours…). On retire les fautifs pour que le
  // planning appliqué soit propre — le manager complète ensuite. Opère sur
  // TOUTE la semaine (créneaux verrouillés déjà en base + nouveaux) : les
  // verrouillés comptent dans la conformité mais ne sont jamais supprimés, si
  // bien qu'un nouveau créneau cassant le repos contre un jour déjà planifié
  // est retiré, jamais l'inverse.
  const { shifts: repairedAll } = repairPlan(proposedShifts, repairMeta, lockedKeys)
  // On ne renvoie que les NOUVEAUX créneaux (les verrouillés sont déjà en
  // base), et en mode jour par jour uniquement ceux du jour demandé.
  const cleanedAll = repairedAll.filter(s => !lockedKeys.has(shiftKey(s)))
  const cleanedAi = dayScoped ? cleanedAll.filter(s => s.date === target_date) : cleanedAll

  // Coût main d'œuvre estimé → ratio coût/CA estimé (premium). Calculé sur
  // TOUTE la semaine (verrouillés + nouveaux) : en génération jour par jour, le
  // dernier appel renvoie donc le ratio complet et définitif de la semaine — le
  // client n'a pas besoin de cumuler lui-même.
  let estimatedCost = 0
  if (eco) {
    for (const s of repairedAll) {
      const rate = eco.rateMap[s.employee_id]
      if (rate) estimatedCost += shiftHours(s.start_time, s.end_time, s.break_minutes) * rate
    }
  }
  const estimatedRatioPct = (eco && eco.forecastTotal > 0 && estimatedCost > 0)
    ? Math.round((estimatedCost / eco.forecastTotal) * 100)
    : null

  // Compteur de génération IA, décompté ici uniquement après une génération
  // réussie, et une seule fois par semaine générée (cf. shouldConsumeAiCredit
  // plus haut — pas une fois par jour). Le plan Essentiel applique sa limite
  // de 3/mois (le RPC est atomique et re-plafonne en cas de course) ; les
  // autres plans sont juste enregistrés.
  if (shouldConsumeAiCredit) {
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
    partial,
  })
}
