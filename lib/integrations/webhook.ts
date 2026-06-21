import { createHmac } from 'crypto'
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

// Retry policy: bounded so it fits within a serverless invocation. We only retry
// transient failures (network error, 429, 5xx) — 4xx are permanent and not retried.
const MAX_ATTEMPTS = 3
const BACKOFF_MS = [0, 600, 1800]

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function signPayload(secret: string, rawBody: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
}

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
    text: templates[event] ?? `Quartzbase — ${event}`,
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text: templates[event] ?? `Quartzbase — ${event}` } }],
  }
}

type DeliverOptions = {
  url: string
  body: object
  event: string
  target: 'webhook' | 'slack'
  establishmentId?: string
  signingSecret?: string
  extraHeaders?: Record<string, string>
  log?: boolean
}

/**
 * Deliver a payload with bounded retries. Generic webhooks are HMAC-signed when a
 * signing secret is provided. The delivered payload, attempt count and outcome are
 * recorded in webhook_logs (unless `log: false`).
 */
async function deliver(opts: DeliverOptions): Promise<{ ok: boolean; statusCode: number | null; attempts: number }> {
  const { url, body, event, target, establishmentId, signingSecret, extraHeaders, log = true } = opts

  const rawBody = JSON.stringify(body)
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders }
  if (target === 'webhook' && signingSecret) {
    headers['X-Quartzbase-Signature'] = signPayload(signingSecret, rawBody)
  }

  const start = Date.now()
  let statusCode: number | null = null
  let success = false
  let attempts = 0

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (BACKOFF_MS[i]) await sleep(BACKOFF_MS[i])
    attempts++
    try {
      const res = await fetch(url, { method: 'POST', headers, body: rawBody })
      statusCode = res.status
      success = res.ok
      if (success) break
      // Permanent failure (4xx other than 429) — stop retrying.
      if (res.status < 500 && res.status !== 429) break
    } catch {
      statusCode = null // network error — retry
    }
  }

  const duration = Date.now() - start

  if (log && establishmentId) {
    void supabaseAdmin.from('webhook_logs').insert({
      establishment_id: establishmentId,
      event,
      target,
      url,
      status_code: statusCode,
      success,
      duration_ms: duration,
      attempts,
      payload: body,
    })
  }

  return { ok: success, statusCode, attempts }
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
  const signingSecret = settings.webhook_signing_secret || undefined

  if (!webhookOn && !slackOn) return

  // Check per-event filter for webhook
  const enabledEvents = settings.webhook_events
    ? (JSON.parse(settings.webhook_events) as Record<string, boolean>)
    : {}

  const body = { event, timestamp: new Date().toISOString(), ...payload }
  const promises: Promise<unknown>[] = []

  if (webhookOn && webhookUrl && (enabledEvents[event] !== false)) {
    promises.push(deliver({
      url: webhookUrl,
      body,
      event,
      target: 'webhook',
      establishmentId: opts?.establishmentId,
      signingSecret,
      extraHeaders: { 'X-Nexus-Event': event, 'X-Quartzbase-Event': event },
    }))
  }

  if (slackOn && slackUrl) {
    promises.push(deliver({
      url: slackUrl,
      body: buildSlackMessage(event, payload),
      event,
      target: 'slack',
      establishmentId: opts?.establishmentId,
    }))
  }

  await Promise.allSettled(promises)
}

/**
 * Re-deliver a previously logged payload to the same destination. Used by the
 * "Renvoyer" action in the integrations UI. Generic webhooks are re-signed with
 * the current signing secret. Records a fresh webhook_logs row.
 */
export async function resendWebhook(opts: {
  url: string
  body: object
  event: string
  target: 'webhook' | 'slack'
  establishmentId: string
  signingSecret?: string
}): Promise<{ ok: boolean; statusCode: number | null; attempts: number }> {
  return deliver({
    url: opts.url,
    body: opts.body,
    event: opts.event,
    target: opts.target,
    establishmentId: opts.establishmentId,
    signingSecret: opts.signingSecret,
    extraHeaders: opts.target === 'webhook'
      ? { 'X-Nexus-Event': opts.event, 'X-Quartzbase-Event': opts.event }
      : undefined,
  })
}

export async function testWebhook(
  url: string,
  type: 'generic' | 'slack',
  signingSecret?: string,
): Promise<{ ok: boolean; status?: number }> {
  const body = type === 'slack'
    ? { text: '✅ *Test Quartzbase* — connexion Slack opérationnelle', blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '✅ *Test Quartzbase* — connexion Slack opérationnelle' } }] }
    : { event: 'test', timestamp: new Date().toISOString(), message: 'Connexion webhook Quartzbase opérationnelle' }

  const result = await deliver({
    url,
    body,
    event: 'test',
    target: type === 'slack' ? 'slack' : 'webhook',
    signingSecret,
    extraHeaders: type === 'slack' ? undefined : { 'X-Nexus-Event': 'test', 'X-Quartzbase-Event': 'test' },
    log: false,
  })
  return { ok: result.ok, status: result.statusCode ?? undefined }
}
