'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Reveal au scroll : IntersectionObserver + fallback timer obligatoire
 * (le contenu n'est jamais laissé caché — cf. handoff). `shown` est piloté
 * par un state React → survit aux re-renders des sections interactives.
 */
export function useReveal(opts?: { threshold?: number; fallback?: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion()) { setShown(true); return }
    const el = ref.current
    if (!el) { setShown(true); return }

    let done = false
    const reveal = () => { if (!done) { done = true; setShown(true) } }

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { reveal(); io.disconnect() } }),
      { threshold: opts?.threshold ?? 0.12 },
    )
    io.observe(el)
    const fb = window.setTimeout(reveal, opts?.fallback ?? 1800)

    return () => { io.disconnect(); window.clearTimeout(fb) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ref, shown }
}

/** Wrapper déclaratif : <Reveal>…</Reveal> applique qb-reveal + qb-in/qb-pre. */
export function Reveal({
  children,
  className = '',
  style,
  id,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  id?: string
}) {
  const { ref, shown } = useReveal()
  return (
    <div
      ref={ref}
      id={id}
      className={`qb-reveal ${shown ? 'qb-in' : 'qb-pre'} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  )
}

/**
 * Count-up 0→target, easing cubic-out, avec fallback obligatoire
 * (ne jamais rester bloqué sur « 0 »). Piloté par state React.
 */
export function useCountUp(
  target: number,
  opts?: { duration?: number; fallback?: number; threshold?: number },
) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const run = () => {
      if (started.current) return
      started.current = true
      if (prefersReducedMotion()) { setValue(target); return }
      const dur = opts?.duration ?? 1300
      const t0 = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur)
        const eased = 1 - Math.pow(1 - p, 3)
        setValue(Math.round(eased * target))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    const el = ref.current
    let io: IntersectionObserver | undefined
    if (el) {
      io = new IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) { run(); io?.disconnect() } }),
        { threshold: opts?.threshold ?? 0.5 },
      )
      io.observe(el)
    }
    const fb = window.setTimeout(run, opts?.fallback ?? 1400)

    return () => { io?.disconnect(); window.clearTimeout(fb) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return { ref, value }
}
