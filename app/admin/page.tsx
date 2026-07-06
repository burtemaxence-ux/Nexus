import Link from 'next/link'
import { AlertTriangle, Clock } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getAdminOverview } from '@/lib/admin/overview'
import { ClientsTable } from './clients-table'
import { TestAlertButton } from './test-alert-button'
import { ReportsList, type Report } from './reports-list'

export const dynamic = 'force-dynamic'

// ── Health : ping DB + présence des services (même logique que /api/health) ──
async function getHealth() {
  let db: 'ok' | 'error' = 'ok'
  let latency = 0
  try {
    const t = Date.now()
    const { error } = await supabaseAdmin.from('profiles').select('id').limit(1)
    latency = Date.now() - t
    if (error) db = 'error'
  } catch {
    db = 'error'
  }
  return {
    latency,
    services: {
      'Base de données': db === 'ok',
      Emails: !!process.env.RESEND_API_KEY,
      IA: !!process.env.ANTHROPIC_API_KEY,
      'Push notifications': !!process.env.VAPID_PRIVATE_KEY,
      Paiements: !!process.env.STRIPE_SECRET_KEY,
      'Crons (tâches auto)': !!process.env.CRON_SECRET,
      'Monitoring (Sentry)': !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      'Alertes (Slack/email)': !!(process.env.SLACK_WEBHOOK_URL || process.env.OPS_RESEND_API_KEY || process.env.RESEND_API_KEY),
      'SMS (Twilio)': !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
    } as Record<string, boolean>,
  }
}

function StatTile({ label, value, hint, danger }: { label: string; value: string; hint?: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: danger ? 'var(--danger)' : 'var(--text-primary)' }}>{value}</p>
      {hint && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>}
    </div>
  )
}

export default async function AdminPage() {
  const [health, overview, { data: reports }] = await Promise.all([
    getHealth(),
    getAdminOverview(),
    supabaseAdmin.from('support_reports').select('*').order('created_at', { ascending: false }).limit(50),
  ])
  const { kpis, clients, followUp } = overview
  const openReports = (reports ?? []).filter(r => r.status === 'new').length
  const hasFollowUp = followUp.notActivated.length > 0 || followUp.trialEndingSoon.length > 0

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Back-office opérateur</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Vue d’ensemble Quartzbase — activité, clients, signalements.</p>
        </div>
        <TestAlertButton />
      </header>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Clients" value={String(kpis.totalClients)} hint={`${kpis.newThisWeek} nouveau(x) cette semaine`} />
        <StatTile label="Clients payants" value={String(kpis.active)} hint={`≈ ${kpis.estimatedMrr} €/mois`} />
        <StatTile label="En essai" value={String(kpis.trialing)} />
        <StatTile label="Non activés" value={String(kpis.notActivated)} danger={kpis.notActivated > 0} hint="aucun planning créé" />
        <StatTile label="Employés gérés" value={String(kpis.totalEmployees)} />
        <StatTile label="MRR estimé" value={`${kpis.estimatedMrr} €`} hint="revenu mensuel récurrent" />
        <StatTile label="Signalements ouverts" value={String(openReports)} danger={openReports > 0} />
      </section>

      {/* ── À relancer ──────────────────────────────────────────────────────── */}
      {hasFollowUp && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>À relancer</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {followUp.notActivated.length > 0 && (
              <FollowUpCard
                icon={AlertTriangle}
                title={`Pas encore activés (${followUp.notActivated.length})`}
                subtitle="Inscrits mais aucun planning créé"
                items={followUp.notActivated.map(c => ({ id: c.id, main: c.name, sub: c.ownerEmail ?? '—' }))}
              />
            )}
            {followUp.trialEndingSoon.length > 0 && (
              <FollowUpCard
                icon={Clock}
                title={`Essais bientôt terminés (${followUp.trialEndingSoon.length})`}
                subtitle="Fin d’essai dans 7 jours ou moins"
                items={followUp.trialEndingSoon.map(c => ({ id: c.id, main: c.name, sub: `${c.trialDaysLeft} j restants` }))}
              />
            )}
          </div>
        </section>
      )}

      {/* ── Santé des services ──────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Santé des services</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(health.services).map(([name, ok]) => (
            <div key={name} className="rounded-xl border p-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ok ? 'var(--success)' : 'var(--danger)' }} />
                <span className="text-xs font-medium" style={{ color: ok ? 'var(--success)' : 'var(--danger)' }}>{ok ? 'OK' : 'À vérifier'}</span>
              </div>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>{name}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Base de données : {health.latency} ms · « À vérifier » = variable d’environnement absente (voir docs/COMMAND_CENTER.md).
        </p>
      </section>

      {/* ── Clients ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Clients ({clients.length})</h2>
        <ClientsTable clients={clients} />
      </section>

      {/* ── Signalements ────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Signalements — {openReports} à traiter</h2>
        <ReportsList initialReports={(reports ?? []) as Report[]} />
      </section>
    </div>
  )
}

function FollowUpCard({
  icon: Icon, title, subtitle, items,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  items: { id: string; main: string; sub: string }[]
}) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: 'var(--warning)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <p className="mb-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>
      <ul className="space-y-1">
        {items.slice(0, 6).map(it => (
          <li key={it.id}>
            <Link href={`/admin/clients/${it.id}`} className="flex items-center justify-between gap-3 rounded-md px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/5">
              <span className="truncate" style={{ color: 'var(--text-primary)' }}>{it.main}</span>
              <span className="shrink-0 text-xs" style={{ color: 'var(--text-tertiary)' }}>{it.sub}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
