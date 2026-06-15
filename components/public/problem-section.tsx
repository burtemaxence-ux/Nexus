'use client'

import { useEffect, useRef } from 'react'

const SITUATIONS = [
  {
    emoji: '😮‍💨',
    label: 'Le dimanche soir',
    situation:
      'Vous ouvrez Excel pour "vite faire le planning". Deux heures plus tard, vous rangez enfin votre téléphone.',
    consequence: 'Votre week-end finit au boulot. Chaque semaine.',
    accentColor: '#6C63FF',
    delay: 0,
  },
  {
    emoji: '📱',
    label: '7h du matin, un message',
    situation:
      '"Je peux pas venir aujourd\'hui." Vous avez une heure pour trouver quelqu\'un — ou assurer vous-même.',
    consequence: 'Le stress du lundi matin avant même d\'ouvrir.',
    accentColor: '#FF6B6B',
    delay: 100,
  },
  {
    emoji: '📋',
    label: 'La peur du contrôle',
    situation:
      'Un collègue parle d\'une inspection dans le quartier. Vos plannings respectent-ils bien les règles de repos ?',
    consequence: 'Cette incertitude qui tourne dans la tête sans qu\'on puisse l\'éteindre.',
    accentColor: '#FFB347',
    delay: 200,
  },
]

export function ProblemSection() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = el.dataset.delay ?? '0'
            setTimeout(() => {
              el.classList.add('prob-card-visible')
            }, parseInt(delay, 10))
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.15 }
    )

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="problemes"
      style={{
        background: '#0a0a0f',
        padding: '96px 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Titre */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6C63FF',
            marginBottom: 16,
          }}>
            Vous aussi vous faites ça ?
          </p>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            maxWidth: 560,
            margin: '0 auto',
          }}>
            Ces moments que chaque patron connaît par cœur
          </h2>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
        }} className="prob-grid">
          {SITUATIONS.map((item, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el }}
              data-delay={item.delay}
              className="prob-card"
              style={{
                background: '#111118',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '32px 28px',
              }}
            >
              {/* Emoji + label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{item.emoji}</span>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: item.accentColor,
                }}>
                  {item.label}
                </span>
              </div>

              {/* Situation */}
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 15,
                lineHeight: 1.65,
                color: 'rgba(255,255,255,0.7)',
                marginBottom: 20,
              }}>
                {item.situation}
              </p>

              {/* Séparateur */}
              <div style={{
                height: 1,
                background: 'rgba(255,255,255,0.05)',
                marginBottom: 20,
              }} />

              {/* Conséquence émotionnelle */}
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontStyle: 'italic',
                color: 'rgba(255,255,255,0.38)',
                lineHeight: 1.5,
              }}>
                {item.consequence}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .prob-card {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 500ms ease-out, transform 500ms ease-out;
        }
        .prob-card-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .prob-card {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }

        @media (max-width: 767px) {
          .prob-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
