import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireManager } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
  const supabase = await createClient()
  const { profile } = await requireManager(supabase)

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id

  const { alert_id, employee_id }: { alert_id: string; employee_id: string } = await req.json()

  const [
    { data: alert },
    { data: employeeData },
    { data: contracts },
    { data: estSetting },
  ] = await Promise.all([
    supabaseAdmin.from('compliance_alerts').select('type, level, message, options').eq('id', alert_id).single(),
    supabaseAdmin.from('profiles').select('full_name, position').eq('id', employee_id).single(),
    supabaseAdmin.from('contracts').select('type, weekly_hours, start_date, end_date, trial_period_days, hourly_rate').eq('employee_id', employee_id).order('created_at', { ascending: false }).limit(1),
    supabaseAdmin.from('settings').select('value').eq('establishment_id', establishmentId).eq('key', 'establishment_name').maybeSingle(),
  ])

  const fullName = employeeData?.full_name ?? 'Employé'
  const contract = contracts?.[0]
  const establishmentName = estSetting?.value ?? 'L\'établissement'
  const managerName = 'Le gérant'

  const alertTypeLabel: Record<string, string> = {
    hours_exceeded: 'dépassement régulier des heures contractuelles',
    trial_ending: 'fin de période d\'essai',
    cdd_ending: 'fin de contrat à durée déterminée',
    requalification_risk: 'risque de requalification du contrat',
  }

  const legalRisk: Record<string, string> = {
    hours_exceeded: 'risque de requalification du temps partiel en temps plein (Art. L3123-10)',
    trial_ending: 'nécessité de formaliser la décision avant échéance légale',
    cdd_ending: 'risque de requalification en CDI (Art. L1243-11)',
    requalification_risk: 'risque de requalification en CDI (Art. L1245-1)',
  }

  const alertType = alert?.type ?? 'hours_exceeded'
  const options = (alert?.options ?? {}) as Record<string, unknown>

  const contextLines: string[] = [
    `Salarié : ${fullName}, ${employeeData?.position ?? 'employé'}`,
    `Contrat : ${contract?.type ?? 'N/A'}, ${contract?.weekly_hours ?? '?'}h/semaine`,
    contract?.start_date ? `Date d'entrée : ${contract.start_date}` : '',
    alertType === 'hours_exceeded' && options.avg_hours
      ? `Heures réelles moyennes : ${options.avg_hours}h/semaine (${options.consecutive_weeks} semaines consécutives)`
      : '',
    alertType === 'cdd_ending' && contract?.end_date
      ? `Fin de contrat : ${contract.end_date} (dans ${options.days_remaining ?? '?'} jours)`
      : '',
    alertType === 'trial_ending'
      ? `Fin période d'essai : ${options.trial_end_date ? new Date(options.trial_end_date as string).toLocaleDateString('fr-FR') : 'N/A'}`
      : '',
    `Situation identifiée : ${alert?.message ?? ''}`,
  ].filter(Boolean)

  const prompt = `Tu es un assistant RH. Rédige un email professionnel, neutre et factuel à destination de l'expert-comptable ou de l'avocat RH de l'employeur.

Contexte de la situation :
${contextLines.join('\n')}

Problématique légale : ${legalRisk[alertType] ?? 'situation contractuelle à analyser'}

Instructions :
- Objet de l'email : "Situation contractuelle à vérifier — ${fullName}"
- Ton : professionnel, neutre, factuel, pas alarmiste
- Corps : 3-4 paragraphes maximum
  1. Présentation rapide du contexte
  2. Données chiffrées factuelles
  3. Risque légal identifié
  4. Demande de conseil précise
- Signer au nom de : ${managerName}, ${establishmentName}
- PAS de formules creuses, PAS de "j'espère que ce message vous trouve bien"

Retourne UNIQUEMENT un JSON valide avec ce format exact :
{"subject": "...", "body": "..."}`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = msg.content[0]
    const rawText = block.type === 'text' ? block.text.trim() : '{}'

    // Parse JSON from Claude response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { subject: `Situation contractuelle — ${fullName}`, body: rawText }

    return NextResponse.json({
      subject: parsed.subject ?? `Situation contractuelle — ${fullName}`,
      body: parsed.body ?? rawText,
    })
  } catch (err) {
    if (err instanceof Response) return err as NextResponse
    console.error('[generate-email]', err)
    return NextResponse.json({ error: 'Erreur génération Claude' }, { status: 500 })
  }
}
