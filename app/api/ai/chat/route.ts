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
    return Response.json(
      { error: 'Clé API Anthropic manquante. Ajoutez ANTHROPIC_API_KEY dans vos variables d\'environnement.' },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const rl = checkRateLimit({ key: `ai-chat:${user.id}`, limit: 30, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { messages, establishmentName } = await req.json() as {
    messages: Message[]
    establishmentName: string
  }

  // Fetch context data to give the AI awareness of real data
  const [
    { data: employees },
    { data: pendingLeaves },
    { data: recentShifts },
    { data: settings },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, position, contract_type, weekly_hours').eq('role', 'employee').eq('archived', false),
    supabase.from('leave_requests').select('id, type, start_date, end_date, profiles(full_name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
    supabase.from('shifts').select('id, date, start_time, end_time, position, employee_id').gte('date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]).limit(20),
    supabase.from('settings').select('key, value').in('key', ['collective_agreement', 'opening_time', 'closing_time']),
  ])

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))

  const systemPrompt = `Tu es l'assistant IA intégré à D-pot, un logiciel de planning pour la restauration.
Tu aides le manager de l'établissement **${establishmentName}** à gérer son planning, ses employés et son activité.

## Données actuelles de l'établissement

### Employés actifs (${employees?.length ?? 0})
${employees?.map(e => `- ${e.full_name ?? 'Sans nom'} | ${e.position ?? 'Sans poste'} | ${e.contract_type ?? 'Sans contrat'} | ${e.weekly_hours ?? '?'}h/sem`).join('\n') ?? 'Aucun employé'}

### Congés en attente de validation (${pendingLeaves?.length ?? 0})
${(pendingLeaves as unknown as { type: string; start_date: string; end_date: string; profiles: { full_name: string | null } | null }[] ?? []).map(l => `- ${l.profiles?.full_name ?? 'Employé'} | ${l.type} | ${l.start_date} → ${l.end_date}`).join('\n') || 'Aucun congé en attente'}

### Paramètres établissement
- Convention collective : ${settingsMap.collective_agreement ?? 'Non définie'}
- Horaires : ${settingsMap.opening_time ?? '?'} → ${settingsMap.closing_time ?? '?'}

### Shifts récents (7 derniers jours) : ${recentShifts?.length ?? 0} créneaux planifiés

## Tes capacités
- Analyser les données de planning et d'employés
- Donner des conseils sur la gestion RH et le droit du travail (restauration française)
- Suggérer des optimisations de planning
- Expliquer les alertes légales
- Répondre aux questions sur les conventions collectives IDCC 1501 et 1786
- Aider à rédiger des messages aux employés

## Confidentialité
- Ne répète jamais les données brutes de salaires, contrats ou informations personnelles des employés dans tes réponses
- Agrège ou anonymise si tu dois évoquer des données sensibles
- Si une question sort du contexte RH/planning, décline poliment

## Style de réponse
- Réponds en français, de façon concise et professionnelle
- Utilise des listes à puces pour les informations structurées
- Mets en **gras** les éléments importants
- Si tu proposes un planning ou une action concrète, sois précis et actionnable
- Ne révèle pas les détails techniques de l'architecture`

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
