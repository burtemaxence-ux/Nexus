'use client'

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

export function TimeCarousel({ value, onChange, label, compact = false }: TimeCarouselProps) {
  function adjustHour(delta: number) {
    onChange({ ...value, hour: (value.hour + delta + 24) % 24 })
  }

  function adjustMinute(delta: number) {
    const steps = 12 // 5-min increments
    const cur = Math.round(value.minute / 5)
    onChange({ ...value, minute: ((cur + delta + steps) % steps) * 5 })
  }

  const btnCls = `p-1.5 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors select-none`
  const digitCls = compact ? 'text-2xl' : 'text-4xl'

  return (
    <div className="flex flex-col items-center gap-1.5">
      {label && (
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      )}
      <div className={`flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-2xl ${compact ? 'px-3 py-2' : 'px-5 py-3'} shadow-sm`}>
        {/* Hours column */}
        <div className="flex flex-col items-center">
          <button onClick={() => adjustHour(1)} className={btnCls} type="button">
            <ChevronUp className={compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
          </button>
          <span className={`${digitCls} font-bold text-gray-900 tabular-nums w-14 text-center leading-none py-1`}>
            {String(value.hour).padStart(2, '0')}
          </span>
          <button onClick={() => adjustHour(-1)} className={btnCls} type="button">
            <ChevronDown className={compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
          </button>
        </div>

        <span className={`${digitCls} font-bold text-gray-300 leading-none pb-0.5`}>:</span>

        {/* Minutes column */}
        <div className="flex flex-col items-center">
          <button onClick={() => adjustMinute(1)} className={btnCls} type="button">
            <ChevronUp className={compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
          </button>
          <span className={`${digitCls} font-bold text-gray-900 tabular-nums w-14 text-center leading-none py-1`}>
            {String(value.minute).padStart(2, '0')}
          </span>
          <button onClick={() => adjustMinute(-1)} className={btnCls} type="button">
            <ChevronDown className={compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
          </button>
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
