'use client'

import Link from 'next/link'

export function CtaFinalSection() {
  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #110f2a 0%, #0d0b1f 50%, #0a0a0f 100%)',
        padding: '112px 24px',
        borderTop: '1px solid rgba(108,99,255,0.12)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow central */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(108,99,255,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} aria-hidden="true" />

      <div style={{
        maxWidth: 640,
        margin: '0 auto',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>

        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: 'clamp(28px, 4vw, 48px)',
          color: '#ffffff',
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          marginBottom: 20,
        }}>
          Votre prochain planning est à 2 minutes.
        </h2>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 16,
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 40,
          lineHeight: 1.6,
        }}>
          {`30 jours gratuits · Sans carte bleue · Annulation en 1 clic`}
        </p>

        <Link
          href="/register"
          style={{
            display: 'inline-block',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: '#fff',
            textDecoration: 'none',
            padding: '16px 36px',
            background: '#6C63FF',
            borderRadius: 12,
            transition: 'background 200ms ease, transform 100ms ease, box-shadow 200ms ease',
            boxShadow: '0 0 40px rgba(108,99,255,0.25)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#5a52e0'
            e.currentTarget.style.boxShadow = '0 0 60px rgba(108,99,255,0.4)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#6C63FF'
            e.currentTarget.style.boxShadow = '0 0 40px rgba(108,99,255,0.25)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          {`Démarrer gratuitement — 30 jours sans CB`}
        </Link>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          color: 'rgba(255,255,255,0.2)',
          marginTop: 20,
          letterSpacing: '0.02em',
        }}>
          Aucune carte requise · Pas de renouvellement automatique pendant l&apos;essai
        </p>

      </div>
    </section>
  )
}
