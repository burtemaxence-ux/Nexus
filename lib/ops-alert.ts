import { Resend } from 'resend'
import { sendSlackMessage } from '@/lib/integrations/slack'
import { log } from '@/lib/logger'

// Adresse de secours si OPS_ALERT_EMAIL n'est pas défini.
const FALLBACK_OPS_EMAIL = 'assistance.quartzbase@mail.fr'

/**
 * Alerte l'opérateur (toi) quand quelque chose mérite ton attention :
 * nouveau signalement, incident, etc.
 *
 * Envoie sur Slack (si SLACK_WEBHOOK_URL) ET/OU par email (si RESEND_API_KEY).
 * Ne lève jamais d'erreur : une alerte qui échoue ne doit pas casser l'action
 * qui l'a déclenchée.
 */
export async function notifyOps({ subject, body }: { subject: string; body: string }): Promise<void> {
  const tasks: Promise<unknown>[] = []

  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (webhookUrl) {
    tasks.push(
      sendSlackMessage(webhookUrl, `🔔 *${subject}*\n${body}`).catch(e =>
        log({ level: 'warn', message: 'notifyOps: envoi Slack échoué', context: { error: String(e) } })
      )
    )
  }

  // Clé dédiée au back-office si fournie, sinon la clé Resend de l'app.
  const apiKey = process.env.OPS_RESEND_API_KEY ?? process.env.RESEND_API_KEY
  if (apiKey) {
    const to = process.env.OPS_ALERT_EMAIL ?? FALLBACK_OPS_EMAIL
    const from = process.env.RESEND_FROM_EMAIL ?? 'Quartzbase <noreply@quartzbase.fr>'
    const resend = new Resend(apiKey)
    tasks.push(
      resend.emails
        .send({ from, to, subject: `[Quartzbase] ${subject}`, text: body })
        .catch(e => log({ level: 'warn', message: 'notifyOps: envoi email échoué', context: { error: String(e) } }))
    )
  }

  if (tasks.length === 0) {
    log({
      level: 'warn',
      message: 'notifyOps: aucun canal configuré (ni SLACK_WEBHOOK_URL ni RESEND_API_KEY)',
      context: { subject },
    })
    return
  }

  await Promise.allSettled(tasks)
}
