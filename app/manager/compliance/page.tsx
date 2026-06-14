'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, AlertTriangle, Info, XCircle, ChevronDown, ChevronUp, User, Calendar, BookOpen, Wrench, Scale } from 'lucide-react'
import alertsData from '@/data/alerts.json'
import stats from '@/data/stats.json'

function demoAction() {
  toast.info('🎭 Mode démo — cette action n\'est pas disponible')
}

const SEV = {
  critical: { icon: XCircle,       color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Critique' },
  warning:  { icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Avertissement' },
  info:     { icon: Info,          color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Information' },
} as const

type Severity = keyof typeof SEV

function ViolationCard({ alert }: { alert: typeof alertsData[0] }) {
  const [open, setOpen] = useState(false)
  const sev = SEV[alert.severity as Severity]
  const SevIcon = sev.icon

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor: sev.border }}>
      <div className="flex items-start gap-3 px-4 py-3" style={{ background: sev.bg }}>
        <SevIcon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: sev.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold" style={{ color: sev.color }}>{alert.ruleName}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: sev.color, background: `${sev.color}20` }}>
              {sev.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-[12px] text-[var(--text-secondary)]">
              <User className="h-3 w-3" />{alert.employeeName}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-[var(--text-secondary)]">
              <Calendar className="h-3 w-3" />{fmtDate(alert.date)}
            </span>
          </div>
          <p className="text-[12px] text-[var(--text-primary)] mt-1.5">{alert.description}</p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors"
          style={{ color: sev.color }}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <div className="px-4 py-3 bg-[var(--bg-card)] space-y-2.5">
          <div className="flex items-start gap-2">
            <BookOpen className="h-3.5 w-3.5 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em]">Référence légale</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{alert.legalRef}</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{alert.ruleDescription}</p>
            </div>
          </div>
          {alert.suggestedFix && (
            <div className="flex items-start gap-2">
              <Wrench className="h-3.5 w-3.5 text-[var(--accent)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-[0.05em]">Correction suggérée</p>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{alert.suggestedFix}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={demoAction} title="Fonctionnalité démo" className="btn-secondary text-[12px] cursor-not-allowed opacity-60">
              Générer document
            </button>
            <button onClick={demoAction} title="Fonctionnalité démo" className="btn-secondary text-[12px] cursor-not-allowed opacity-60">
              Envoyer email
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CompliancePage() {
  const score = stats.complianceScore

  const scoreColor = score >= 90 ? '#16A34A' : score >= 70 ? '#D97706' : '#DC2626'
  const ScoreIcon = score >= 90 ? ShieldCheck : AlertTriangle

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 space-y-5">

      <div className="dashboard-s0">
        <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
          Conformité
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Analyse automatique du planning · Cette semaine
        </p>
      </div>

      {/* Score + Severity */}
      <div className="flex gap-4 items-stretch flex-wrap dashboard-s1">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 flex flex-col items-center justify-center gap-2 min-w-[160px]">
          <ScoreIcon className="h-8 w-8" style={{ color: scoreColor }} />
          <div className="text-center">
            <p className="text-[42px] font-bold leading-none tracking-[-0.03em]" style={{ color: scoreColor, fontFamily: 'var(--font-syne)' }}>
              {score}
            </p>
            <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em] mt-0.5">
              Score conformité
            </p>
          </div>
          <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden mt-1">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: scoreColor }} />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] text-center">Conforme</p>
        </div>

        <div className="flex gap-3 flex-1 flex-wrap">
          {([['warning', 1], ['info', 1], ['critical', 0]] as [Severity, number][]).map(([sev, count]) => {
            const s = SEV[sev]
            const Icon = s.icon
            return (
              <div key={sev} className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: s.color, minWidth: '100px' }}>
                <Icon className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="text-[22px] font-bold leading-none">{count}</p>
                  <p className="text-[11px] font-medium opacity-80 mt-0.5">{s.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-4 px-5 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-secondary)] flex-wrap dashboard-s2">
        <span>2 anomalies détectées</span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span>2 employés concernés</span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span>Score 94/100</span>
      </div>

      {/* Violations */}
      <div className="space-y-3 dashboard-s2">
        <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.08em]">Anomalies</p>
        {alertsData.map(alert => (
          <ViolationCard key={alert.id} alert={alert} />
        ))}
      </div>

      {/* Legal reference */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden dashboard-s3">
        <div className="px-5 py-3.5 flex items-center gap-2 border-b border-[var(--border)]">
          <Scale className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">Règles vérifiées — Code du travail</span>
        </div>
        <div className="px-5 py-4 space-y-2">
          {[
            { rule: 'Repos quotidien (11h min)', ref: 'L3131-1', ok: true },
            { rule: 'Durée max quotidienne (10h)', ref: 'L3121-18', ok: true },
            { rule: 'Durée max hebdomadaire (48h)', ref: 'L3121-20', ok: true },
            { rule: 'Pause obligatoire (20 min / 6h)', ref: 'L3121-16', ok: false },
            { rule: 'Repos hebdomadaire (35h)', ref: 'L3132-1', ok: true },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-3 text-[12px]">
              <span style={{ color: r.ok ? 'var(--success)' : 'var(--warning)', width: '12px' }}>{r.ok ? '✓' : '!'}</span>
              <span style={{ color: 'var(--text-primary)' }}>{r.rule}</span>
              <span style={{ color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>Art. {r.ref} CT</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
