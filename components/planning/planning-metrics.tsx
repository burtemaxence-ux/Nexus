'use client'

import { memo } from 'react'
import { TrendingUp } from 'lucide-react'
import type { Shift, Poste } from '@/types'
import { calcHours, formatHours } from '@/lib/planning-utils'

export const MetricCard = memo(function MetricCard({ icon, iconBg, iconColor, value, label, trend }: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  value: string
  label: string
  trend?: 'up' | 'down' | null
}) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '12px',
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px',
      flex: 1, minWidth: 0, position: 'relative',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: iconColor,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>{value}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap' }}>{label}</p>
      </div>
      {trend && (
        <div style={{ position: 'absolute', top: '12px', right: '14px' }}>
          <TrendingUp size={14} style={{ color: trend === 'up' ? 'var(--success)' : 'var(--danger)', opacity: 0.7 }} />
        </div>
      )}
    </div>
  )
})

export const DonutChart = memo(function DonutChart({ shifts, postes }: { shifts: Shift[]; postes: Poste[] }) {
  const posteMap = new Map(postes.map(p => [p.id, p]))
  const hoursPerPoste = new Map<string, number>()
  let totalH = 0

  for (const s of shifts) {
    const h = calcHours(s.start_time, s.end_time, s.break_minutes)
    const key = s.poste_id ?? '__none__'
    hoursPerPoste.set(key, (hoursPerPoste.get(key) ?? 0) + h)
    totalH += h
  }

  if (totalH === 0) return null

  const entries = Array.from(hoursPerPoste.entries()).map(([id, h]) => ({
    id, poste: posteMap.get(id), hours: h, pct: Math.round((h / totalH) * 100),
  })).sort((a, b) => b.hours - a.hours)

  const r = 48, cx = 60, cy = 60, stroke = 18
  let cumAngle = -Math.PI / 2

  const arcs = entries.map(e => {
    const angle = (e.hours / totalH) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = cx + r * Math.cos(cumAngle)
    const y2 = cy + r * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    return { ...e, d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color: e.poste?.color ?? 'var(--border)' }
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
        {arcs.map((arc, i) => (
          <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={stroke} strokeLinecap="butt" />
        ))}
        <text x="60" y="56" textAnchor="middle" style={{ fontSize: '14px', fontWeight: 600, fill: 'var(--text-primary)' }}>{formatHours(totalH)}</text>
        <text x="60" y="70" textAnchor="middle" style={{ fontSize: '9px', fill: 'var(--text-tertiary)' }}>Total planif.</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {entries.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: e.poste?.color ?? 'var(--border)', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.poste?.name ?? 'Sans poste'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, flexShrink: 0 }}>{formatHours(e.hours)}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0, width: '30px', textAlign: 'right' }}>{e.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
})

export const AlertRow = memo(function AlertRow({ iconBg, iconColor, icon, title, desc, badge }: {
  iconBg: string; iconColor: string; icon: React.ReactNode
  title: string; desc: string
  badge: { label: string; color: string; bg: string }
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{title}</p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>{desc}</p>
      </div>
      <div style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: badge.bg, color: badge.color, fontSize: '11px', fontWeight: 500, flexShrink: 0 }}>
        {badge.label}
      </div>
    </div>
  )
})

export const ActivityRow = memo(function ActivityRow({ iconBg, iconColor, icon, desc, sub }: {
  iconBg: string; iconColor: string; icon: React.ReactNode; desc: string; sub: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{desc}</p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' }}>{sub}</p>
      </div>
    </div>
  )
})
