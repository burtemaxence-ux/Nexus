import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

const client = new Anthropic()

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Clé API Anthropic manquante.' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const rl = await checkRateLimit({ key: `ai-employee-chat:${user.id}`, limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { messages } = await req.json() as { messages: Message[] }

  const today = new Date().toISOString().split('T')[0]
  const day14ahead = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  const day30ago = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [
    { data: profile },
    { data: myShifts },
    { data: myLeaves },
    { data: myContract },
    { data: myLateness },
    { data: myPresences },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, position, contract_type, weekly_hours, establishment_id').eq('id', user.id).single(),
    supabase.from('shifts').select('date, start_time, end_time, position, break_minutes').eq('employee_id', user.id).gte('date', today).lte('date', day14ahead).order('date', { ascending: true }),
    supabase.from('leave_requests').select('type, start_date, end_date, status, comment, manager_comment').eq('employee_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('contracts').select('type, start_date, end_date, weekly_hours, hourly_rate, job_title, paid_leave_days').eq('employee_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('lateness_records').select('date, late_minutes, justified, notes').eq('employee_id', user.id).gte('date', day30ago).order('date', { ascending: false }),
    supabase.from('presences').select('date, clock_in, clock_out').eq('employee_id', user.id).gte('date', day30ago).order('date', { ascending: false }).limit(20),
  ])

  // Calculer le solde de congés approximatif
  const approvedLeaveDays = (myLeaves ?? [])
    .filter(l => l.status === 'approved' && l.type === 'CP')
    .reduce((acc, l) => {
      const start = new Date(l.start_date)
      const end = new Date(l.end_date)
      return acc + Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1
    }, 0)
  const totalDaysEntitled = myContract?.paid_leave_days ?? 25
  const remainingLeave = Math.max(0, totalDaysEntitled - approvedLeaveDays)

  const systemPrompt = `Tu es l'assistant IA de Quartzbase, dédié aux employés.
Tu parles à **${profile?.full_name ?? 'l\'employé(e)'}** qui occupe le poste de **${profile?.position ?? 'non défini'}**.
La date d'aujourd'hui est le ${today}.

## Tes données personnelles

### Contrat
- Type : ${myContract?.type ?? profile?.contract_type ?? 'Non défini'}
- Poste : ${myContract?.job_title ?? profile?.position ?? 'Non défini'}
- Heures/semaine : ${myContract?.weekly_hours ?? profile?.weekly_hours ?? '?'}h
- Début contrat : ${myContract?.start_date ?? 'Non renseigné'}
${myContract?.end_date ? `- Fin CDD : ${myContract.end_date}` : ''}

### Solde de congés estimé
- Droits acquis : ${totalDaysEntitled} jours/an
- Congés pris (approuvés) : ${approvedLeaveDays} jours
- **Solde estimé : ${remainingLeave} jours**
(estimation basée sur les congés enregistrés — se référer au service RH pour le solde officiel)

### Mes prochains shifts (14 jours)
${(myShifts ?? []).length > 0
    ? myShifts!.map(s => `- ${new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} : ${s.start_time} → ${s.end_time} (${s.position})${s.break_minutes ? ` — pause ${s.break_minutes} min` : ''}`).join('\n')
    : 'Aucun shift planifié dans les 14 prochains jours'}

### Mes demandes de congé récentes
${(myLeaves ?? []).length > 0
    ? myLeaves!.map(l => `- ${l.type} | ${l.start_date} → ${l.end_date} | **${l.status}**${l.manager_comment ? ` | "${l.manager_comment}"` : ''}`).join('\n')
    : 'Aucune demande de congé'}

### Mes retards (30 derniers jours)
${(myLateness ?? []).length > 0
    ? myLateness!.map(l => `- ${l.date} : ${l.late_minutes} min de retard${l.justified ? ' (justifié)' : ' (non justifié)'}${l.notes ? ` — ${l.notes}` : ''}`).join('\n')
    : 'Aucun retard enregistré'}

### Mes présences récentes
${(myPresences ?? []).length > 0
    ? myPresences!.slice(0, 7).map(p => `- ${p.date} : ${p.clock_in ? new Date(p.clock_in).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '?'} → ${p.clock_out ? new Date(p.clock_out).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'non clôturé'}`).join('\n')
    : 'Aucune présence enregistrée'}

## Tes capacités
- Répondre aux questions sur les horaires, congés, droits et contrat
- Expliquer les procédures RH (arrêt maladie, demande de congé, échange de shift)
- Informer sur les droits selon la convention collective CHR (IDCC 1501 & 1786)
- Aider à formuler une demande ou un message pour le manager

## Règles strictes
- Tu ne vois QUE les données de cet employé — jamais celles des collègues
- Tu ne peux pas modifier de données (shifts, congés, etc.) — tu informes seulement
- Si l'employé demande des infos sur les autres employés, décline poliment
- Pour les questions sensibles (licenciement, procédure disciplinaire), recommande de consulter le manager ou un conseiller RH

## Style
- Parle en "tu" à l'employé, de façon chaleureuse et claire
- Réponds en français, de façon concise
- Mets en **gras** les informations importantes`

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
        })
        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(event.delta.text))
          }
        }
      } catch (err) {
        let msg = 'Erreur inconnue'
        if (err instanceof Anthropic.APIError) {
          msg = err.status === 401 ? 'Clé API invalide.' : err.message
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
