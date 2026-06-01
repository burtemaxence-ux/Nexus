'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { AlertTriangle, AlarmClock, FileText, Calendar, Loader2, RefreshCw, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'
import type { CddAlert, LatenessAlert, AbsenceAlert, ComplianceAlert } from '@/types'
import { checkCompliance, type ShiftRecord, type Violation, RULES } from '@/lib/compliance/rules'
import { ComplianceOptionsPanel } from '@/components/compliance/compliance-options-panel'

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysLeft(endDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(endDate + 'T00:00:00')
  return Math.round((end.getTime() - today.getTime()) / 86400000)
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  if (diffD >= 1) return `il y a ${diffD} jour${diffD > 1 ? 's' : ''}`
  if (diffH >= 1) return `il y a ${diffH}h`
  return 'à l\'instant'
}

// ── Conformité card styles ────────────────────────────────────────────────────

const LEVEL_STYLES: Record<string, { border: string; bg: string; badge: string; badgeText: string; label: string }> = {
  CRITICAL: {
    border: 'var(--color-critical-text)',
    bg: 'var(--color-critical-bg)',
    badge: 'var(--color-critical-bg)',
    badgeText: 'var(--color-critical-text)',
    label: 'CRITIQUE',
  },
  WARNING: {
    border: 'var(--color-warning-text)',
    bg: 'var(--color-warning-bg)',
    badge: 'var(--color-warning-bg)',
    badgeText: 'var(--color-warning-text)',
    label: 'AVERTISSEMENT',
  },
  INFO: {
    border: 'var(--color-info-text)',
    bg: 'var(--color-info-bg)',
    badge: 'var(--color-info-bg)',
    badgeText: 'var(--color-info-text)',
    label: 'INFO',
  },
}

// ── Swipeable wrapper (mobile ignore) ─────────────────────────────────────────

function SwipeToIgnore({ onIgnore, children }: { onIgnore: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    setSwiping(true)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!swiping) return
    const dx = e.touches[0].clientX - startX.current
    if (dx < 0) setOffset(Math.max(dx, -120))
  }

  function onTouchEnd() {
    setSwiping(false)
    if (offset <= -80) {
      onIgnore()
    }
    setOffset(0)
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Fond rouge visible lors du swipe */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 rounded-xl"
        style={{ backgroundColor: 'var(--color-critical-bg)', width: '120px' }}
      >
        <div className="flex flex-col items-center gap-1">
          <X className="h-4 w-4" style={{ color: 'var(--color-critical-text)' }} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-critical-text)' }}>Ignorer</span>
        </div>
      </div>
      <div
        ref={ref}
        style={{ transform: `translateX(${offset}px)`, transition: swiping ? 'none' : 'transform 0.25s ease' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

// ── Confirmation dialog ───────────────────────────────────────────────────────

function IgnoreConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] p-5 space-y-4">
        <p className="text-[14px] font-medium text-[var(--text-primary)]">
          Ignorer cette alerte pendant 7 jours ?
        </p>
        <p className="text-[13px] text-[var(--text-secondary)]">
          L&apos;alerte réapparaîtra automatiquement si la situation n&apos;est pas résolue.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[13px] text-[var(--text-secondary)]"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-xl text-[13px] font-medium text-white"
            style={{ backgroundColor: '#DC2626' }}
          >
            Ignorer 7 jours
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Compliance alert card ─────────────────────────────────────────────────────

type ComplianceAlertWithProfile = ComplianceAlert & {
  profiles?: { id: string; full_name: string | null; position: string | null } | null
}

function ComplianceCard({
  alert,
  onIgnore,
  onOptionsClick,
  isMobile,
}: {
  alert: ComplianceAlertWithProfile
  onIgnore: (id: string) => void
  onOptionsClick: (alert: ComplianceAlertWithProfile) => void
  isMobile: boolean
}) {
  const [confirmIgnore, setConfirmIgnore] = useState(false)
  const styles = LEVEL_STYLES[alert.level] ?? LEVEL_STYLES.INFO
  const employeeName = alert.profiles?.full_name ?? 'Employé'

  function handleIgnore() {
    if (isMobile) {
      setConfirmIgnore(true)
    } else {
      setConfirmIgnore(true)
    }
  }

  const card = (
    <div
      className="rounded-xl p-4 border-l-4 space-y-3"
      style={{ borderLeftColor: styles.border, backgroundColor: styles.bg, border: `1px solid ${styles.border}20`, borderLeft: `4px solid ${styles.border}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-md"
            style={{ backgroundColor: styles.badge, color: styles.badgeText }}
          >
            {styles.label}
          </span>
          <span className="text-[12px] text-[var(--text-tertiary)]">{timeAgo(alert.created_at)}</span>
        </div>
      </div>

      {/* Nom employé + titre */}
      <div>
        <p className="text-[14px] font-medium text-[var(--text-primary)]">{employeeName}</p>
        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 leading-snug">{alert.message}</p>
      </div>

      {/* Actions */}
      <div className={cn(
        'flex gap-2',
        isMobile ? 'flex-col' : 'flex-row items-center'
      )}>
        <button
          onClick={() => onOptionsClick(alert)}
          className={cn(
            'flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-medium transition-colors',
            isMobile ? 'w-full' : ''
          )}
          style={{ backgroundColor: styles.border, color: 'white' }}
        >
          Voir les options
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleIgnore}
          className={cn(
            'flex items-center justify-center h-9 px-4 rounded-xl text-[13px] border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-light)]',
            isMobile ? 'w-full' : ''
          )}
        >
          Ignorer 7 jours
        </button>
      </div>
    </div>
  )

  return (
    <>
      {isMobile ? (
        <SwipeToIgnore onIgnore={() => setConfirmIgnore(true)}>
          {card}
        </SwipeToIgnore>
      ) : card}
      {confirmIgnore && (
        <IgnoreConfirmDialog
          onConfirm={() => { setConfirmIgnore(false); onIgnore(alert.id) }}
          onCancel={() => setConfirmIgnore(false)}
        />
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AlertesPage() {
  const [cddRef] = useAutoAnimate()
  const [latenessRef] = useAutoAnimate()
  const [absenceRef] = useAutoAnimate()
  const [loading, setLoading] = useState(true)
  const [complianceLoading, setComplianceLoading] = useState(true)
  const [tab, setTab] = useState<'operationnel' | 'conformite'>('operationnel')
  const [isMobile, setIsMobile] = useState(false)

  const [cddAlerts, setCddAlerts] = useState<CddAlert[]>([])
  const [latenessAlerts, setLatenessAlerts] = useState<LatenessAlert[]>([])
  const [absenceAlerts, setAbsenceAlerts] = useState<AbsenceAlert[]>([])
  const [complianceViolations, setComplianceViolations] = useState<(Violation & { employeeName: string | null })[]>([])
  const [cddEnabled, setCddEnabled] = useState(true)
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlertWithProfile[]>([])
  const [selectedAlert, setSelectedAlert] = useState<ComplianceAlertWithProfile | null>(null)
  const [userRole, setUserRole] = useState<'manager' | 'supervisor'>('manager')

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const loadOperationnel = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10)
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    const ago7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    const [settingsRes, cddRes, latenessRes, shiftsRes, presencesRes, complianceShiftsRes] = await Promise.all([
      supabase.from('settings').select('key, value').in('key', ['automation_rules']),
      supabase.from('contracts').select('id, employee_id, type, end_date, profiles:employee_id(id, full_name, email)').not('end_date', 'is', null).gte('end_date', today).lte('end_date', in30).order('end_date'),
      supabase.from('lateness_records').select('id, employee_id, date, late_minutes, profiles:employee_id(full_name, email)').eq('justified', false).gte('date', ago7).order('date', { ascending: false }),
      supabase.from('shifts').select('id, employee_id, date, start_time, end_time, profiles:employee_id(full_name, email)').gte('date', ago7).lt('date', today),
      supabase.from('presences').select('employee_id, date, clock_in').gte('date', ago7).lt('date', today).not('clock_in', 'is', null),
      supabase.from('shifts').select('id, employee_id, date, start_time, end_time, break_minutes, profiles:employee_id(full_name)').gte('date', ago7).lte('date', today),
    ])

    if (settingsRes.data) {
      const row = settingsRes.data.find(r => r.key === 'automation_rules')
      if (row?.value) { try { const rules = JSON.parse(row.value); setCddEnabled(rules.alert_cdd_expiry !== false) } catch { /* keep */ } }
    }

    const cdds: CddAlert[] = ((cddRes.data ?? []) as unknown as { id: string; employee_id: string; type: string; end_date: string; profiles: { full_name: string | null; email: string | null } | null }[]).map(c => ({
      contractId: c.id, employeeId: c.employee_id, employeeName: c.profiles?.full_name ?? null,
      employeeEmail: c.profiles?.email ?? null, contractType: c.type, endDate: c.end_date, daysLeft: daysLeft(c.end_date),
    }))
    setCddAlerts(cdds)

    const lateness: LatenessAlert[] = ((latenessRes.data ?? []) as unknown as { id: string; employee_id: string; date: string; late_minutes: number; profiles: { full_name: string | null; email: string | null } | null }[]).map(r => ({
      id: r.id, employeeId: r.employee_id, employeeName: r.profiles?.full_name ?? null, date: r.date, lateMinutes: r.late_minutes,
    }))
    setLatenessAlerts(lateness)

    const presenceSet = new Set(((presencesRes.data ?? []) as { employee_id: string; date: string }[]).map(p => `${p.employee_id}__${p.date}`))
    const absences: AbsenceAlert[] = ((shiftsRes.data ?? []) as unknown as { id: string; employee_id: string; date: string; start_time: string; end_time: string; profiles: { full_name: string | null; email: string | null } | null }[])
      .filter(s => !presenceSet.has(`${s.employee_id}__${s.date}`) && s.date === yesterday)
      .map(s => ({ shiftId: s.id, employeeId: s.employee_id, employeeName: s.profiles?.full_name ?? null, date: s.date, startTime: s.start_time.slice(0, 5), endTime: s.end_time.slice(0, 5) }))
    setAbsenceAlerts(absences)

    if (complianceShiftsRes.data) {
      const empNames = new Map<string, string | null>()
      const records: ShiftRecord[] = (complianceShiftsRes.data as unknown as { id: string; employee_id: string; date: string; start_time: string; end_time: string; break_minutes: number; profiles: { full_name: string | null } | null }[]).map(s => {
        if (!empNames.has(s.employee_id)) empNames.set(s.employee_id, s.profiles?.full_name ?? null)
        return { id: s.id, employeeId: s.employee_id, date: s.date, startTime: s.start_time.slice(0, 5), endTime: s.end_time.slice(0, 5), breakMinutes: s.break_minutes }
      })
      const violations = checkCompliance(records)
      setComplianceViolations(violations.map(v => ({ ...v, employeeName: empNames.get(v.employeeId) ?? null })))
    }

    setLoading(false)
  }, [])

  const loadConformite = useCallback(async () => {
    setComplianceLoading(true)
    try {
      const res = await fetch('/api/compliance/alerts')
      if (res.ok) {
        const { alerts } = await res.json()
        setComplianceAlerts(alerts ?? [])
      }
    } finally {
      setComplianceLoading(false)
    }
  }, [])

  useEffect(() => { loadOperationnel() }, [loadOperationnel])
  useEffect(() => { loadConformite() }, [loadConformite])

  // Fetch user role for panel permissions
  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('role').single().then(({ data }) => {
      if (data?.role === 'supervisor') setUserRole('supervisor')
    })
  }, [])

  async function handleIgnore(id: string) {
    await fetch('/api/compliance/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'ignore' }),
    })
    setComplianceAlerts(prev => prev.filter(a => a.id !== id))
  }

  function handleOptionsClick(alert: ComplianceAlertWithProfile) {
    setSelectedAlert(alert)
  }

  function handleAlertUpdated(id: string) {
    setComplianceAlerts(prev => prev.filter(a => a.id !== id))
  }

  const criticalCompliance = complianceViolations.filter(v => RULES[v.ruleId].severity === 'critical')
  const totalOperationnel = (cddEnabled ? cddAlerts.length : 0) + latenessAlerts.length + absenceAlerts.length + criticalCompliance.length
  const totalConformite = complianceAlerts.length

  return (
    <div className="min-h-full">
      {/* Header + onglets */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-card)] sticky top-14 md:top-11 z-10">
        <div className="px-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 h-14">
            <h1 className="text-[20px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">Alertes</h1>
            <button
              onClick={() => { loadOperationnel(); loadConformite() }}
              className="ml-auto p-1.5 rounded-md hover:bg-[var(--accent-light)] transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className={cn('h-4 w-4 text-[var(--text-tertiary)]', (loading || complianceLoading) && 'animate-spin')} />
            </button>
          </div>

          {/* Onglets */}
          <div className="flex gap-0 -mb-px">
            <button
              onClick={() => setTab('operationnel')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-[13px] border-b-2 transition-colors',
                tab === 'operationnel'
                  ? 'border-[var(--accent)] text-[var(--text-primary)] font-medium'
                  : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              )}
            >
              Opérationnel
              {totalOperationnel > 0 && (
                <span className="h-5 min-w-[20px] px-1.5 rounded-full text-[11px] font-medium flex items-center justify-center" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' }}>
                  {totalOperationnel}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('conformite')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-[13px] border-b-2 transition-colors',
                tab === 'conformite'
                  ? 'border-[var(--accent)] text-[var(--text-primary)] font-medium'
                  : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              )}
            >
              Conformité
              {totalConformite > 0 && (
                <span className="h-5 min-w-[20px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center" style={{ backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical-text)' }}>
                  {totalConformite}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 md:px-6 md:py-6 max-w-5xl mx-auto">

        {/* ── Onglet Opérationnel ─────────────────────────────────────────── */}
        {tab === 'operationnel' && (
          loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
            </div>
          ) : totalOperationnel === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-card)]">
              <div className="h-12 w-12 rounded-full flex items-center justify-center mb-4 bg-[var(--accent-light)]">
                <AlertTriangle className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Aucune alerte opérationnelle</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Tout est en ordre pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {complianceViolations.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                      Violations Code du travail (7 derniers jours)
                      <span className="ml-2 text-xs font-normal text-[var(--text-tertiary)]">({complianceViolations.length})</span>
                    </h2>
                  </div>
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[500px]">
                        <thead>
                          <tr className="bg-[var(--accent-light)] border-b border-[var(--border)]">
                            {['Employé', 'Date', 'Règle légale', 'Sévérité'].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {complianceViolations.map((v, i) => {
                            const rule = RULES[v.ruleId]
                            const isCritical = rule.severity === 'critical'
                            return (
                              <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--accent-light)] transition-colors">
                                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{v.employeeName ?? '—'}</td>
                                <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(v.date)}</td>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-[var(--text-primary)]">{rule.name}</p>
                                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{v.description}</p>
                                  <p className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5">{rule.legalRef}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={isCritical
                                      ? { backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical-text)' }
                                      : { backgroundColor: 'var(--color-warning-bg)',  color: 'var(--color-warning-text)' }}>
                                    {isCritical ? 'Critique' : 'Avertissement'}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {cddEnabled && cddAlerts.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-500" />
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                      CDD expirant dans les 30 jours <span className="ml-1 text-xs font-normal text-[var(--text-tertiary)]">({cddAlerts.length})</span>
                    </h2>
                  </div>
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[400px]">
                        <thead>
                          <tr className="bg-[var(--accent-light)] border-b border-[var(--border)]">
                            {['Employé', 'Type contrat', 'Fin le', 'Délai'].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody ref={cddRef}>
                          {cddAlerts.map((a) => (
                            <tr key={a.contractId} className="border-b border-[var(--border)] hover:bg-[var(--accent-light)] transition-colors">
                              <td className="px-4 py-3">
                                <Link href={`/manager/employees/${a.employeeId}`} className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
                                  {a.employeeName ?? a.employeeEmail ?? '—'}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-[var(--text-secondary)]">{a.contractType}</td>
                              <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(a.endDate)}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={a.daysLeft <= 7
                                    ? { backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical-text)' }
                                    : a.daysLeft <= 15
                                      ? { backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' }
                                      : { backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' }}>
                                  {a.daysLeft === 0 ? 'Aujourd\'hui' : `J-${a.daysLeft}`}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {latenessAlerts.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlarmClock className="h-4 w-4 text-orange-500" />
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                      Retards non justifiés (7 derniers jours) <span className="ml-1 text-xs font-normal text-[var(--text-tertiary)]">({latenessAlerts.length})</span>
                    </h2>
                  </div>
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[360px]">
                        <thead>
                          <tr className="bg-[var(--accent-light)] border-b border-[var(--border)]">
                            {['Employé', 'Date', 'Retard'].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody ref={latenessRef}>
                          {latenessAlerts.map((a) => (
                            <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--accent-light)] transition-colors">
                              <td className="px-4 py-3">
                                <Link href={`/manager/employees/${a.employeeId}`} className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
                                  {a.employeeName ?? '—'}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-[var(--text-secondary)] capitalize">
                                {new Date(a.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' }}>
                                  +{a.lateMinutes} min
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {absenceAlerts.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-red-500" />
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                      Absences non pointées (hier) <span className="ml-1 text-xs font-normal text-[var(--text-tertiary)]">({absenceAlerts.length})</span>
                    </h2>
                  </div>
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[320px]">
                        <thead>
                          <tr className="bg-[var(--accent-light)] border-b border-[var(--border)]">
                            {['Employé', 'Shift prévu'].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody ref={absenceRef}>
                          {absenceAlerts.map((a) => (
                            <tr key={a.shiftId} className="border-b border-[var(--border)] hover:bg-[var(--accent-light)] transition-colors">
                              <td className="px-4 py-3">
                                <Link href={`/manager/employees/${a.employeeId}`} className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
                                  {a.employeeName ?? '—'}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-[var(--text-secondary)]">{a.startTime} → {a.endTime}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              <p className="text-xs text-[var(--text-tertiary)] text-center pt-2">
                Configurer les alertes dans{' '}
                <Link href="/manager/settings/alertes" className="underline hover:text-[var(--text-primary)]">
                  Paramètres → Notifications
                </Link>
              </p>
            </div>
          )
        )}

        {/* ── Onglet Conformité ───────────────────────────────────────────── */}
        {tab === 'conformite' && (
          complianceLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
            </div>
          ) : complianceAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-card)]">
              <div className="h-12 w-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--color-success-bg)' }}>
                <AlertTriangle className="h-6 w-6" style={{ color: 'var(--color-success-text)' }} />
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Aucune alerte contractuelle active</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Le moteur d&apos;analyse tourne chaque dimanche à 22h.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Compteur par niveau */}
              <div className="flex gap-2 flex-wrap">
                {(['CRITICAL', 'WARNING', 'INFO'] as const).map(level => {
                  const count = complianceAlerts.filter(a => a.level === level).length
                  if (!count) return null
                  const s = LEVEL_STYLES[level]
                  return (
                    <span key={level} className="text-[12px] font-medium px-3 py-1 rounded-full" style={{ backgroundColor: s.badge, color: s.badgeText }}>
                      {s.label} · {count}
                    </span>
                  )
                })}
              </div>

              {/* Cards */}
              {complianceAlerts.map(alert => (
                <ComplianceCard
                  key={alert.id}
                  alert={alert}
                  onIgnore={handleIgnore}
                  onOptionsClick={handleOptionsClick}
                  isMobile={isMobile}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Panel options conformité */}
      {selectedAlert && (
        <ComplianceOptionsPanel
          alert={selectedAlert}
          role={userRole}
          onClose={() => setSelectedAlert(null)}
          onAlertUpdated={(id) => { handleAlertUpdated(id); setSelectedAlert(null) }}
        />
      )}
    </div>
  )
}
