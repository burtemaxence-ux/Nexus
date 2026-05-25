'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export interface TimeValue {
  hour: number
  minute: number
}

interface TimeCarouselProps {
  value: TimeValue
  onChange: (value: TimeValue) => void
  label?: string
  compact?: boolean
}

function AdjustBtn({ onClick, children, compact }: { onClick: () => void; children: React.ReactNode; compact: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="p-1.5 rounded-lg transition-colors select-none"
      style={{ backgroundColor: hovered ? 'var(--bg-page)' : 'transparent', color: 'var(--text-secondary)' }}
    >
      {children}
    </button>
  )
}

export function TimeCarousel({ value, onChange, label, compact = false }: TimeCarouselProps) {
  function adjustHour(delta: number) {
    onChange({ ...value, hour: (value.hour + delta + 24) % 24 })
  }

  function adjustMinute(delta: number) {
    const steps = 12
    const cur = Math.round(value.minute / 5)
    onChange({ ...value, minute: ((cur + delta + steps) % steps) * 5 })
  }

  const digitCls = compact ? 'text-2xl' : 'text-4xl'
  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-5 w-5'

  return (
    <div className="flex flex-col items-center gap-1.5">
      {label && (
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </p>
      )}
      <div
        className={`flex items-center gap-1 rounded-2xl ${compact ? 'px-3 py-2' : 'px-5 py-3'}`}
        style={{ backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)' }}
      >
        {/* Hours column */}
        <div className="flex flex-col items-center">
          <AdjustBtn onClick={() => adjustHour(1)} compact={compact}>
            <ChevronUp className={iconSize} />
          </AdjustBtn>
          <span
            className={`${digitCls} font-bold tabular-nums w-14 text-center leading-none py-1`}
            style={{ color: 'var(--text-primary)' }}
          >
            {String(value.hour).padStart(2, '0')}
          </span>
          <AdjustBtn onClick={() => adjustHour(-1)} compact={compact}>
            <ChevronDown className={iconSize} />
          </AdjustBtn>
        </div>

        <span
          className={`${digitCls} font-bold leading-none pb-0.5`}
          style={{ color: 'var(--text-tertiary)' }}
        >
          :
        </span>

        {/* Minutes column */}
        <div className="flex flex-col items-center">
          <AdjustBtn onClick={() => adjustMinute(1)} compact={compact}>
            <ChevronUp className={iconSize} />
          </AdjustBtn>
          <span
            className={`${digitCls} font-bold tabular-nums w-14 text-center leading-none py-1`}
            style={{ color: 'var(--text-primary)' }}
          >
            {String(value.minute).padStart(2, '0')}
          </span>
          <AdjustBtn onClick={() => adjustMinute(-1)} compact={compact}>
            <ChevronDown className={iconSize} />
          </AdjustBtn>
        </div>
      </div>
    </div>
  )
}

export function timeValueToISO(v: TimeValue): string {
  const d = new Date()
  d.setHours(v.hour, v.minute, 0, 0)
  return d.toISOString()
}

export function isoToTimeValue(iso: string): TimeValue {
  const d = new Date(iso)
  return { hour: d.getHours(), minute: d.getMinutes() }
}

export function nowTimeValue(): TimeValue {
  const d = new Date()
  return { hour: d.getHours(), minute: d.getMinutes() }
}
