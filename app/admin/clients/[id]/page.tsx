import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Mail, Users, CalendarDays, Activity } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { TRIAL_DAYS } from '@/lib/subscription'
import { statusColor, statusLabel, planLabel } from '@/lib/admin/labels'

export const dynamic = 'force-dynamic'

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: est } = await supabaseAdmin
    .from('establishments')
    .select('id, name, created_at, owner_id, is_active')
    .eq('id', id)
    .maybeSingle()

  if (!est) notFound()

  const [
    { data: owner },
    { data: sub },
    { data: team },
    { count: shiftCount },
    { data: lastShiftRow },
    { count: reportsCount },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('email, full_name').eq('id', est.owner_id).maybeSingle(),
    supabaseAdmin.from('subscriptions').select('status, plan, trial_end, current_period_end, cancel_at_period_end').eq('establishment_id', id).maybeSingle(),
    supabaseAdmin.from('profiles').select('full_name, email, role, position, is_active').eq('establishment_id', id).eq('archived', false).order('role'),
    supabaseAdmin.from('shifts').select('id', { count: 'exact', head: true }).eq('establishment_id', id).is('deleted_at', null),
    supabaseAdmin.from('shifts').select('created_at').eq('establishment_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from('support_reports').select('id', { count: 'exact', head: true }).eq('establishment_id', id),
  ])

  const now = Date.now()
  const trialEnd = sub?.trial_end
    ? new Date(sub.trial_end)
    : new Date(new Date(est.created_at).getTime() + TRIAL_DAYS * 86_400_000)
  const status = sub?.status ? sub.status : (now < trialEnd.getTime() ? 'trialing' : 'expired')
  const trialDaysLeft = status === 'trialing' ? Math.max(0, Math.ceil((trialEnd.getTime() - now) / 86_400_000)) : 0

  const employees = (team ?? []).filter(m => m.role === 'employee')
  const managers = (team ?? []).filter(m => m.role === 'manager' || m.role === 'supervisor')

  const Stat = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
    <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft className="h-4 w-4" /> Retour au back-office
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{est.name}</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(status) }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              {statusLabel(status)}{status === 'trialing' && trialDaysLeft > 0 && ` · ${trialDaysLeft} j restants`}
            </span>
          </span>
        </div>
        <p className="mt-1 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Mail className="h-4 w-4" />
          {owner?.email
            ? <a href={`mailto:${owner.email}`} className="underline underline-offset-2">{owner.email}</a>
            : '—'}
          {owner?.full_name && <span style={{ color: 'var(--text-tertiary)' }}>· {owner.full_name}</span>}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Users} label="Employés" value={String(employees.length)} />
        <Stat icon={CalendarDays} label="Plannings créés" value={String(shiftCount ?? 0)} />
        <Stat icon={Activity} label="Dernière activité" value={lastShiftRow?.created_at ? fmtDate(lastShiftRow.created_at) : 'jamais'} />
        <Stat icon={Mail} label="Signalements" value={String(reportsCount ?? 0)} />
      </div>

      {/* Abonnement */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Abonnement</h2>
        <div className="grid gap-2 rounded-xl border p-4 text-sm sm:grid-cols-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <Line label="Statut" value={statusLabel(status)} />
          <Line label="Plan" value={planLabel(sub?.plan)} />
          <Line label="Fin d'essai" value={fmtDate(sub?.trial_end ?? trialEnd.toISOString())} />
          <Line label="Prochaine échéance" value={fmtDate(sub?.current_period_end ?? null)} />
          <Line label="Inscrit le" value={fmtDate(est.created_at)} />
          <Line label="Résiliation prévue" value={sub?.cancel_at_period_end ? 'Oui' : 'Non'} />
        </div>
      </section>

      {/* Équipe */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          Équipe ({(team ?? []).length})
        </h2>
        {(team ?? []).length === 0 ? (
          <p className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
            Aucun membre — ce client n&apos;a pas encore configuré son équipe.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                  <th className="px-4 py-2 text-left font-medium">Nom</th>
                  <th className="px-4 py-2 text-left font-medium">Rôle</th>
                  <th className="px-4 py-2 text-left font-medium">Poste</th>
                </tr>
              </thead>
              <tbody>
                {[...managers, ...employees].map((m, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-2" style={{ color: 'var(--text-primary)' }}>{m.full_name || m.email || '—'}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {m.role === 'employee' ? 'Employé' : m.role === 'supervisor' ? 'Superviseur' : 'Manager'}
                    </td>
                    <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{m.position ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className="text-right" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}
