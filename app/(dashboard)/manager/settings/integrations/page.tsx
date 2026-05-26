'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, Check, Send, Plug, Hash, Calendar,
  Key, Plus, Trash2, Copy, CheckCircle, Eye, EyeOff,
  RefreshCw, CircleCheck, CircleX,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// ── Types ─────────────────────────────────────────────────────────────────────

type TestState = 'idle' | 'loading' | 'success' | 'error'

type WebhookLog = {
  id: string
  event: string
  target: string
  url: string
  status_code: number | null
  success: boolean
  duration_ms: number | null
  created_at: string
}

type ApiToken = {
  id: string
  name: string
  last_used_at: string | null
  created_at: string
  raw_token?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEBHOOK_EVENTS = [
  { id: 'planning.published', label: 'Planning publié',         description: 'Quand un planning de semaine est publié' },
  { id: 'leave.requested',   label: 'Nouvelle demande de congé', description: 'Quand un employé dépose une demande' },
  { id: 'leave.approved',    label: 'Congé approuvé',            description: 'Quand une demande est validée' },
  { id: 'leave.rejected',    label: 'Congé refusé',              description: 'Quand une demande est refusée' },
  { id: 'shift.created',     label: 'Shift créé',                description: 'Quand un nouveau créneau est planifié' },
  { id: 'shift.deleted',     label: 'Shift supprimé',            description: 'Quand un créneau est supprimé' },
  { id: 'exchange.approved', label: 'Échange approuvé',          description: 'Quand un échange de shift est validé par le manager' },
]

const EVENT_LABELS: Record<string, string> = Object.fromEntries(WEBHOOK_EVENTS.map(e => [e.id, e.label]))

// ── Sub-components ────────────────────────────────────────────────────────────

function SlackLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect width="24" height="24" rx="3" fill="#4A154B" />
      <circle cx="8.5" cy="8.5" r="1.8" fill="#E01E5A" />
      <circle cx="15.5" cy="8.5" r="1.8" fill="#36C5F0" />
      <circle cx="8.5" cy="15.5" r="1.8" fill="#2EB67D" />
      <circle cx="15.5" cy="15.5" r="1.8" fill="#ECB22E" />
    </svg>
  )
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0"
      style={{ backgroundColor: enabled ? 'var(--accent)' : 'var(--border)' }}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200"
        style={{ transform: enabled ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

function SaveButton({ saving, saved, onSave }: { saving: boolean; saved: boolean; onSave: () => void }) {
  return (
    <button
      onClick={onSave}
      disabled={saving}
      className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors duration-150 disabled:opacity-50"
      style={saved
        ? { backgroundColor: '#F0FDF4', border: '0.5px solid #BBF7D0', color: '#15803D' }
        : { backgroundColor: 'var(--accent-light)', border: '0.5px solid var(--accent)', color: 'var(--accent)' }
      }
    >
      {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Enregistrement…</>
              : saved  ? <><Check className="h-3.5 w-3.5" />Enregistré</>
              : 'Enregistrer'}
    </button>
  )
}

function TestButton({ state, disabled, onTest, label }: { state: TestState; disabled: boolean; onTest: () => void; label: string }) {
  const styles: Record<TestState, React.CSSProperties> = {
    idle:    { border: '0.5px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)' },
    loading: { border: '0.5px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-tertiary)' },
    success: { border: '0.5px solid var(--success)', backgroundColor: '#F0FDF4', color: 'var(--success)' },
    error:   { border: '0.5px solid var(--danger)', backgroundColor: '#FEE2E2', color: 'var(--danger)' },
  }
  const labels: Record<TestState, string> = { idle: label, loading: 'Test…', success: 'Succès ✓', error: 'Erreur ✗' }
  return (
    <button onClick={onTest} disabled={disabled || state === 'loading'}
      className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors duration-150 disabled:opacity-40"
      style={styles[state]}
    >
      {state === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      {labels[state]}
    </button>
  )
}

// ── Webhook logs section ──────────────────────────────────────────────────────

function WebhookLogsSection() {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/integrations/logs')
    if (res.ok) setLogs(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  if (logs.length === 0 && !loading) return null

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
          Dernières livraisons
        </p>
        <button onClick={fetchLogs} className="p-1 rounded" style={{ color: 'var(--text-tertiary)' }} title="Rafraîchir">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
      ) : (
        <div className="space-y-1">
          {logs.slice(0, 10).map(log => (
            <div key={log.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
              style={{ backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
              {log.success
                ? <CircleCheck className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                : <CircleX className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--danger)' }} />
              }
              <span className="font-medium flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                {EVENT_LABELS[log.event] ?? log.event}
              </span>
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px]"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                {log.target}
              </span>
              {log.status_code && (
                <span style={{ color: log.success ? 'var(--success)' : 'var(--danger)' }}>
                  {log.status_code}
                </span>
              )}
              {log.duration_ms && (
                <span style={{ color: 'var(--text-tertiary)' }}>{log.duration_ms}ms</span>
              )}
              <span className="ml-auto flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                {new Date(log.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── API Tokens section ────────────────────────────────────────────────────────

function ApiTokensCard() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    fetch('/api/integrations/tokens')
      .then(r => r.ok ? r.json() : [])
      .then(setTokens)
      .finally(() => setLoading(false))
  }, [])

  async function create() {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    const res = await fetch('/api/integrations/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const data = await res.json() as ApiToken & { raw_token?: string; error?: string }
    if (!res.ok) {
      setError(data.error ?? 'Erreur')
    } else {
      setNewToken(data.raw_token ?? null)
      setTokens(prev => [{ id: data.id, name: data.name, last_used_at: null, created_at: data.created_at }, ...prev])
      setNewName('')
    }
    setCreating(false)
  }

  async function revoke(id: string) {
    setRevoking(id)
    await fetch(`/api/integrations/tokens/${id}`, { method: 'DELETE' })
    setTokens(prev => prev.filter(t => t.id !== id))
    setRevoking(null)
  }

  function copyToken() {
    if (!newToken) return
    navigator.clipboard.writeText(newToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F5F5F5' }}>
            <Key className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <CardTitle className="text-base">API REST (lecture seule)</CardTitle>
            <CardDescription>Connectez Zapier, Make ou tout outil externe pour lire vos données.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Endpoints reference */}
        <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
          <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Endpoints disponibles</p>
          {[
            { method: 'GET', path: '/api/v1/shifts', hint: '?from=YYYY-MM-DD&to=YYYY-MM-DD' },
            { method: 'GET', path: '/api/v1/employees', hint: '' },
            { method: 'GET', path: '/api/v1/leaves', hint: '?status=pending' },
          ].map(ep => (
            <div key={ep.path} className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                {ep.method}
              </span>
              <code className="text-[12px] font-mono" style={{ color: 'var(--text-primary)' }}>{ep.path}</code>
              {ep.hint && <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{ep.hint}</span>}
            </div>
          ))}
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
            Auth : <code className="font-mono">Authorization: Bearer {'<'}token{'>'}</code>
          </p>
        </div>

        {/* New token revealed */}
        {newToken && (
          <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: '#F0FDF4', border: '0.5px solid #BBF7D0' }}>
            <p className="text-[12px] font-semibold" style={{ color: '#15803D' }}>
              Token créé — copiez-le maintenant, il ne sera plus affiché
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[12px] font-mono break-all px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'white', border: '0.5px solid #BBF7D0', color: '#15803D' }}>
                {showToken ? newToken : newToken.slice(0, 8) + '•'.repeat(newToken.length - 8)}
              </code>
              <button onClick={() => setShowToken(v => !v)} className="p-1.5 rounded" style={{ color: '#15803D' }}>
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button onClick={copyToken} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                style={{ backgroundColor: '#15803D', color: 'white' }}>
                {copied ? <><CheckCircle className="h-3.5 w-3.5" />Copié</> : <><Copy className="h-3.5 w-3.5" />Copier</>}
              </button>
            </div>
          </div>
        )}

        {/* Token list */}
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
        ) : (
          <div className="space-y-1.5">
            {tokens.map(token => (
              <div key={token.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                <Key className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{token.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    Créé le {new Date(token.created_at).toLocaleDateString('fr-FR')}
                    {token.last_used_at && ` · Utilisé le ${new Date(token.last_used_at).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
                <button onClick={() => revoke(token.id)} disabled={revoking === token.id}
                  className="p-1.5 rounded transition-colors disabled:opacity-50"
                  style={{ color: 'var(--text-tertiary)' }} title="Révoquer">
                  {revoking === token.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
            {tokens.length === 0 && !newToken && (
              <p className="text-[12px] text-center py-2" style={{ color: 'var(--text-tertiary)' }}>Aucun token. Créez-en un ci-dessous.</p>
            )}
          </div>
        )}

        {/* Create token form */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') create() }}
            placeholder="Nom du token (ex : Zapier prod)"
            className="dp-input flex-1 px-3 py-2 text-[13px]"
          />
          <button onClick={create} disabled={!newName.trim() || creating}
            className="btn-primary flex items-center gap-1.5 text-[13px] disabled:opacity-50">
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Créer
          </button>
        </div>

        {error && <p className="text-[12px]" style={{ color: 'var(--danger)' }}>{error}</p>}
      </CardContent>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true)

  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEnabled, setWebhookEnabled] = useState(false)
  const [webhookEvents, setWebhookEvents] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(WEBHOOK_EVENTS.map(e => [e.id, true]))
  )
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [savedWebhook, setSavedWebhook] = useState(false)
  const [testWebhook, setTestWebhook] = useState<TestState>('idle')

  const [slackUrl, setSlackUrl] = useState('')
  const [slackEnabled, setSlackEnabled] = useState(false)
  const [savingSlack, setSavingSlack] = useState(false)
  const [savedSlack, setSavedSlack] = useState(false)
  const [testSlack, setTestSlack] = useState<TestState>('idle')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        setWebhookUrl(data.webhook_url ?? '')
        setWebhookEnabled(data.webhook_enabled === '1')
        setSlackUrl(data.slack_webhook_url ?? '')
        setSlackEnabled(data.slack_webhook_enabled === '1')
        if (data.webhook_events) {
          try { setWebhookEvents(JSON.parse(data.webhook_events)) } catch { /* keep defaults */ }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function saveWebhook() {
    setSavingWebhook(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhook_url: webhookUrl,
        webhook_enabled: webhookEnabled ? '1' : '0',
        webhook_events: JSON.stringify(webhookEvents),
      }),
    })
    setSavingWebhook(false)
    setSavedWebhook(true)
    setTimeout(() => setSavedWebhook(false), 2500)
  }

  async function saveSlack() {
    setSavingSlack(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slack_webhook_url: slackUrl,
        slack_webhook_enabled: slackEnabled ? '1' : '0',
      }),
    })
    setSavingSlack(false)
    setSavedSlack(true)
    setTimeout(() => setSavedSlack(false), 2500)
  }

  async function runTest(type: 'webhook' | 'slack') {
    const setter = type === 'webhook' ? setTestWebhook : setTestSlack
    setter('loading')
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      setter(res.ok && data.ok ? 'success' : 'error')
    } catch {
      setter('error')
    }
    setTimeout(() => setter('idle'), 3500)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10 space-y-6">
      <div>
        <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
          Intégrations
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Connectez Nexus à vos outils pour automatiser votre workflow.
        </p>
      </div>

      {/* ── Webhook sortant ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Plug className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Webhook sortant</CardTitle>
                <Toggle enabled={webhookEnabled} onToggle={() => setWebhookEnabled(v => !v)} />
              </div>
              <CardDescription>Compatible Zapier, Make, n8n et tout outil no-code.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>
              URL de destination
            </p>
            <Input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/…" disabled={!webhookEnabled} />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>
              Événements déclencheurs
            </p>
            <div className="space-y-1.5">
              {WEBHOOK_EVENTS.map(ev => (
                <label key={ev.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
                  style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                  <input type="checkbox" checked={webhookEvents[ev.id] ?? false}
                    onChange={() => setWebhookEvents(prev => ({ ...prev, [ev.id]: !prev[ev.id] }))}
                    disabled={!webhookEnabled} className="mt-0.5 accent-[var(--accent)]" />
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{ev.label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{ev.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <TestButton state={testWebhook} disabled={!webhookUrl} onTest={() => runTest('webhook')} label="Tester" />
            <SaveButton saving={savingWebhook} saved={savedWebhook} onSave={saveWebhook} />
          </div>

          <WebhookLogsSection />
        </CardContent>
      </Card>

      {/* ── Slack ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#F9F0FF', border: '0.5px solid #E9D5FF' }}>
              <SlackLogo />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Slack</CardTitle>
                <Toggle enabled={slackEnabled} onToggle={() => setSlackEnabled(v => !v)} />
              </div>
              <CardDescription>Recevez les alertes RH directement dans un canal Slack.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl px-4 py-3 space-y-1" style={{ backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Comment obtenir l&apos;URL</p>
            <ol className="text-[12px] space-y-0.5 list-decimal list-inside" style={{ color: 'var(--text-secondary)' }}>
              <li>Dans Slack : <strong>Apps</strong> → chercher <strong>Incoming WebHooks</strong></li>
              <li>Choisir un canal → <strong>Add Incoming Webhooks integration</strong></li>
              <li>Copier l&apos;URL <code className="text-[11px] font-mono px-1 rounded" style={{ backgroundColor: 'var(--border)' }}>https://hooks.slack.com/services/…</code></li>
            </ol>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>
              Incoming Webhook URL
            </p>
            <Input type="url" value={slackUrl} onChange={e => setSlackUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/T.../B.../…" disabled={!slackEnabled} />
          </div>
          <div className="flex gap-2 justify-end">
            <TestButton state={testSlack} disabled={!slackUrl} onTest={() => runTest('slack')} label="Tester" />
            <SaveButton saving={savingSlack} saved={savedSlack} onSave={saveSlack} />
          </div>
        </CardContent>
      </Card>

      {/* ── iCal ──────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Calendar className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <CardTitle className="text-base">Abonnement Calendrier (iCal)</CardTitle>
              <CardDescription>Permet à chaque employé de synchroniser ses shifts avec son calendrier.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl px-4 py-3.5 space-y-2" style={{ backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Comment ça marche</p>
            <ul className="text-[12px] space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start gap-2"><span style={{ color: 'var(--accent)' }}>→</span>Chaque employé dispose d&apos;un lien iCal <strong>personnel</strong> sur sa page planning.</li>
              <li className="flex items-start gap-2"><span style={{ color: 'var(--accent)' }}>→</span>Il peut l&apos;ajouter à <strong>Google Calendar, Outlook ou Apple Calendrier</strong> — aucune connexion requise.</li>
              <li className="flex items-start gap-2"><span style={{ color: 'var(--accent)' }}>→</span>Le calendrier se <strong>synchronise automatiquement</strong> à chaque mise à jour du planning.</li>
            </ul>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--accent-light)', border: '0.5px solid var(--accent)' }}>
            <Hash className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
            <p className="text-[12px]" style={{ color: 'var(--accent)' }}>
              Dirigez vos employés vers <strong>Mon espace → Planning</strong> pour trouver leur lien.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── API tokens ────────────────────────────────────────────────────── */}
      <ApiTokensCard />
    </div>
  )
}
