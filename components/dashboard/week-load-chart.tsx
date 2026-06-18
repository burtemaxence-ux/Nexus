'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'

export interface DayLoad {
  day: string
  hours: number
  isToday: boolean
}

// Tooltip theme-aware (DOM, donc variables CSS OK contrairement aux primitives SVG).
function TooltipContent({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg px-3 py-2 text-[12px] shadow-sm border"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <p style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
        {payload[0].value} h planifiées
      </p>
    </div>
  )
}

/** Charge de la semaine en cours — heures planifiées par jour (aujourd'hui mis en avant). */
export function WeekLoadChart({ data }: { data: DayLoad[] }) {
  const total = data.reduce((s, d) => s + d.hours, 0)

  if (total === 0) {
    return (
      <p className="text-[13px] text-center py-10" style={{ color: 'var(--text-tertiary)' }}>
        Aucun shift planifié cette semaine.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.18)" />
        <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={36} tickFormatter={v => `${v}h`} />
        <Tooltip content={<TooltipContent />} cursor={{ fill: 'rgba(108,99,255,0.08)' }} />
        <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={38}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isToday ? '#6C63FF' : 'rgba(108,99,255,0.35)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
