'use client'

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}

/* Compteur qui monte de 0 à `end` quand il entre dans le viewport.
   Respecte prefers-reduced-motion (affiche directement la valeur finale). */
export function CountUp({ end, duration = 1400, prefix = '', suffix = '', className }: CountUpProps) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(end)
      return
    }

    let rafId = 0
    const run = () => {
      let start: number | null = null
      const step = (ts: number) => {
        if (start === null) start = ts
        const progress = Math.min((ts - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * end))
        if (progress < 1) rafId = requestAnimationFrame(step)
      }
      rafId = requestAnimationFrame(step)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !done.current) {
          done.current = true
          run()
          observer.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(el)

    return () => { observer.disconnect(); cancelAnimationFrame(rafId) }
  }, [end, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{value}{suffix}
    </span>
  )
}
