import { supabaseAdmin } from '@/lib/supabase/admin'

export type WebhookEvent =
  | 'planning.published'
  | 'leave.approved'
  | 'leave.rejected'
  | 'leave.requested'
  | 'shift.created'
  | 'shift.deleted'
  | 'exchange.approved'

export type WebhookPayload = Record<string, unknown>

function buildSlackMessage(event: WebhookEvent, payload: WebhookPayload): object {
  const templates: Record<WebhookEvent, string> = {
    'planning.published': `✅ *Planning publié* — ${payload.weekLabel}\n${payload.employeeCount ?? 0} employé(s) concerné(s)`,
    'leave.approved':     `🏖 *Congé approuvé* — ${payload.employeeName}\n${payload.leaveType} · ${payload.startDate} → ${payload.endDate}`,
    'leave.rejected':     `❌ *Congé refusé* — ${payload.employeeName}\n${payload.leaveType} · ${payload.startDate} → ${payload.endDate}`,
    'leave.requested':    `📋 *Nouvelle demande de congé* — ${payload.employeeName}\n${payload.leaveType} · ${payload.startDate} → ${payload.endDate}`,
    'shift.created':      `📅 *Shift créé* — ${payload.employeeName}\n${payload.date} · ${payload.startTime}–${payload.endTime}`,
    'shift.deleted':      `🗑 *Shift supprimé* — ${payload.employeeName}\n${payload.date} · ${payload.startTime}–${payload.endTime}`,
    'exchange.approved':  `🔄 *Échange approuvé* — ${payload.proposerName} ↔ ${payload.acceptorName}\n${payload.date} · ${payload.startTime}–${payload.endTime}`,
  }
  return {
    text: templates[event] ?? `Nexus — ${event}`,
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text: templates[event] ?? `Nexus — ${event}` } }],
  }
}

async function deliver(
  url: string,
  body: object,
  headers: Record<string, string>,
  event: WebhookEvent,
  target: 'webhook' | 'slack',
  establishmentId?: string,
): Promise<void> {
  const start = Date.now()
  let statusCode: number | null = null
  let success = false
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
    statusCode = res.status
    success = res.ok
  } catch {
    // network error — logged as failure below
  }
  const duration = Date.now() - start

  if (establishmentId) {
    void supabaseAdmin.from('webhook_logs').insert({
      establishment_id: establishmentId,
      event,
      target,
      url,
      status_code: statusCode,
      success,
      duration_ms: duration,
    })
  }
}

export async function fireWebhook(
  settings: Record<string, string>,
  event: WebhookEvent,
  payload: WebhookPayload,
  opts?: { establishmentId?: string },
): Promise<void> {
  const webhookUrl = settings.webhook_url
  const slackUrl   = settings.slack_webhook_url
  const webhookOn  = settings.webhook_enabled === '1'
  const slackOn    = settings.slack_webhook_enabled === '1'

  if (!webhookOn && !slackOn) return

  // Check per-event filter for webhook
  const enabledEvents = settings.webhook_events
    ? (JSON.parse(settings.webhook_events) as Record<string, boolean>)
    : {}

  const body = { event, timestamp: new Date().toISOString(), ...payload }
  const promises: Promise<void>[] = []

  if (webhookOn && webhookUrl && (enabledEvents[event] !== false)) {
    promises.push(deliver(webhookUrl, body, { 'X-Nexus-Event': event }, event, 'webhook', opts?.establishmentId))
  }

  if (slackOn && slackUrl) {
    promises.push(deliver(slackUrl, buildSlackMessage(event, payload), {}, event, 'slack', opts?.establishmentId))
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
