'use client'

import { useEffect, useRef } from 'react'

const STATS = [
  { value: '30 jours', label: 'Essai gratuit', color: '#6C63FF' },
  { value: 'Sans CB',  label: 'Aucune carte bleue requise', color: '#00D4AA' },
  { value: 'France',   label: 'Support en français', color: '#FFB347' },
]

const TESTIMONIALS = [
  {
    quote: `J'ai 19 ans et je code Quartzbase seul. Je l'ai construit parce que
      faire un planning à la main, le dimanche soir, c'est une perte de temps —
      et un planning non conforme au Code du Travail peut coûter cher.
      Mon objectif : que vous repreniez 4 heures par semaine, en règle.`,
    initials: 'MB',
    name: 'Maxence, fondateur',
    detail: 'Quartzbase · Développeur',
  },
  {
    quote: `Quartzbase vient de se lancer. Vous n'aurez pas 200 avis clients ici —
      mais un accès direct au fondateur, une conformité vérifiée automatiquement,
      et aucun engagement. Testez 30 jours : si ça ne vous fait pas gagner du temps,
      vous partez en un clic.`,
    initials: '✓',
    name: 'Notre engagement',
    detail: 'Transparence · Sans engagement',
  },
]

export function SocialProofSection() {
  const testimonialRefs = useRef<(HTMLDivElement | null)[]>([])
  const statsRef        = useRef<(HTMLDivElement | null)[]>([])

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

    testimonialRefs.current.forEach((el) => { if (el) observer.observe(el) })
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
            Une jeune solution, un engagement clair
          </p>
        </div>

        {/* Témoignages */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 24,
          maxWidth: 980,
          margin: '0 auto 80px',
        }} className="proof-testimonials-grid">
          {TESTIMONIALS.map((t, ti) => (
            <div
              key={t.initials}
              ref={(el) => { testimonialRefs.current[ti] = el }}
              data-delay={ti * 120}
              className="proof-card"
              style={{
                background: '#13121f',
                border: '1px solid rgba(108,99,255,0.12)',
                borderRadius: 16,
                padding: '36px 36px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Guillemets décoratifs */}
              <div style={{
                position: 'absolute',
                top: 24,
                left: 30,
                fontFamily: 'Georgia, serif',
                fontSize: 72,
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
                fontSize: 16,
                lineHeight: 1.65,
                color: 'rgba(255,255,255,0.82)',
                fontStyle: 'italic',
                margin: '0 0 28px',
                paddingTop: 14,
                flex: 1,
              }}>
                {t.quote}
              </blockquote>

              {/* Auteur */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
                    {t.initials}
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
                    {t.name}
                  </p>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.4)',
                    margin: 0,
                  }}>
                    {t.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
          {`Lancement 2026 — soyez parmi les premiers à moderniser votre planning`}
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
          .proof-stats-grid,
          .proof-testimonials-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
