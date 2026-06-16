'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export function FloatingMobileCta() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <div
        className="floating-cta"
        style={{
          position: 'fixed',
          bottom: 20,
          left: 16,
          right: 16,
          zIndex: 60,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 250ms ease, transform 250ms ease',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <Link
          href="/register"
          style={{
            display: 'block',
            textAlign: 'center',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: 15,
            color: '#fff',
            textDecoration: 'none',
            padding: '14px 20px',
            background: '#6C63FF',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(108,99,255,0.45)',
          }}
        >
          {`Essai gratuit — 30 jours`}
        </Link>
      </div>

      <style>{`
        .floating-cta { display: none; }
        @media (max-width: 767px) {
          .floating-cta { display: block; }
        }
        @media (prefers-reduced-motion: reduce) {
          .floating-cta { transition: none; }
        }
      `}</style>
    </>
  )
}
