import { supabaseAdmin } from '@/lib/supabase/admin'
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
    db,
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
    } as Record<string, boolean>,
  }
}

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Essai',
  active: 'Actif',
  past_due: 'Paiement en retard',
  canceled: 'Annulé',
  incomplete: 'Incomplet',
  free: 'Gratuit',
}

export default async function AdminPage() {
  const health = await getHealth()

  const [{ data: establishments }, { data: subs }, { data: reports }] = await Promise.all([
    supabaseAdmin.from('establishments').select('id, name, created_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('subscriptions').select('establishment_id, status, plan, trial_end'),
    supabaseAdmin.from('support_reports').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  const subByEst = new Map((subs ?? []).map(s => [s.establishment_id as string, s]))
  const clients = (establishments ?? []).map(e => {
    const sub = subByEst.get(e.id as string)
    return {
      id: e.id as string,
      name: (e.name as string) ?? '—',
      createdAt: e.created_at as string,
      status: (sub?.status as string) ?? 'trialing',
      plan: (sub?.plan as string) ?? 'free',
    }
  })

  const openReports = (reports ?? []).filter(r => r.status === 'new').length

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Back-office opérateur</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Vue d’ensemble Quartzbase — santé, clients, signalements.
          </p>
        </div>
        <TestAlertButton />
      </header>

      {/* ── Santé des services ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          Santé des services
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(health.services).map(([name, ok]) => (
            <div key={name} className="rounded-xl border p-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: ok ? 'var(--success)' : 'var(--danger)' }}
                />
                <span className="text-xs font-medium" style={{ color: ok ? 'var(--success)' : 'var(--danger)' }}>
                  {ok ? 'OK' : 'À vérifier'}
                </span>
              </div>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>{name}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Base de données : {health.latency} ms · « À vérifier » = variable d’environnement absente (voir docs/COMMAND_CENTER.md).
        </p>
      </section>

      {/* ── Clients ────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          Clients ({clients.length})
        </h2>
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                <th className="px-4 py-2 text-left font-medium">Établissement</th>
                <th className="px-4 py-2 text-left font-medium">Plan</th>
                <th className="px-4 py-2 text-left font-medium">Statut</th>
                <th className="px-4 py-2 text-left font-medium">Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center" style={{ color: 'var(--text-tertiary)' }}>Aucun client pour le moment.</td></tr>
              )}
              {clients.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-2" style={{ color: 'var(--text-primary)' }}>{c.name}</td>
                  <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{c.plan}</td>
                  <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{STATUS_LABELS[c.status] ?? c.status}</td>
                  <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Signalements ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          Signalements — {openReports} à traiter
        </h2>
        <ReportsList initialReports={(reports ?? []) as Report[]} />
      </section>
    </div>
  )
}
