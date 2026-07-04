import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/operator'
import { notifyOps } from '@/lib/ops-alert'

// POST /api/admin/test-alert — envoie une alerte de test pour vérifier
// que le canal (Slack / email) fonctionne. Réservé à l'opérateur.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isOperator(user.email)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  await notifyOps({
    subject: 'Alerte de test',
    body: `Ceci est une alerte de test déclenchée depuis le back-office par ${user.email}. Si tu reçois ce message, le canal d'alerte fonctionne. ✅`,
  })

  const channels = [
    process.env.SLACK_WEBHOOK_URL ? 'Slack' : null,
    (process.env.OPS_RESEND_API_KEY || process.env.RESEND_API_KEY) ? 'email' : null,
  ].filter(Boolean)

  return NextResponse.json({ ok: true, channels })
}
