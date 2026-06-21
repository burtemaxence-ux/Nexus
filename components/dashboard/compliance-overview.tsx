'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react'

interface Alert {
  id: string
  type: string
  level: 'CRITICAL' | 'WARNING' | 'INFO'
}

// Libellés des règles du Code du Travail (clé = compliance_alerts.type)
const RULE_LABELS: Record<string, string> = {
  rest_daily:       'Repos quotidien (11 h)',
  hours_daily_max:  'Durée max / jour (10 h)',
  hours_weekly_max: 'Durée max / semaine (48 h)',
  break_missing:    'Pause manquante (> 6 h)',
  days_consecutive: 'Jours consécutifs (6 max)',
  sunday_work:      'Travail le dimanche',
  night_work:       'Travail de nuit',
}

const LEVEL_RANK: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 }

function levelColor(level: string): string {
  if (level === 'CRITICAL') return 'var(--danger)'
  if (level === 'WARNING') return 'var(--warning)'
  return 'var(--accent)'
}

/**
 * Cockpit — Conformité Code du Travail. Le différenciateur Quartzbase rendu
 * visible sur le home : alertes actives groupées par règle, ou état positif
 * rassurant si tout est conforme. Se masque si l'utilisateur n'y a pas accès.
 */
export function ComplianceOverview() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/compliance/alerts')
      .then(r => {
        if (!r.ok) { if (active) setHidden(true); return null }
        return r.json()
      })
      .then(d => { if (active && d) setAlerts(d.alerts ?? []) })
      .catch(() => { if (active) setHidden(true) })
    return () => { active = false }
  }, [])

  if (hidden) return null

  if (alerts === null) {
    return (
      <div
        className="rounded-[14px] border h-[120px] animate-pulse"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      />
    )
  }

  // État positif — la promesse produit tenue
  if (alerts.length === 0) {
    return (
      <Link href="/manager/compliance" className="block">
        <div
          className="dashboard-card rounded-[14px] border p-5 flex items-center gap-4 transition-all duration-200"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(0,212,170,0.12)' }}
          >
            <ShieldCheck className="h-5 w-5" style={{ color: 'var(--success)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
              Vos plannings sont conformes
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Aucune alerte Code du Travail active.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </Link>
    )
  }

  const critical = alerts.filter(a => a.level === 'CRITICAL').length

  // Regroupement par règle (avec le niveau le plus grave de chaque groupe)
  const byType = new Map<string, { count: number; worst: string }>()
  for (const a of alerts) {
    const cur = byType.get(a.type) ?? { count: 0, worst: 'INFO' }
    cur.count++
    if ((LEVEL_RANK[a.level] ?? 9) < (LEVEL_RANK[cur.worst] ?? 9)) cur.worst = a.level
    byType.set(a.type, cur)
  }
  const rows = Array.from(byType.entries())
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => (LEVEL_RANK[a.worst] - LEVEL_RANK[b.worst]) || (b.count - a.count))
  const max = rows[0].count

  return (
    <div
      className="rounded-[14px] border overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: critical > 0 ? 'rgba(255,107,107,0.12)' : 'rgba(255,179,71,0.12)' }}
        >
          <ShieldAlert className="h-5 w-5" style={{ color: critical > 0 ? 'var(--danger)' : 'var(--warning)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
            {alerts.length} alerte{alerts.length > 1 ? 's' : ''} de conformité
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: critical > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
            {critical > 0
              ? `${critical} critique${critical > 1 ? 's' : ''} — risque prud'hommes`
              : 'À surveiller'}
          </p>
        </div>
        <Link
          href="/manager/compliance"
          className="flex items-center gap-1 text-[12px] font-medium flex-shrink-0"
          style={{ color: 'var(--accent)' }}
        >
          Voir tout <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="px-5 py-3.5 space-y-2.5">
        {rows.map(r => (
          <Link key={r.type} href="/manager/compliance" className="flex items-center gap-3 group">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: levelColor(r.worst) }} />
            <span className="text-[13px] flex-1 min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
              {RULE_LABELS[r.type] ?? r.type}
            </span>
            <span className="hidden sm:block h-1.5 rounded-full overflow-hidden" style={{ width: 80, backgroundColor: 'var(--border)' }}>
              <span className="block h-full rounded-full bar-grow-right" style={{ width: `${Math.max(15, (r.count / max) * 100)}%`, backgroundColor: levelColor(r.worst) }} />
            </span>
            <span className="text-[13px] font-semibold tabular-nums w-6 text-right flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
              {r.count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
