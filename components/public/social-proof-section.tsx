'use client'

import { useEffect, useRef } from 'react'

const STATS = [
  { value: '14 jours', label: 'Essai gratuit', color: '#6C63FF' },
  { value: 'Sans CB',  label: 'Aucune carte bleue requise', color: '#00D4AA' },
  { value: 'France',   label: 'Support en français', color: '#FFB347' },
]

export function SocialProofSection() {
  const sectionRef  = useRef<HTMLDivElement>(null)
  const statsRef    = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = parseInt(el.dataset.delay ?? '0', 10)
            setTimeout(() => el.classList.add('proof-visible'), delay)
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.15 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    statsRef.current.forEach((el) => { if (el) observer.observe(el) })

    return () => observer.disconnect()
  }, [])

  return (
    <section
      style={{
        background: '#0a0a0f',
        padding: '96px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Label */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
          }}>
            Ils ont changé leur façon de gérer
          </p>
        </div>

        {/* Témoignage principal */}
        <div
          ref={sectionRef}
          className="proof-card"
          style={{
            background: '#13121f',
            border: '1px solid rgba(108,99,255,0.12)',
            borderRadius: 16,
            padding: '40px 48px',
            maxWidth: 720,
            margin: '0 auto 80px',
            position: 'relative',
          }}
        >
          {/* Guillemets décoratifs */}
          <div style={{
            position: 'absolute',
            top: 28,
            left: 40,
            fontFamily: 'Georgia, serif',
            fontSize: 80,
            lineHeight: 1,
            color: 'rgba(108,99,255,0.15)',
            userSelect: 'none',
            pointerEvents: 'none',
          }} aria-hidden="true">
            &ldquo;
          </div>

          {/* Citation */}
          <blockquote style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 19,
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.82)',
            fontStyle: 'italic',
            margin: '0 0 32px',
            paddingTop: 16,
          }}>
            {`Quartzbase m'a fait économiser 4 heures par semaine dès le premier mois.
            Je fais mon planning le vendredi en 3 minutes, et mes employés reçoivent
            leur semaine directement sur leur téléphone. Je n'aurais pas cru que c'était
            possible avant d'essayer.`}
          </blockquote>

          {/* Auteur */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar initiales */}
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C63FF, #00D4AA)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: '#fff',
              }}>
                TM
              </span>
            </div>
            <div>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: '#ffffff',
                margin: 0,
              }}>
                Thomas M.
              </p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: 'rgba(255,255,255,0.4)',
                margin: 0,
              }}>
                Boulangerie artisanale · Lyon · 12 employés
              </p>
            </div>
          </div>
        </div>

        {/* 3 chiffres clés */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 14,
          overflow: 'hidden',
          maxWidth: 720,
          margin: '0 auto 56px',
        }} className="proof-stats-grid">
          {STATS.map((stat, i) => (
            <div
              key={i}
              ref={(el) => { statsRef.current[i] = el }}
              data-delay={i * 80}
              className="proof-stat"
              style={{
                background: '#0a0a0f',
                padding: '28px 24px',
                textAlign: 'center',
              }}
            >
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 26,
                color: stat.color,
                letterSpacing: '-0.02em',
                marginBottom: 6,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: 'rgba(255,255,255,0.4)',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Message de confiance */}
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: 'rgba(255,255,255,0.25)',
          textAlign: 'center',
          letterSpacing: '0.02em',
        }}>
          {`Utilisé par les premiers artisans qui ont modernisé leur planning`}
        </p>

      </div>

      <style>{`
        .proof-card,
        .proof-stat {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 550ms ease-out, transform 550ms ease-out;
        }
        .proof-visible,
        .proof-stat.proof-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .proof-card, .proof-stat {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }

        @media (max-width: 767px) {
          .proof-stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
