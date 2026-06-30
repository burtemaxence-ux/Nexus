'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'

interface Alert { id: string; type: string; level: 'CRITICAL' | 'WARNING' | 'INFO' }

// The four Code-du-Travail controls shown on the home, each backed by the
// `compliance_alerts.type` values produced by the compliance engine.
const CONTROLS: { label: string; ok: string; types: string[] }[] = [
  { label: 'Repos quotidien de 11 h',        ok: 'Respecté',   types: ['rest_daily'] },
  { label: 'Durée hebdomadaire sous 48 h',   ok: 'Respecté',   types: ['hours_weekly_max'] },
  { label: 'Pauses légales planifiées',      ok: 'Respectées', types: ['break_missing'] },
  { label: 'Amplitude et coupures',          ok: 'Conformes',  types: ['hours_daily_max', 'days_consecutive', 'sunday_work', 'night_work'] },
]

const RING_CIRCUMFERENCE = 113 // 2π·18, matches the SVG radius below.

/**
 * Conformité — score ring + per-control checklist, derived from the active
 * compliance alerts (`/api/compliance/alerts`). Score = share of the four
 * controls with no active alert. Hidden if the user has no compliance access.
 */
export function ComplianceRing() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [hidden, setHidden] = useState(false)
  const [offset, setOffset] = useState(RING_CIRCUMFERENCE) // start empty, animate to target

  useEffect(() => {
    let active = true
    fetch('/api/compliance/alerts')
      .then(r => { if (!r.ok) { if (active) setHidden(true); return null } return r.json() })
      .then(d => { if (active && d) setAlerts(d.alerts ?? []) })
      .catch(() => { if (active) setHidden(true) })
    return () => { active = false }
  }, [])

  const ready = alerts !== null
  const failByControl = CONTROLS.map(c => (alerts ?? []).filter(a => c.types.includes(a.type)).length)
  const failingControls = failByControl.filter(n => n > 0).length
  const score = ready ? Math.round(((CONTROLS.length - failingControls) / CONTROLS.length) * 100) : 0
  const hasCritical = (alerts ?? []).some(a => a.level === 'CRITICAL')
  const ringColor = score === 100 ? 'var(--success)' : hasCritical ? 'var(--danger)' : 'var(--warning)'

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
          <p style={{ fontFamily: 'var(--font-syne)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {score === 100 ? 'Plannings conformes' : 'Conformité à vérifier'}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '3px 0 0', lineHeight: 1.4 }}>
            {alerts!.length === 0
              ? 'Aucune alerte Code du Travail active.'
              : `${alerts!.length} alerte${alerts!.length > 1 ? 's' : ''} active${alerts!.length > 1 ? 's' : ''} à traiter.`}
          </p>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border)', margin: '0 18px' }} />

      {/* Controls checklist */}
      <div style={{ padding: '8px 18px 6px' }}>
        {CONTROLS.map((c, i) => {
          const failing = failByControl[i] > 0
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
                {failing ? 'À vérifier' : c.ok}
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
