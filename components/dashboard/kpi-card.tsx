'use client'

import { useEffect, useState, type ElementType, type ReactNode } from 'react'

/** Count-up from 0 → target, respecting prefers-reduced-motion. */
function useCountUp(target: number, duration = 850): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target); return
    }
    if (target === 0) { setValue(0); return }
    let startTime: number | null = null
    let raf: number
    const step = (ts: number) => {
      if (startTime === null) startTime = ts
      const p = Math.min((ts - startTime) / duration, 1)
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

/** Build a sparkline (line + area) path from a real data series in an 84×36 box. */
function sparkPaths(data: number[]): { line: string; area: string; endX: number; endY: number } | null {
  if (data.length < 2) return null
  const w = 84, h = 36, padX = 2, padTop = 6, padBottom = 6
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const step = (w - padX * 2) / (data.length - 1)
  const pts = data.map((v, i) => {
    const x = padX + i * step
    const y = padTop + (1 - (v - min) / span) * (h - padTop - padBottom)
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as const
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')
  const [endX, endY] = pts[pts.length - 1]
  const area = `${line} L${endX} ${h} L${pts[0][0]} ${h} Z`
  return { line, area, endX, endY }
}

export interface KpiCardProps {
  label: string
  value: number
  suffix?: string
  /** Main category colour (hex or css var). */
  color: string
  /** rgba used for the breathing corner halo. */
  halo: string
  /** Linear-gradient string revealed as the top bar on hover. */
  glow: string
  /** Icon chip background (linear-gradient string). */
  iconBg: string
  icon: ElementType
  /** Real series for the sparkline; omitted ⇒ no sparkline (we never fabricate one). */
  sparkData?: number[]
  /** Footer trend row (arrows, avatars, status dot…). */
  footer?: ReactNode
  /** Render an em dash instead of a number (no data). */
  isNull?: boolean
  /** Stable id for the sparkline gradient. */
  gradientId: string
}

export function KpiCard({
  label, value, suffix, color, halo, glow, iconBg, icon: Icon,
  sparkData, footer, isNull = false, gradientId,
}: KpiCardProps) {
  const animated = useCountUp(value)
  const spark = sparkData ? sparkPaths(sparkData) : null

  return (
    <div
      className="nx-kpi relative flex flex-col overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '16px 16px 0',
        boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 12px 30px -18px rgba(16,24,40,0.18)',
      }}
    >
      {/* hover top bar */}
      <span className="nx-kpi-glow absolute top-0 left-0 right-0" style={{ height: '3px', background: glow }} />
      {/* dotted texture, masked toward the bottom */}
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, var(--kpi-tex, rgba(16,24,40,0.04)) 1px, transparent 0)',
          backgroundSize: '13px 13px',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 72%)',
          maskImage: 'linear-gradient(180deg, #000 0%, transparent 72%)',
        }}
      />
      {/* breathing accent halo */}
      <span
        className="nx-kpi-accent absolute pointer-events-none"
        style={{ top: '-26px', right: '-26px', width: '90px', height: '90px', borderRadius: '50%', filter: 'blur(20px)', background: `radial-gradient(circle, ${halo}, transparent 70%)` }}
      />
      {/* sparkline (real data only) */}
      {spark && (
        <svg className="absolute pointer-events-none" style={{ top: '15px', right: '14px' }} width="84" height="36" viewBox="0 0 84 36">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="nx-spark-area" d={spark.area} fill={`url(#${gradientId})`} />
          <path className="nx-spark-line" d={spark.line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle className="nx-spark-dot" cx={spark.endX} cy={spark.endY} r="2.6" fill={color} />
        </svg>
      )}

      {/* icon chip */}
      <div
        className="nx-kpi-icon relative flex items-center justify-center flex-shrink-0"
        style={{ width: '38px', height: '38px', borderRadius: '11px', background: iconBg }}
      >
        <Icon className="h-[18px] w-[18px]" style={{ color }} strokeWidth={2.1} />
      </div>

      {/* value */}
      <p
        className="relative"
        style={{ fontSize: '33px', fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)', fontFamily: 'var(--font-dm-sans)', letterSpacing: '-0.02em', margin: '16px 0 0', fontVariantNumeric: 'tabular-nums' }}
      >
        {isNull ? '—' : (
          <>
            {animated}
            {suffix && <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '1px', color: 'var(--text-tertiary)' }}>{suffix}</span>}
          </>
        )}
      </p>

      {/* label */}
      <p className="relative" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '5px 0 0', fontWeight: 500 }}>
        {label}
      </p>

      {/* trend footer */}
      <div className="relative flex items-center" style={{ marginTop: '13px', padding: '9px 0', borderTop: '1px solid var(--border)', minHeight: '38px' }}>
        {footer}
      </div>
    </div>
  )
}
