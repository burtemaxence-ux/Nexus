'use client'

import { useEffect, useRef } from 'react'

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect width="28" height="28" rx="8" fill="rgba(108,99,255,0.15)" />
        <path d="M8 14h3l2.5-5 3 10 2.5-7L21 14h3" stroke="#6C63FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accentColor: '#6C63FF',
    title: 'Planning fait en 2 minutes',
    description:
      'Dites à l'IA vos contraintes de la semaine. Elle génère un planning complet, que vous validez ou ajustez avant de l'envoyer à votre équipe.',
    linkTo: '#dimanche-soir',
    delay: 0,
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect width="28" height="28" rx="8" fill="rgba(0,212,170,0.12)" />
        <circle cx="14" cy="11" r="4" stroke="#00D4AA" strokeWidth="1.8" />
        <path d="M7 22c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#00D4AA" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 6l1.5 1.5L24 5" stroke="#00D4AA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accentColor: '#00D4AA',
    title: 'Remplaçant trouvé en 1 clic',
    description:
      'Un absent au dernier moment ? L'application envoie automatiquement la demande aux disponibles. Vous confirmez le remplaçant depuis votre téléphone.',
    linkTo: '#absent',
    delay: 100,
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect width="28" height="28" rx="8" fill="rgba(0,212,170,0.08)" />
        <path d="M14 5l6 3v5c0 4-2.5 7.5-6 9-3.5-1.5-6-5-6-9V8l6-3z" stroke="#00D4AA" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10.5 14l2.5 2.5 4.5-4.5" stroke="#00D4AA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accentColor: '#FFB347',
    title: 'Conformité vérifiée automatiquement',
    description:
      'Repos quotidien, durée maximale, pauses, dimanches — 7 règles du Code du Travail vérifiées à chaque planning. Alerte immédiate si anomalie.',
    linkTo: '#controle',
    delay: 200,
  },
]

export function SolutionSection() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = el.dataset.delay ?? '0'
            setTimeout(() => el.classList.add('sol-card-visible'), parseInt(delay, 10))
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.15 }
    )
    cardRefs.current.forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #0c0b18 100%)',
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
            color: '#00D4AA',
            marginBottom: 16,
          }}>
            La solution
          </p>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            maxWidth: 560,
            margin: '0 auto 16px',
          }}>
            Faites votre planning en 2 minutes. L'IA s'occupe du reste.
          </h2>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            color: 'rgba(255,255,255,0.45)',
            maxWidth: 440,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Quartzbase répond exactement aux trois situations qui vous coûtent le plus de temps et d'énergie.
          </p>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
        }} className="sol-grid">
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el }}
              data-delay={feature.delay}
              className="sol-card"
              style={{
                background: '#111118',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '32px 28px',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.borderColor = `rgba(${hexToRgb(feature.accentColor)},0.35)`
                el.style.transform = 'translateY(-4px)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.borderColor = 'rgba(255,255,255,0.06)'
                el.style.transform = 'translateY(0)'
              }}
            >
              {/* Icône */}
              <div style={{ marginBottom: 20 }}>
                {feature.icon}
              </div>

              {/* Titre */}
              <h3 style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                marginBottom: 12,
                lineHeight: 1.3,
              }}>
                {feature.title}
              </h3>

              {/* Description */}
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                lineHeight: 1.65,
                color: 'rgba(255,255,255,0.55)',
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .sol-card {
          opacity: 0;
          transform: translateY(20px);
          transition:
            opacity 500ms ease-out,
            transform 500ms ease-out,
            border-color 200ms ease;
        }
        .sol-card-visible {
          opacity: 1;
          transform: translateY(0);
        }
        /* hover override quand visible */
        .sol-card-visible:hover {
          transform: translateY(-4px) !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .sol-card {
            opacity: 1;
            transform: none;
            transition: border-color 200ms ease;
          }
          .sol-card-visible:hover {
            transform: none !important;
          }
        }

        @media (max-width: 767px) {
          .sol-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}

/* Convertit #RRGGBB en "R,G,B" pour rgba() */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
