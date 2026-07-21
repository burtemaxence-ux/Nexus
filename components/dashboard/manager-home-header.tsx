'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Send } from 'lucide-react'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Manager home header — greeting + live date/clock (fr-FR) and the two primary
 * actions. Both actions route to the planning page, where the week is published.
 */
export function ManagerHomeHeader({ firstName, establishmentName }: { firstName: string; establishmentName: string | null }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const dateLabel = now ? cap(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) : ''
  const clockLabel = now ? now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'

  return (
    <div className="flex items-center justify-between flex-wrap" style={{ gap: '16px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-manrope)', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
          Bonjour {firstName}
        </h1>
        <p style={{ fontSize: '12.5px', margin: '5px 0 0', color: 'var(--text-tertiary)' }}>
          {establishmentName ? <>{establishmentName} · </> : null}
          <span suppressHydrationWarning>{dateLabel}</span>
        </p>
      </div>

      <div className="flex items-center" style={{ gap: '9px' }}>
        {/* Live clock pill */}
        <div
          className="inline-flex items-center"
          style={{ gap: '7px', height: '36px', padding: '0 13px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}
        >
          <span className="w-[7px] h-[7px] rounded-full dot-pulse-green" style={{ background: 'var(--success)' }} />
          <span
            suppressHydrationWarning
            style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em', minWidth: '62px', textAlign: 'center' }}
          >
            {clockLabel}
          </span>
        </div>

        <Link
          href="/manager/planning"
          className="inline-flex items-center transition-colors"
          style={{ gap: '6px', height: '36px', padding: '0 13px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '12.5px', fontWeight: 500 }}
        >
          <Calendar className="h-[15px] w-[15px]" />
          Planning du jour
        </Link>

        <Link
          href="/manager/planning"
          className="inline-flex items-center transition-transform active:scale-95"
          style={{ gap: '6px', height: '36px', padding: '0 13px 0 11px', borderRadius: '10px', background: 'linear-gradient(135deg,#7d75ff,#5B52E8)', color: '#fff', fontSize: '12.5px', fontWeight: 600, boxShadow: '0 4px 14px -4px rgba(108,99,255,0.6)' }}
        >
          <Send className="h-[15px] w-[15px]" />
          Publier la semaine
        </Link>
      </div>
    </div>
  )
}
