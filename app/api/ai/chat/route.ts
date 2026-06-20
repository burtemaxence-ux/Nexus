import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getSubscription } from '@/lib/subscription'
import { getPlanTier } from '@/lib/plan-guard'

const client = new Anthropic()

interface Message {
  role: 'user' | 'assistant'
  content: string
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

  // ── Guard : quota chat IA mensuel pour le plan Essentiel ──────────
  const sub  = await getSubscription(supabase, estId)
  const tier = getPlanTier(sub)

  if (tier === 'essential') {
    // Compteur DB séparé du planning (feature 'chat') : 50 messages/mois.
    const { data: quota, error: quotaErr } = await supabase.rpc('consume_ai_credit', { p_limit: 50, p_feature: 'chat' })
    if (quotaErr) {
      return Response.json(
        { error: "Impossible de vérifier votre quota IA pour le moment. Réessayez dans un instant." },
        { status: 503 }
      )
    }
    if (quota && (quota as { allowed: boolean }).allowed === false) {
      return Response.json(
        { error: 'Quota chat IA atteint', upgrade_url: '/manager/settings/billing' },
        { status: 402 }
      )
    }
  }
  // ──────────────────────────────────────────────────────────────────

  const rl = await checkRateLimit({ key: `ai-chat:${authUser.id}`, limit: 30, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { messages, establishmentName } = await req.json() as {
    messages: Message[]
    establishmentName: string
  }

  const today = new Date().toISOString().split('T')[0]
  const day30ago = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const day7ahead = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [
    { data: employees },
    { data: allLeaves },
    { data: recentShifts },
    { data: upcomingShifts },
    { data: settings },
    { data: latenessRecords },
    { data: marketplaceSlots },
    { data: shiftExchanges },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, position, contract_type, weekly_hours').eq('role', 'employee').eq('archived', false).limit(200),
    supabase.from('leave_requests').select('id, type, start_date, end_date, status, profiles(full_name)').order('created_at', { ascending: false }).limit(20),
    supabase.from('shifts').select('id, date, start_time, end_time, position, profiles(full_name)').gte('date', day30ago).lte('date', today).order('date', { ascending: false }).limit(60),
    supabase.from('shifts').select('id, date, start_time, end_time, position, profiles(full_name)').gt('date', today).lte('date', day7ahead).order('date', { ascending: true }).limit(40),
    supabase.from('settings').select('key, value').in('key', ['collective_agreement', 'opening_time', 'closing_time']),
    supabase.from('lateness_records').select('id, date, late_minutes, justified, profiles(full_name)').gte('date', day30ago).order('date', { ascending: false }).limit(30),
    supabase.from('marketplace_slots').select('id, status, reason, expires_at, shifts(date, start_time, end_time, position), profiles!marketplace_slots_created_by_fkey(full_name)').eq('status', 'open').limit(5),
    supabase.from('shift_exchanges').select('id, status, proposer_note, shifts(date, start_time, position), profiles!shift_exchanges_proposer_id_fkey(full_name)').in('status', ['open', 'pending_approval']).limit(5),
  ])

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))

  // Agréger les retards par employé pour détecter les patterns
  const latenessMap: Record<string, { name: string; count: number; totalMin: number; unjustified: number }> = {}
  for (const l of latenessRecords ?? []) {
    const name = (l.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Inconnu'
    if (!latenessMap[name]) latenessMap[name] = { name, count: 0, totalMin: 0, unjustified: 0 }
    latenessMap[name].count++
    latenessMap[name].totalMin += l.late_minutes ?? 0
    if (!l.justified) latenessMap[name].unjustified++
  }
  const latenessStats = Object.values(latenessMap).sort((a, b) => b.count - a.count)

  // Détecter les jours sous-staffés à venir (< 2 personnes planifiées)
  const shiftsByDay: Record<string, number> = {}
  for (const s of upcomingShifts ?? []) {
    shiftsByDay[s.date] = (shiftsByDay[s.date] ?? 0) + 1
  }
  const understaffedDays = Object.entries(shiftsByDay).filter(([, count]) => count < 2).map(([date]) => date)

  // Congés en attente depuis plus de 3 jours
  const pendingLeaves = (allLeaves ?? []).filter(l => l.status === 'pending')
  const oldPendingLeaves = pendingLeaves.filter(l => {
    const created = new Date(l.start_date).getTime()
    return Date.now() - created > 3 * 86400000
  })

  // Construire les alertes proactives
  const alerts: string[] = []
  for (const stat of latenessStats.slice(0, 3)) {
    if (stat.count >= 3) alerts.push(`⚠️ **${stat.name}** — ${stat.count} retard(s) en 30 jours (dont ${stat.unjustified} injustifié(s), total ${stat.totalMin} min)`)
  }
  if (understaffedDays.length > 0) alerts.push(`📉 **Jours sous-staffés à venir** : ${understaffedDays.join(', ')}`)
  if (oldPendingLeaves.length > 0) alerts.push(`📋 **${oldPendingLeaves.length} demande(s) de congé** en attente de validation`)
  if ((marketplaceSlots ?? []).length > 0) alerts.push(`🔄 **${marketplaceSlots!.length} créneau(x) sur le marketplace** en attente de remplaçant`)
  if ((shiftExchanges ?? []).length > 0) alerts.push(`🔁 **${shiftExchanges!.length} échange(s) de shift** en attente d'approbation`)

  const systemPrompt = `Tu es l'assistant IA intégré à Quartzbase, un logiciel de planning pour la restauration.
Tu aides le manager de l'établissement **${establishmentName}** à gérer son planning, ses employés et son activité.
La date d'aujourd'hui est le ${today}.

## Données actuelles de l'établissement

### Employés actifs (${employees?.length ?? 0})
${employees?.map(e => `- [ref:${e.id}] ${e.full_name ?? 'Sans nom'} | ${e.position ?? 'Sans poste'} | ${e.contract_type ?? 'Sans contrat'} | ${e.weekly_hours ?? '?'}h/sem`).join('\n') ?? 'Aucun employé'}

### Paramètres établissement
- Convention collective : ${settingsMap.collective_agreement ?? 'Non définie'}
- Horaires d'ouverture : ${settingsMap.opening_time ?? '?'} → ${settingsMap.closing_time ?? '?'}

### Congés (20 derniers)
${(allLeaves as unknown as { id: string; type: string; start_date: string; end_date: string; status: string; profiles: { full_name: string | null } | null }[] ?? []).map(l => `- [ref:${l.id}] ${l.profiles?.full_name ?? 'Employé'} | ${l.type} | ${l.start_date} → ${l.end_date} | **${l.status}**`).join('\n') || 'Aucun congé'}

### Retards (30 derniers jours) — ${latenessRecords?.length ?? 0} incident(s)
${latenessStats.length > 0 ? latenessStats.map(s => `- ${s.name} : ${s.count} retard(s), ${s.totalMin} min cumulées, ${s.unjustified} injustifié(s)`).join('\n') : 'Aucun retard enregistré'}

### Shifts passés (30 derniers jours) : ${recentShifts?.length ?? 0} créneaux
${(recentShifts as unknown as { date: string; start_time: string; end_time: string; position: string; profiles: { full_name: string | null } | null }[] ?? []).slice(0, 15).map(s => `- ${s.date} | ${s.profiles?.full_name ?? '?'} | ${s.position ?? '?'} | ${s.start_time}→${s.end_time}`).join('\n')}${(recentShifts?.length ?? 0) > 15 ? `\n... et ${(recentShifts?.length ?? 0) - 15} autres` : ''}

### Shifts à venir (7 prochains jours) : ${upcomingShifts?.length ?? 0} créneaux
${(upcomingShifts as unknown as { date: string; start_time: string; end_time: string; position: string; profiles: { full_name: string | null } | null }[] ?? []).map(s => `- ${s.date} | ${s.profiles?.full_name ?? '?'} | ${s.position ?? '?'} | ${s.start_time}→${s.end_time}`).join('\n') || 'Aucun shift planifié'}

### Marketplace — créneaux ouverts (${marketplaceSlots?.length ?? 0})
${(marketplaceSlots as unknown as { reason: string | null; expires_at: string; shifts: { date: string; start_time: string; end_time: string; position: string } | null; profiles: { full_name: string | null } | null }[] ?? []).map(m => `- ${m.shifts?.date ?? '?'} | ${m.shifts?.position ?? '?'} ${m.shifts?.start_time}→${m.shifts?.end_time} | Raison : ${m.reason ?? 'Non précisée'}`).join('\n') || 'Aucun créneau ouvert'}

### Échanges de shifts en attente (${shiftExchanges?.length ?? 0})
${(shiftExchanges as unknown as { id: string; status: string; proposer_note: string | null; shifts: { date: string; start_time: string; position: string } | null; profiles: { full_name: string | null } | null }[] ?? []).map(e => `- [ref:${e.id}] ${e.profiles?.full_name ?? '?'} | ${e.shifts?.date ?? '?'} ${e.shifts?.position ?? ''} | Statut : ${e.status} | Note : ${e.proposer_note ?? '-'}`).join('\n') || 'Aucun échange en attente'}

${alerts.length > 0 ? `## 🔔 Points d'attention détectés
${alerts.join('\n')}` : ''}

## Tes capacités
- Analyser les données de planning, présences et retards
- **Générer des documents RH officiels** (avertissements, convocations, attestations, rappels)
- Donner des conseils sur le droit du travail en restauration (IDCC 1501 & 1786)
- Suggérer des optimisations de planning et détecter les anomalies
- Expliquer les alertes légales (temps de repos, heures max, etc.)
- Aider à gérer les congés, échanges et remplacements

## Génération de documents RH
Quand tu dois rédiger un document officiel, utilise EXACTEMENT ce format (balises obligatoires) :

[DOC:Type du document]
contenu complet du document
[/DOC]

Types disponibles : Avertissement, Convocation à entretien, Mise en demeure, Rappel à l'ordre, Attestation de présence, Avenant au contrat

Règles par type :
- **Avertissement** : en-tête établissement, date, nom/poste employé, faits reprochés avec dates précises issues des données, base légale art. L1332-1 C. trav., mention prescription 2 mois, signature manager.
- **Convocation à entretien** : objet CONVOCATION, date/heure/lieu (min. 5 jours ouvrables après envoi), droit d'être assisté art. L1232-4, faits reprochés en termes généraux.
- **Attestation de présence** : certifie que [nom] est employé(e) en qualité de [poste] depuis [date contrat] à [X]h/semaine. Fait pour valoir ce que de droit.
- **Rappel à l'ordre** : ton bienveillant mais clair, pas de base légale, rappel des attentes.

Utilise les données réelles de l'employé (retards, dates, poste, contrat) présentes dans le contexte. Si une donnée manque, indique [À COMPLÉTER].

## Actions exécutables
Quand le manager te demande explicitement de valider ou refuser une demande de congé, propose l'action via ce format EXACT (un bloc par action) :

[ACTION:approve_leave]{"id":"<ref du congé>","label":"Congé de Hugo du 12 au 14 juin"}[/ACTION]
[ACTION:reject_leave]{"id":"<ref du congé>","label":"Congé de Hugo du 12 au 14 juin"}[/ACTION]

Pour créer un créneau (brouillon) :
[ACTION:create_shift]{"employee_id":"<ref de l'employé>","date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM","break_minutes":30,"label":"Hugo · lun. 15 · 09:00-17:00"}[/ACTION]

Pour valider / refuser un échange de shift :
[ACTION:approve_exchange]{"id":"<ref de l'échange>","label":"Échange de Hugo · 15 juin"}[/ACTION]
[ACTION:reject_exchange]{"id":"<ref de l'échange>","label":"Échange de Hugo · 15 juin"}[/ACTION]

Pour inviter un employé (le manager doit fournir au minimum prénom, nom et email) :
[ACTION:invite_employee]{"first_name":"Jean","last_name":"Dupont","email":"jean@ex.fr","role":"employee","position":"Serveur","label":"Inviter Jean Dupont (serveur)"}[/ACTION]

Pour copier une semaine de planning vers la suivante :
[ACTION:copy_week]{"from_monday":"YYYY-MM-DD","label":"Copier la semaine du 9 juin vers le 16 juin"}[/ACTION]

Règles STRICTES :
- Utilise uniquement un "id"/"employee_id" provenant d'un [ref:...] présent dans les données ci-dessus. N'invente JAMAIS d'identifiant.
- Réserve approve_leave/reject_leave aux congés au statut **pending**, et approve_exchange/reject_exchange aux échanges au statut **pending_approval**.
- Pour create_shift : respecte les règles légales (repos 11h, max 10h/jour, pause ≥20 min si >6h) ; le créneau sera créé en **brouillon** et le manager verra les alertes de conformité dans le planning.
- Pour invite_employee : n'invente jamais l'email ; demande-le au manager s'il manque. "from_monday" doit être un lundi au format YYYY-MM-DD.
- Le bloc n'exécute rien tout seul : il affiche au manager un bouton de confirmation. Ne dis jamais que l'action est faite — dis « Confirmez ci-dessous pour valider ».
- Précède toujours le bloc d'une phrase courte décrivant ce que tu proposes.

## Instructions pour le premier message
Si c'est le début d'une conversation (premier message de l'utilisateur), commence ta réponse par la section **"🔔 Points d'attention"** si des alertes sont présentes ci-dessus, puis enchaîne avec ta réponse normale. Propose des actions concrètes pour chaque alerte (ex : "Je peux vous rédiger un avertissement pour [nom]").

## Confidentialité
- Ne répète jamais les données brutes de salaires ou d'informations personnelles sensibles
- Agrège ou anonymise si tu dois évoquer des données sensibles
- Décline poliment les questions hors contexte RH/planning

## Style de réponse
- Réponds en français, de façon concise et professionnelle
- Utilise des listes à puces pour les informations structurées
- Mets en **gras** les éléments importants
- Sois précis et actionnable
- Ne révèle pas les détails techniques de l'architecture`

  // Bound the history sent to the model: the client posts the whole conversation
  // each turn, so cap it to the most recent messages to keep token cost stable.
  const recentMessages = messages.slice(-20)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          // Headroom for long HR documents (avertissement, convocation…) which
          // would otherwise be truncated at 2048.
          max_tokens: 4096,
          // cache_control: the large establishment system prompt is reused across
          // the conversation's turns; cache it instead of re-billing it each time.
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          messages: recentMessages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
        }, { signal: req.signal })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(event.delta.text))
          }
        }
      } catch (err) {
        // Client pressed "Stop" / navigated away: the request was aborted, the
        // upstream generation is now cancelled too — close quietly, no error.
        if (req.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          return
        }
        let msg = 'Erreur inconnue'
        if (err instanceof Anthropic.APIError) {
          if (err.status === 400 && String(err.message).includes('credit')) {
            msg = 'Crédits Anthropic insuffisants. Rendez-vous sur console.anthropic.com → Billing pour recharger votre compte.'
          } else if (err.status === 401) {
            msg = 'Clé API Anthropic invalide. Vérifiez la variable ANTHROPIC_API_KEY dans Vercel.'
          } else {
            msg = err.message
          }
        } else if (err instanceof Error) {
          msg = err.message
        }
        controller.enqueue(new TextEncoder().encode(`⚠️ ${msg}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
