export type WebhookEvent =
  | 'planning.published'
  | 'leave.approved'
  | 'leave.rejected'
  | 'leave.requested'

export type WebhookPayload = Record<string, unknown>

function buildSlackMessage(event: WebhookEvent, payload: WebhookPayload): object {
  const templates: Record<WebhookEvent, string> = {
    'planning.published': `✅ *Planning publié* — ${payload.weekLabel}\n${payload.employeeCount ?? 0} employé(s) concerné(s)`,
    'leave.approved':     `🏖 *Congé approuvé* — ${payload.employeeName}\n${payload.leaveType} · ${payload.startDate} → ${payload.endDate}`,
    'leave.rejected':     `❌ *Congé refusé* — ${payload.employeeName}\n${payload.leaveType} · ${payload.startDate} → ${payload.endDate}`,
    'leave.requested':    `📋 *Nouvelle demande de congé* — ${payload.employeeName}\n${payload.leaveType} · ${payload.startDate} → ${payload.endDate}`,
  }
  return {
    text: templates[event] ?? `Nexus — ${event}`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: templates[event] ?? `Nexus — ${event}` },
      },
    ],
  }
}

export async function fireWebhook(
  settings: Record<string, string>,
  event: WebhookEvent,
  payload: WebhookPayload,
): Promise<void> {
  const webhookUrl  = settings.webhook_url
  const slackUrl    = settings.slack_webhook_url
  const webhookOn   = settings.webhook_enabled === '1'
  const slackOn     = settings.slack_webhook_enabled === '1'

  if (!webhookOn && !slackOn) return

  const body = { event, timestamp: new Date().toISOString(), ...payload }
  const promises: Promise<unknown>[] = []

  if (webhookOn && webhookUrl) {
    promises.push(
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Nexus-Event': event },
        body: JSON.stringify(body),
      }).catch(() => {}),
    )
  }

  if (slackOn && slackUrl) {
    promises.push(
      fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSlackMessage(event, payload)),
      }).catch(() => {}),
    )
  }

  await Promise.allSettled(promises)
}

export async function testWebhook(url: string, type: 'generic' | 'slack'): Promise<{ ok: boolean; status?: number }> {
  try {
    const body = type === 'slack'
      ? { text: '✅ *Test Nexus* — connexion Slack opérationnelle', blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '✅ *Test Nexus* — connexion Slack opérationnelle' } }] }
      : { event: 'test', timestamp: new Date().toISOString(), message: 'Connexion webhook Nexus opérationnelle' }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Nexus-Event': 'test' },
      body: JSON.stringify(body),
    })
    return { ok: res.ok, status: res.status }
  } catch {
    return { ok: false }
  }
}
