'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'

// Violation counts keyed by the compliance engine's RuleId (see lib/compliance/rules).
type ByRule = Partial<Record<string, number>>

// The four Code-du-Travail controls shown on the home, each backed by the real
// RuleId(s) emitted by checkCompliance() / GET /api/compliance.
const CONTROLS: { label: string; ok: string; rules: string[] }[] = [
  { label: 'Repos quotidien de 11 h',      ok: 'Respecté',   rules: ['rest_daily', 'weekly_rest_missing'] },
  { label: 'Durée hebdomadaire sous 48 h', ok: 'Respecté',   rules: ['hours_weekly_max'] },
  { label: 'Pauses légales planifiées',    ok: 'Respectées', rules: ['break_missing'] },
  { label: 'Amplitude et coupures',        ok: 'Conformes',  rules: ['amplitude_max', 'hours_daily_max', 'days_consecutive', 'sunday_work', 'night_work'] },
]

const RING_CIRCUMFERENCE = 113 // 2π·18, matches the SVG radius below.

function weekRange(): { from: string; to: string } {
  const now = new Date()
  const dow = now.getDay() || 7
  const monday = new Date(now); monday.setDate(now.getDate() - dow + 1)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const iso = (d: Date) => d.toISOString().split('T')[0]
  return { from: iso(monday), to: iso(sunday) }
}

/**
 * Conformité — score ring + per-control checklist for the current week, using
 * the real compliance analysis (GET /api/compliance: complianceScore + byRule).
 * Hidden if the user has no compliance access.
 */
export function ComplianceRing() {
  const [data, setData] = useState<{ score: number; byRule: ByRule; total: number } | null>(null)
  const [hidden, setHidden] = useState(false)
  const [offset, setOffset] = useState(RING_CIRCUMFERENCE) // start empty, animate to target

  useEffect(() => {
    let active = true
    const { from, to } = weekRange()
    fetch(`/api/compliance?from=${from}&to=${to}`)
      .then(r => { if (!r.ok) { if (active) setHidden(true); return null } return r.json() })
      .then(d => {
        if (!active || !d) return
        const byRule = (d.byRule ?? {}) as ByRule
        setData({ score: d.complianceScore ?? 100, byRule, total: (d.violations ?? []).length })
      })
      .catch(() => { if (active) setHidden(true) })
    return () => { active = false }
  }, [])

  const ready = data !== null
  const score = data?.score ?? 0
  const hasCritical = score < 70
  const ringColor = score >= 90 ? 'var(--success)' : score >= 70 ? 'var(--warning)' : 'var(--danger)'

  // Draw the arc to its target once we have a score (respects reduced motion).
  useEffect(() => {
    if (!ready) return
    const target = RING_CIRCUMFERENCE * (1 - score / 100)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setOffset(target); return }
    const raf = requestAnimationFrame(() => setOffset(target))
    return () => cancelAnimationFrame(raf)
  }, [ready, score])

  if (hidden) return null

  if (!ready) {
    return <div className="rounded-[14px] border h-[260px] animate-pulse" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
  }

  const failCount = (rules: string[]) => rules.reduce((n, r) => n + (data!.byRule[r] ?? 0), 0)

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(16,24,40,0.05), 0 10px 26px -12px rgba(16,24,40,0.12)' }}
    >
      {/* Score header */}
      <div className="flex items-center" style={{ gap: '14px', padding: '17px 18px 15px' }}>
        <div className="relative flex-shrink-0" style={{ width: '48px', height: '48px' }}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="18" fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle
              cx="24" cy="24" r="18" fill="none" stroke={ringColor} strokeWidth="4" strokeLinecap="round"
              transform="rotate(-90 24 24)"
              style={{ strokeDasharray: RING_CIRCUMFERENCE, strokeDashoffset: offset, transition: 'stroke-dashoffset 1.3s cubic-bezier(.22,1,.36,1) .2s' }}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center"
            style={{ fontFamily: 'var(--font-dm-sans)', letterSpacing: '-0.02em', fontSize: '13px', fontWeight: 700, color: ringColor }}
          >
            {score}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p style={{ fontFamily: 'var(--font-manrope)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {score === 100 ? 'Plannings conformes' : 'Conformité à vérifier'}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '3px 0 0', lineHeight: 1.4 }}>
            {data!.total === 0
              ? 'Aucune alerte Code du Travail active.'
              : `${data!.total} écart${data!.total > 1 ? 's' : ''} détecté${data!.total > 1 ? 's' : ''} cette semaine.`}
          </p>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border)', margin: '0 18px' }} />

      {/* Controls checklist */}
      <div style={{ padding: '8px 18px 6px' }}>
        {CONTROLS.map(c => {
          const fails = failCount(c.rules)
          const failing = fails > 0
          const statusColor = failing ? (hasCritical ? 'var(--danger)' : 'var(--warning)') : 'var(--success)'
          return (
            <div key={c.label} className="flex items-center" style={{ gap: '10px', padding: '7px 0' }}>
              <span
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: '20px', height: '20px', borderRadius: '50%', background: failing ? 'rgba(240,140,0,0.13)' : 'rgba(18,184,134,0.13)' }}
              >
                {failing
                  ? <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor }} />
                  : <Check className="h-3 w-3" style={{ color: 'var(--success)' }} strokeWidth={3} />}
              </span>
              <span className="flex-1" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{c.label}</span>
              <span style={{ fontSize: '11.5px', fontWeight: 500, color: statusColor }}>
                {failing ? `${fails} à vérifier` : c.ok}
              </span>
            </div>
          )
        })}
      </div>

      <Link
        href="/manager/compliance"
        className="flex items-center justify-center"
        style={{ gap: '6px', padding: '12px', borderTop: '1px solid var(--border)', fontSize: '12.5px', fontWeight: 600, color: 'var(--accent)' }}
      >
        Voir le rapport de conformité
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
