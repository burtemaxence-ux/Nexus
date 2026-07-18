'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, Check, X, Send, Hash, Key, Plus, Trash2, Copy, CheckCircle, Eye, EyeOff,
  RefreshCw, CircleCheck, CircleX, ShieldCheck, ChevronDown, ChevronRight,
  PlugZap, Webhook, CalendarClock, Terminal,
} from 'lucide-react'
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
  attempts: number | null
  created_at: string
}

type ApiToken = {
  id: string
  name: string
  last_used_at: string | null
  created_at: string
  raw_token?: string
}

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

// ── Shared bits ────────────────────────────────────────────────────────────────

function Switch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return <button className={`nx-switch sm ${enabled ? 'on' : ''}`} onClick={onToggle} role="switch" aria-checked={enabled} />
}

function ConnDot({ active, activeLabel = 'Actif', inactiveLabel = 'Inactif' }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return <span className={`nx-conn-dot ${active ? 'on' : ''}`}>{active ? activeLabel : inactiveLabel}</span>
}

function SaveBtn({ saving, saved, onSave }: { saving: boolean; saved: boolean; onSave: () => void }) {
  return (
    <button onClick={onSave} disabled={saving} className="btn-secondary" style={{ fontSize: 13, color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-light)' }}>
      {saving ? <><Loader2 className="ic14 nx-spin" />Enregistrement…</> : saved ? <><Check className="ic14" />Enregistré</> : 'Enregistrer'}
    </button>
  )
}

function TestBtn({ state, disabled, onTest }: { state: TestState; disabled: boolean; onTest: () => void }) {
  const labels: Record<TestState, string> = { idle: 'Tester', loading: 'Test…', success: 'Succès ✓', error: 'Erreur ✗' }
  const color: Record<TestState, string> = { idle: 'var(--text-secondary)', loading: 'var(--text-tertiary)', success: 'var(--success)', error: 'var(--danger)' }
  return (
    <button onClick={onTest} disabled={disabled || state === 'loading'} className="btn-secondary" style={{ fontSize: 13, color: color[state], borderColor: state === 'success' ? 'var(--success)' : state === 'error' ? 'var(--danger)' : 'var(--border)' }}>
      {state === 'loading' ? <Loader2 className="ic14 nx-spin" /> : <Send className="ic14" />}{labels[state]}
    </button>
  )
}

// ── Webhook logs ────────────────────────────────────────────────────────────────

function WebhookLogsSection({ enabled }: { enabled: boolean }) {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/integrations/logs')
    if (res.ok) setLogs(await res.json())
    setLoading(false)
  }, [])

  const resend = useCallback(async (id: string) => {
    setResending(id)
    await fetch(`/api/integrations/logs/${id}/resend`, { method: 'POST' }).catch(() => {})
    setResending(null)
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  if (logs.length === 0 && !loading && !enabled) return null

  if (logs.length === 0 && !loading) {
    return <div style={{ marginTop: 16, borderRadius: 10, padding: '12px', fontSize: 12, textAlign: 'center', background: 'var(--bg-page)', border: '0.5px solid var(--border)', color: 'var(--text-tertiary)' }}>Les livraisons apparaîtront ici après le premier événement.</div>
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p className="nx-eyebrow">Dernières livraisons</p>
        <button onClick={fetchLogs} className="nx-iconbtn" style={{ width: 28, height: 28 }} title="Rafraîchir"><RefreshCw className="ic14" style={{ color: 'var(--text-tertiary)' }} /></button>
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Loader2 className="ic16 nx-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {logs.slice(0, 10).map(log => (
            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, fontSize: 12, background: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
              {log.success ? <CircleCheck className="ic14" style={{ flexShrink: 0, color: 'var(--success)' }} /> : <CircleX className="ic14" style={{ flexShrink: 0, color: 'var(--danger)' }} />}
              <span style={{ fontWeight: 500, flexShrink: 0, color: 'var(--text-primary)' }}>{EVENT_LABELS[log.event] ?? log.event}</span>
              <span style={{ flexShrink: 0, padding: '2px 6px', borderRadius: 5, fontSize: 10, background: 'var(--accent-light)', color: 'var(--accent)' }}>{log.target}</span>
              {log.status_code && <span style={{ color: log.success ? 'var(--success)' : 'var(--danger)' }}>{log.status_code}</span>}
              {log.duration_ms != null && <span style={{ color: 'var(--text-tertiary)' }}>{log.duration_ms}ms</span>}
              {(log.attempts ?? 1) > 1 && <span style={{ flexShrink: 0, padding: '2px 6px', borderRadius: 5, fontSize: 10, background: 'var(--sev-warning-chip)', color: 'var(--sev-warning-fg)' }} title={`${log.attempts} tentatives`}>×{log.attempts}</span>}
              <span style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--text-tertiary)' }}>{new Date(log.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <button onClick={() => resend(log.id)} disabled={resending === log.id} className="nx-iconbtn" style={{ width: 26, height: 26, flexShrink: 0 }} title="Renvoyer">
                {resending === log.id ? <Loader2 className="ic14 nx-spin" /> : <RefreshCw className="ic14" style={{ color: 'var(--text-tertiary)' }} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Signing secret ──────────────────────────────────────────────────────────────

function SigningSecretSection() {
  const [secret, setSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.ok ? r.json() : {}).then((data: Record<string, string>) => setSecret(data.webhook_signing_secret || null)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function generate() {
    if (secret && !confirm('Régénérer le secret invalidera l\'ancien : vos vérifications de signature échoueront jusqu\'à mise à jour. Continuer ?')) return
    setGenerating(true)
    const res = await fetch('/api/integrations/signing-secret', { method: 'POST' })
    if (res.ok) { const data = await res.json() as { secret: string }; setSecret(data.secret); setReveal(true) }
    setGenerating(false)
  }

  function copy() {
    if (!secret) return
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return null

  return (
    <div>
      <p className="nx-eyebrow" style={{ marginBottom: 8 }}>Signature des envois</p>
      <div style={{ borderRadius: 12, padding: 16, background: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <ShieldCheck className="ic16" style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Chaque requête est signée via l&apos;en-tête <code className="nx-mono" style={{ fontSize: 11, padding: '1px 4px', borderRadius: 4, background: 'var(--border)' }}>X-Quartzbase-Signature</code> (<code className="nx-mono" style={{ fontSize: 11 }}>sha256=HMAC(corps)</code>). Vérifiez-la côté serveur pour garantir l&apos;authenticité.
          </p>
        </div>
        {secret ? (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code className="nx-mono" style={{ flex: 1, fontSize: 12, wordBreak: 'break-all', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '0.5px solid var(--border)', color: 'var(--text-primary)' }}>{reveal ? secret : secret.slice(0, 10) + '•'.repeat(Math.max(0, secret.length - 10))}</code>
              <button onClick={() => setReveal(v => !v)} className="nx-iconbtn" style={{ width: 30, height: 30 }} title={reveal ? 'Masquer' : 'Afficher'}>{reveal ? <EyeOff className="ic16" style={{ color: 'var(--text-secondary)' }} /> : <Eye className="ic16" style={{ color: 'var(--text-secondary)' }} />}</button>
              <button onClick={copy} className="btn-secondary" style={{ fontSize: 12, color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-light)' }}>{copied ? <><CheckCircle className="ic14" />Copié</> : <><Copy className="ic14" />Copier</>}</button>
            </div>
            <button onClick={generate} disabled={generating} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', width: 'fit-content' }}>{generating ? <Loader2 className="ic14 nx-spin" /> : <RefreshCw className="ic14" />}Régénérer le secret</button>
          </div>
        ) : (
          <button onClick={generate} disabled={generating} className="btn-secondary" style={{ marginTop: 12, fontSize: 12, color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-light)' }}>{generating ? <Loader2 className="ic14 nx-spin" /> : <Key className="ic14" />}Générer un secret de signature</button>
        )}
      </div>
    </div>
  )
}

// ── API tokens ───────────────────────────────────────────────────────────────────

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

  useEffect(() => { fetch('/api/integrations/tokens').then(r => r.ok ? r.json() : []).then(setTokens).finally(() => setLoading(false)) }, [])

  async function create() {
    if (!newName.trim()) return
    setCreating(true); setError(null)
    const res = await fetch('/api/integrations/tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim() }) })
    const data = await res.json() as ApiToken & { raw_token?: string; error?: string }
    if (!res.ok) setError(data.error ?? 'Erreur')
    else { setNewToken(data.raw_token ?? null); setTokens(prev => [{ id: data.id, name: data.name, last_used_at: null, created_at: data.created_at }, ...prev]); setNewName('') }
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
    <div className="nx-card">
      <div className="nx-conn-head">
        <div className="nx-conn-logo" style={{ background: 'var(--accent-light)' }}><Terminal className="ic20" style={{ color: 'var(--accent)' }} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span className="nx-card-title">API REST (lecture seule)</span>
            {!loading && <ConnDot active={tokens.length > 0} activeLabel={`${tokens.length} clé${tokens.length > 1 ? 's' : ''}`} inactiveLabel="Aucune clé" />}
          </div>
          <div className="nx-card-desc">Connectez Zapier, Make ou tout outil externe pour lire vos données.</div>
        </div>
      </div>
      <div className="nx-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ borderRadius: 12, padding: 16, background: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Endpoints disponibles</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { method: 'GET', path: '/api/v1/shifts', hint: '?from=YYYY-MM-DD&to=YYYY-MM-DD' },
              { method: 'GET', path: '/api/v1/employees', hint: '' },
              { method: 'GET', path: '/api/v1/leaves', hint: '?status=pending' },
            ].map(ep => (
              <div key={ep.path} className="nx-endpoint">
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(16,185,129,.14)', color: '#0f9e82' }}>{ep.method}</span>
                <code className="nx-mono" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{ep.path}</code>
                {ep.hint && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ep.hint}</span>}
              </div>
            ))}
            <p style={{ fontSize: 11, marginTop: 4, color: 'var(--text-tertiary)' }}>Auth : <code className="nx-mono">Authorization: Bearer &lt;token&gt;</code></p>
          </div>
        </div>

        {newToken && (
          <div style={{ borderRadius: 12, padding: 16, background: 'rgba(16,185,129,.1)', border: '0.5px solid rgba(16,185,129,.3)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--emerald)', marginBottom: 8 }}>Token créé — copiez-le maintenant, il ne sera plus affiché</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code className="nx-mono" style={{ flex: 1, fontSize: 12, wordBreak: 'break-all', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '0.5px solid var(--border)', color: 'var(--text-primary)' }}>{showToken ? newToken : newToken.slice(0, 8) + '•'.repeat(newToken.length - 8)}</code>
              <button onClick={() => setShowToken(v => !v)} className="nx-iconbtn" style={{ width: 30, height: 30 }}>{showToken ? <EyeOff className="ic16" /> : <Eye className="ic16" />}</button>
              <button onClick={copyToken} className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>{copied ? <><CheckCircle className="ic14" />Copié</> : <><Copy className="ic14" />Copier</>}</button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Loader2 className="ic16 nx-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tokens.map(token => (
              <div key={token.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--bg-page)' }}>
                <Key className="ic14" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{token.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Créé le {new Date(token.created_at).toLocaleDateString('fr-FR')}{token.last_used_at && ` · Utilisé le ${new Date(token.last_used_at).toLocaleDateString('fr-FR')}`}</p>
                </div>
                <button onClick={() => revoke(token.id)} disabled={revoking === token.id} className="nx-iconbtn" style={{ width: 32, height: 32 }} title="Révoquer">{revoking === token.id ? <Loader2 className="ic14 nx-spin" /> : <Trash2 className="ic14" style={{ color: 'var(--text-tertiary)' }} />}</button>
              </div>
            ))}
            {tokens.length === 0 && !newToken && <p style={{ fontSize: 12, textAlign: 'center', padding: '8px 0', color: 'var(--text-tertiary)' }}>Aucun token. Créez-en un ci-dessous.</p>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') create() }} placeholder="Nom du token (ex : Zapier prod)" className="nx-input" style={{ flex: 1 }} />
          <button onClick={create} disabled={!newName.trim() || creating} className="btn-primary">{creating ? <Loader2 className="ic14 nx-spin" /> : <Plus className="ic14" />}Créer</button>
        </div>
        {error && <p style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true)

  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEnabled, setWebhookEnabled] = useState(false)
  const [webhookEvents, setWebhookEvents] = useState<Record<string, boolean>>(() => Object.fromEntries(WEBHOOK_EVENTS.map(e => [e.id, true])))
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [savedWebhook, setSavedWebhook] = useState(false)
  const [testWebhook, setTestWebhook] = useState<TestState>('idle')
  const [testWebhookMsg, setTestWebhookMsg] = useState<string | null>(null)
  const [eventsOpen, setEventsOpen] = useState(false)

  const [slackUrl, setSlackUrl] = useState('')
  const [slackEnabled, setSlackEnabled] = useState(false)
  const [savingSlack, setSavingSlack] = useState(false)
  const [savedSlack, setSavedSlack] = useState(false)
  const [testSlack, setTestSlack] = useState<TestState>('idle')
  const [testSlackMsg, setTestSlackMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        setWebhookUrl(data.webhook_url ?? '')
        setWebhookEnabled(data.webhook_enabled === '1')
        setSlackUrl(data.slack_webhook_url ?? '')
        setSlackEnabled(data.slack_webhook_enabled === '1')
        if (data.webhook_events) { try { setWebhookEvents(JSON.parse(data.webhook_events)) } catch { /* keep defaults */ } }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function saveWebhook() {
    setSavingWebhook(true)
    await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webhook_url: webhookUrl, webhook_enabled: webhookEnabled ? '1' : '0', webhook_events: JSON.stringify(webhookEvents) }) })
    setSavingWebhook(false); setSavedWebhook(true); setTimeout(() => setSavedWebhook(false), 2500)
  }

  async function saveSlack() {
    setSavingSlack(true)
    await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slack_webhook_url: slackUrl, slack_webhook_enabled: slackEnabled ? '1' : '0' }) })
    setSavingSlack(false); setSavedSlack(true); setTimeout(() => setSavedSlack(false), 2500)
  }

  async function runTest(type: 'webhook' | 'slack') {
    const setter = type === 'webhook' ? setTestWebhook : setTestSlack
    const setMsg = type === 'webhook' ? setTestWebhookMsg : setTestSlackMsg
    setter('loading'); setMsg(null)
    try {
      const res = await fetch('/api/integrations/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
      const data = await res.json()
      if (res.ok && data.ok) setter('success')
      else { setter('error'); setMsg(data.error ?? `La destination a répondu ${data.status ?? 'une erreur'} — vérifiez l'URL.`) }
    } catch { setter('error'); setMsg('Impossible de joindre la destination.') }
    setTimeout(() => { setter('idle'); setMsg(null) }, 6000)
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Loader2 className="ic20 nx-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
  }

  const connCount = (webhookEnabled && !!webhookUrl ? 1 : 0) + (slackEnabled && !!slackUrl ? 1 : 0) + 1

  return (
    <div className="nx-planpage" style={{ maxWidth: 672, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero */}
      <div className="nx-int-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PlugZap className="ic20" style={{ color: '#fff' }} /></div>
          <div style={{ flex: 1 }}><p style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", letterSpacing: '-.01em' }}>Connectez votre écosystème</p><p style={{ fontSize: 12.5, opacity: .85, marginTop: 2 }}>Automatisez vos flux RH avec Zapier, Slack, votre calendrier et votre propre API.</p></div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}><p style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{connCount}</p><p style={{ fontSize: 10, opacity: .8, marginTop: 3 }}>connexions</p></div>
        </div>
      </div>

      {/* Webhook */}
      <div className="nx-card">
        <div className="nx-conn-head">
          <div className="nx-conn-logo" style={{ background: 'linear-gradient(135deg,#6C63FF,#00D4AA)', boxShadow: '0 6px 16px rgba(108,99,255,.28)' }}><Webhook className="ic20" style={{ color: '#fff' }} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span className="nx-card-title">Webhook sortant</span>
              <Switch enabled={webhookEnabled} onToggle={() => setWebhookEnabled(v => !v)} />
            </div>
            <div className="nx-card-desc">Compatible Zapier, Make, n8n et tout outil no-code.</div>
            <div style={{ marginTop: 9 }}><ConnDot active={webhookEnabled && !!webhookUrl} activeLabel="Actif" inactiveLabel={webhookEnabled ? 'URL manquante' : 'Inactif'} /></div>
          </div>
        </div>
        <div className="nx-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label className="nx-label" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '.06em' }}>URL de destination</label>
            <Input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/…" disabled={!webhookEnabled} className="nx-input" />
          </div>
          <div>
            <button type="button" onClick={() => setEventsOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span className="nx-eyebrow">Événements déclencheurs</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>{WEBHOOK_EVENTS.filter(e => webhookEvents[e.id]).length}/{WEBHOOK_EVENTS.length} actifs{eventsOpen ? <ChevronDown className="ic14" /> : <ChevronRight className="ic14" />}</span>
            </button>
            {eventsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {WEBHOOK_EVENTS.map(ev => {
                  const on = webhookEvents[ev.id] ?? false
                  return (
                    <button key={ev.id} onClick={() => webhookEnabled && setWebhookEvents(prev => ({ ...prev, [ev.id]: !prev[ev.id] }))} disabled={!webhookEnabled} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, borderRadius: 8, padding: '10px 12px', textAlign: 'left', cursor: webhookEnabled ? 'pointer' : 'not-allowed', background: 'var(--bg-page)', border: '0.5px solid var(--border)', opacity: webhookEnabled ? 1 : 0.55 }}>
                      <span style={{ marginTop: 1, width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--accent)' : 'transparent', border: on ? 'none' : '1.5px solid var(--border)', color: on ? '#fff' : 'var(--text-tertiary)' }}>{on ? <Check className="ic12" /> : <X className="ic12" />}</span>
                      <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{ev.label}</span><span style={{ display: 'block', fontSize: 11, marginTop: 2, color: 'var(--text-secondary)' }}>{ev.description}</span></span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <SigningSecretSection />
          <div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <TestBtn state={testWebhook} disabled={!webhookUrl} onTest={() => runTest('webhook')} />
              <SaveBtn saving={savingWebhook} saved={savedWebhook} onSave={saveWebhook} />
            </div>
            {testWebhookMsg && <p style={{ fontSize: 12, textAlign: 'right', marginTop: 6, color: 'var(--danger)' }}>{testWebhookMsg}</p>}
          </div>
          <WebhookLogsSection enabled={webhookEnabled} />
        </div>
      </div>

      {/* Slack */}
      <div className="nx-card">
        <div className="nx-conn-head">
          <div className="nx-conn-logo" style={{ background: 'rgba(74,21,75,.08)', border: '0.5px solid rgba(74,21,75,.2)' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none"><rect width="24" height="24" rx="4" fill="#4A154B" /><circle cx="8.5" cy="8.5" r="1.8" fill="#E01E5A" /><circle cx="15.5" cy="8.5" r="1.8" fill="#36C5F0" /><circle cx="8.5" cy="15.5" r="1.8" fill="#2EB67D" /><circle cx="15.5" cy="15.5" r="1.8" fill="#ECB22E" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span className="nx-card-title">Slack</span>
              <Switch enabled={slackEnabled} onToggle={() => setSlackEnabled(v => !v)} />
            </div>
            <div className="nx-card-desc">Recevez les alertes RH directement dans un canal Slack.</div>
            <div style={{ marginTop: 9 }}><ConnDot active={slackEnabled && !!slackUrl} activeLabel="Actif" inactiveLabel={slackEnabled ? 'URL manquante' : 'Inactif'} /></div>
          </div>
        </div>
        <div className="nx-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderRadius: 12, padding: '12px 16px', background: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Comment obtenir l’URL</p>
            <ol style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 18, listStyle: 'decimal', lineHeight: 1.6 }}>
              <li>Dans Slack : <strong>Apps</strong> → chercher <strong>Incoming WebHooks</strong></li>
              <li>Choisir un canal → <strong>Add Incoming Webhooks integration</strong></li>
              <li>Copier l’URL <code className="nx-mono" style={{ fontSize: 11, padding: '1px 4px', borderRadius: 4, background: 'var(--border)' }}>https://hooks.slack.com/services/…</code></li>
            </ol>
          </div>
          <div>
            <label className="nx-label" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '.06em' }}>Incoming Webhook URL</label>
            <Input type="url" value={slackUrl} onChange={e => setSlackUrl(e.target.value)} placeholder="https://hooks.slack.com/services/T.../B.../…" disabled={!slackEnabled} className="nx-input" />
          </div>
          <div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <TestBtn state={testSlack} disabled={!slackUrl} onTest={() => runTest('slack')} />
              <SaveBtn saving={savingSlack} saved={savedSlack} onSave={saveSlack} />
            </div>
            {testSlackMsg && <p style={{ fontSize: 12, textAlign: 'right', marginTop: 6, color: 'var(--danger)' }}>{testSlackMsg}</p>}
          </div>
        </div>
      </div>

      {/* iCal */}
      <div className="nx-card">
        <div className="nx-conn-head">
          <div className="nx-conn-logo" style={{ background: 'var(--accent-light)' }}><CalendarClock className="ic20" style={{ color: 'var(--accent)' }} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><span className="nx-card-title">Abonnement Calendrier (iCal)</span><span className="nx-conn-dot on">Disponible</span></div>
            <div className="nx-card-desc">Permet à chaque employé de synchroniser ses shifts avec son calendrier.</div>
          </div>
        </div>
        <div className="nx-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ borderRadius: 12, padding: '14px 16px', background: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Comment ça marche</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)', listStyle: 'none', padding: 0 }}>
              <li style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--accent)' }}>→</span>Chaque employé dispose d’un lien iCal <strong>personnel</strong> sur sa page planning.</li>
              <li style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--accent)' }}>→</span>Il peut l’ajouter à <strong>Google Calendar, Outlook ou Apple Calendrier</strong> — aucune connexion requise.</li>
              <li style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--accent)' }}>→</span>Le calendrier se <strong>synchronise automatiquement</strong> à chaque mise à jour du planning.</li>
            </ul>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--accent-light)', border: '0.5px solid var(--accent)' }}>
            <Hash className="ic14" style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'var(--accent)' }}>Dirigez vos employés vers <strong>Mon espace → Planning</strong> pour trouver leur lien.</p>
          </div>
        </div>
      </div>

      {/* API tokens */}
      <ApiTokensCard />
    </div>
  )
}
