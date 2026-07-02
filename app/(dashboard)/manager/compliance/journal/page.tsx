import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'

export const metadata = { title: 'Journal de conformité — Quartzbase' }

type Options = {
  week_monday?: string
  rule_id?: string
  date?: string
  legal_ref?: string
  suggested_fix?: string | null
}

type Row = {
  id: string
  level: 'CRITICAL' | 'WARNING' | 'INFO'
  title: string
  message: string
  options: Options | null
  created_at: string
  employee_id: string
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
}

const LEVEL_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: 'Critique', color: '#B91C1C', bg: '#FEE2E2' },
  WARNING:  { label: 'Avertissement', color: '#B45309', bg: '#FEF3C7' },
  INFO:     { label: 'À vérifier', color: '#1D4ED8', bg: '#DBEAFE' },
}

function empName(p: Row['profiles']): string {
  const row = Array.isArray(p) ? p[0] : p
  return row?.full_name ?? 'Employé'
}

function fmtWeek(monday: string | undefined): string {
  if (!monday) return 'Semaine inconnue'
  const start = new Date(monday + 'T00:00:00')
  const end = new Date(start.getTime() + 6 * 86400000)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `Semaine du ${start.toLocaleDateString('fr-FR', opts)} au ${end.toLocaleDateString('fr-FR', { ...opts, year: 'numeric' })}`
}

export default async function ComplianceJournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, establishment_id, active_establishment_id')
    .eq('id', user.id)
    .single()

  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) {
    redirect('/employee/planning')
  }

  const estId = profile?.active_establishment_id ?? profile?.establishment_id ?? null

  const { data } = estId
    ? await supabase
        .from('compliance_alerts')
        .select('id, level, title, message, options, created_at, employee_id, profiles:employee_id ( full_name )')
        .eq('establishment_id', estId)
        .eq('type', 'planning_conformity')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(500)
    : { data: [] as Row[] }

  const rows = (data ?? []) as unknown as Row[]

  // Regroupe par semaine (week_monday), semaine la plus récente d'abord.
  const byWeek = new Map<string, Row[]>()
  for (const r of rows) {
    const key = r.options?.week_monday ?? 'unknown'
    if (!byWeek.has(key)) byWeek.set(key, [])
    byWeek.get(key)!.push(r)
  }
  const weeks = Array.from(byWeek.entries()).sort((a, b) => b[0].localeCompare(a[0]))

  const totalCritical = rows.filter(r => r.level === 'CRITICAL').length

  return (
    <div className="px-4 md:px-6 py-5">
      <PageHeader
        title="Journal de conformité"
        subtitle="Trace horodatée des anomalies détectées sur vos plannings — preuve de diligence en cas de contrôle."
      />

      <div className="mb-4">
        <Link href="/manager/compliance" className="text-[13px] font-semibold text-[var(--accent)] hover:underline">
          ← Retour à la conformité
        </Link>
      </div>

      {rows.length > 0 && (
        <p className="text-[13px] text-[var(--text-secondary)] mb-4">
          {rows.length} anomalie(s) enregistrée(s){totalCritical > 0 ? ` — dont ${totalCritical} critique(s)` : ''}.
        </p>
      )}

      {weeks.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 text-center">
          <p className="text-[14px] font-semibold text-[var(--text-primary)]">Aucune anomalie enregistrée</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Le journal se remplit automatiquement au fil de vos modifications de planning.
            Chaque anomalie au Code du travail y est datée et conservée.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {weeks.map(([week, items]) => (
            <div key={week} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-page)] flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">{fmtWeek(week)}</span>
                <span className="text-[11px] text-[var(--text-tertiary)]">{items.length} anomalie(s)</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {items.map(r => {
                  const sev = LEVEL_STYLE[r.level] ?? LEVEL_STYLE.INFO
                  return (
                    <div key={r.id} className="px-5 py-3 flex items-start gap-3">
                      <span
                        className="mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                        style={{ color: sev.color, background: sev.bg }}
                      >
                        {sev.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                          {empName(r.profiles)} — {r.title}
                        </p>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{r.message}</p>
                        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 font-mono">
                          {r.options?.legal_ref ?? ''}{r.options?.date ? ` · ${r.options.date}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
