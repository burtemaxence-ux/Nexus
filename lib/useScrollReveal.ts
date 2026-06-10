'use client'

import { useEffect } from 'react'

export function useScrollReveal() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          const delay = parseInt(el.dataset.revealDelay ?? '0', 10)
          setTimeout(() => {
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
          }, delay)
          observer.unobserve(el)
        })
      },
      { threshold: 0.1 }
    )

    const elements = document.querySelectorAll('[data-reveal]')
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement
      htmlEl.style.opacity = '0'
      htmlEl.style.transform = 'translateY(20px)'
      htmlEl.style.transition = 'opacity 600ms ease-out, transform 600ms ease-out'
      observer.observe(htmlEl)
    })

    return () => observer.disconnect()
  }, [])
}
