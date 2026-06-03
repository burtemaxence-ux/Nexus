import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireManager } from '@/lib/api-auth'
import { getSubscription } from '@/lib/subscription'
import { getPlanTier, isPro } from '@/lib/plan-guard'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic()

export type DocumentType =
  | 'avenant_heures'
  | 'avenant_cdd'
  | 'lettre_confirmation_essai'
  | 'lettre_rupture_essai'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  let profile: Awaited<ReturnType<typeof requireManager>>['profile']
  try {
    profile = (await requireManager(supabase)).profile
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
  if (profile.role !== 'manager') {
    return NextResponse.json({ error: 'Managers uniquement' }, { status: 403 })
  }

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id

  // ── Guard : fonctionnalité Pro uniquement ─────────────────────────
  const sub  = await getSubscription(supabase, establishmentId ?? '')
  const tier = getPlanTier(sub)
  if (!isPro(tier)) {
    return NextResponse.json(
      { error: 'Fonctionnalité disponible en plan Pro ou Multi-site', upgrade_url: '/manager/settings/billing' },
      { status: 402 }
    )
  }
  // ─────────────────────────────────────────────────────────────────

  const {
    alert_id,
    document_type,
    employee_id,
    motif,
  }: {
    alert_id: string
    document_type: DocumentType
    employee_id: string
    motif?: string
  } = await req.json()

  // Fetch all needed data
  const [
    { data: employeeData },
    { data: contracts },
    { data: collectiveAgreementSetting },
    { data: establishmentSetting },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('full_name, position, email').eq('id', employee_id).single(),
    supabaseAdmin.from('contracts').select('*').eq('employee_id', employee_id).order('created_at', { ascending: false }).limit(1),
    supabaseAdmin.from('settings').select('value').eq('establishment_id', establishmentId).eq('key', 'collective_agreement').maybeSingle(),
    supabaseAdmin.from('settings').select('value').eq('establishment_id', establishmentId).eq('key', 'establishment_name').maybeSingle(),
  ])

  const employee = employeeData
  const contract = contracts?.[0]
  const collectiveAgreement = collectiveAgreementSetting?.value ?? 'Convention collective HCR'
  const establishmentName = establishmentSetting?.value ?? 'L\'établissement'

  if (!employee || !contract) {
    return NextResponse.json({ error: 'Employé ou contrat introuvable' }, { status: 404 })
  }

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const firstName = employee.full_name?.split(' ')[0] ?? 'L\'employé(e)'
  const fullName = employee.full_name ?? 'Employé'

  let prompt = ''

  if (document_type === 'avenant_heures') {
    prompt = `Tu es juriste RH spécialisé droit du travail français. Rédige un avenant au contrat de travail pour régularisation des heures.

Données :
- Salarié : ${fullName}, ${employee.position ?? 'employé'}
- Contrat actuel : ${contract.type}, ${contract.weekly_hours}h/semaine
- Convention collective : ${collectiveAgreement}
- Établissement : ${establishmentName}
- Date de rédaction : ${today}
- Date d'effet proposée : [DATE_EFFET - À COMPLÉTER]
- Nouvelles heures : [NOUVELLES_HEURES - À COMPLÉTER]h/semaine
- Nouveau taux horaire si applicable : [TAUX - À VÉRIFIER]

Génère un avenant complet avec :
1. En-tête (établissement, date)
2. Objet : "Avenant n°[X] au contrat de travail - Modification de la durée du travail"
3. Article 1 — Parties
4. Article 2 — Modification de la durée de travail (avec mention des heures actuelles et nouvelles)
5. Article 3 — Rémunération (adapter si changement)
6. Article 4 — Toutes autres clauses du contrat initial demeurent inchangées
7. Article 5 — Date d'effet
8. Signatures (double exemplaire)
9. Mention légale : référence à l'article L3123-10 du Code du travail

Format : texte structuré, professionnel, directement utilisable. Mets [ENTRE_CROCHETS] les champs à compléter.`
  }

  if (document_type === 'avenant_cdd') {
    prompt = `Tu es juriste RH spécialisé droit du travail français. Rédige un avenant au contrat de travail CDD pour renouvellement ou conversion.

Données :
- Salarié : ${fullName}, ${employee.position ?? 'employé'}
- Contrat actuel : ${contract.type}, ${contract.weekly_hours}h/semaine, du ${contract.start_date} au ${contract.end_date}
- Convention collective : ${collectiveAgreement}
- Établissement : ${establishmentName}
- Date de rédaction : ${today}

Génère un avenant de renouvellement CDD avec :
1. En-tête
2. Objet : "Avenant n°[X] au contrat de travail à durée déterminée - Renouvellement"
3. Article 1 — Parties
4. Article 2 — Renouvellement du CDD (durée, nouvelle date de fin [DATE_FIN])
5. Article 3 — Motif du CDD (reprendre le motif initial)
6. Article 4 — Rémunération inchangée sauf mention contraire
7. Article 5 — Toutes autres clauses demeurent
8. Signatures
9. Mention Art. L1243-13 Code du travail (renouvellement CDD)

Mets [ENTRE_CROCHETS] les champs à compléter.`
  }

  if (document_type === 'lettre_confirmation_essai') {
    prompt = `Tu es juriste RH. Rédige une lettre de confirmation à l'issue de la période d'essai.

Données :
- Salarié : ${fullName}, ${employee.position ?? 'employé'}
- Durée période d'essai : ${contract.trial_period_days} jours
- Date de début : ${contract.start_date}
- Convention collective : ${collectiveAgreement}
- Établissement : ${establishmentName}
- Date de rédaction : ${today}

Rédige une lettre formelle et chaleureuse de confirmation de fin de période d'essai avec :
1. En-tête (lieu, date)
2. Coordonnées destinataire
3. Objet : "Confirmation de fin de période d'essai"
4. Corps : confirmation que l'embauche est définitive, félicitations professionnelles, rappel du poste et conditions
5. Formule de politesse
6. Signature employeur

Ton : professionnel mais humain. Mets [ENTRE_CROCHETS] les champs à compléter.`
  }

  if (document_type === 'lettre_rupture_essai') {
    prompt = `Tu es juriste RH. Rédige une lettre de rupture de période d'essai à l'initiative de l'employeur.

Données :
- Salarié : ${fullName}, ${employee.position ?? 'employé'}
- Durée période d'essai : ${contract.trial_period_days} jours
- Date de début : ${contract.start_date}
- Motif invoqué : ${motif ?? '[MOTIF À COMPLÉTER]'}
- Convention collective : ${collectiveAgreement}
- Établissement : ${establishmentName}
- Date de rédaction : ${today}

Rédige une lettre de rupture de période d'essai avec :
1. En-tête (lieu, date)
2. Coordonnées destinataire
3. Objet : "Rupture de la période d'essai"
4. Corps : annonce de la rupture, mention du délai de prévenance (Art. L1221-25), date de fin effective [DATE_FIN]
5. Mention : "Nous vous informons que votre contrat de travail prendra fin le [DATE_FIN], après respect d'un délai de prévenance de [X] jours."
6. Rappel des documents à remettre (solde de tout compte, certificat de travail, attestation Pôle emploi)
7. Formule de politesse
8. Signature

IMPORTANT : Ne pas motiver la rupture au-delà du strict nécessaire. Mets [ENTRE_CROCHETS] les champs à compléter.`
  }

  if (!prompt) {
    return NextResponse.json({ error: 'Type de document non supporté' }, { status: 400 })
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = msg.content[0]
    const text = block.type === 'text' ? block.text.trim() : ''

    // Passer l'alerte en in_progress
    if (alert_id) {
      await supabaseAdmin
        .from('compliance_alerts')
        .update({ status: 'in_progress' })
        .eq('id', alert_id)
    }

    return NextResponse.json({ text, document_type })
  } catch (err) {
    console.error('[generate-document]', err)
    return NextResponse.json({ error: 'Erreur génération Claude' }, { status: 500 })
  }
}
