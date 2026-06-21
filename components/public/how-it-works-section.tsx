'use client'

import { useEffect, useRef } from 'react'

const STEPS = [
  {
    num: '01',
    accent: '#6C63FF',
    title: 'Vous décrivez votre semaine',
    desc: `Qui travaille, combien d'heures, vos contraintes du moment. En une phrase, comme si vous le disiez à voix haute.`,
  },
  {
    num: '02',
    accent: '#00D4AA',
    title: `L'IA construit le planning`,
    desc: `Quelques secondes plus tard, un planning complet et déjà conforme au Code du Travail. Un glisser-déposer suffit pour l'ajuster.`,
  },
  {
    num: '03',
    accent: '#FFB347',
    title: 'Votre équipe est prévenue',
    desc: `Un clic, et chacun reçoit ses horaires sur son téléphone. Fini les captures d'écran envoyées dans le groupe à 23h.`,
  },
]

export function HowItWorksSection() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = el.dataset.delay ?? '0'
            setTimeout(() => el.classList.add('how-card-visible'), parseInt(delay, 10))
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
      id="comment-ca-marche"
      style={{
        background: '#0a0a0f',
        padding: '96px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

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
            Comment ça marche
          </p>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            maxWidth: 620,
            margin: '0 auto',
          }}>
            De votre tête au téléphone de l&apos;équipe, en 2 minutes
          </h2>
        </div>

        {/* Étapes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
        }} className="how-grid">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              ref={(el) => { cardRefs.current[i] = el }}
              data-delay={i * 120}
              className="how-card"
              style={{
                background: '#111118',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '32px 28px',
                position: 'relative',
              }}
            >
              {/* Numéro */}
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 40,
                lineHeight: 1,
                color: step.accent,
                opacity: 0.9,
                marginBottom: 20,
              }}>
                {step.num}
              </div>

              <h3 style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                marginBottom: 12,
                lineHeight: 1.3,
              }}>
                {step.title}
              </h3>

              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                lineHeight: 1.65,
                color: 'rgba(255,255,255,0.55)',
              }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .how-card {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 500ms ease-out, transform 500ms ease-out;
        }
        .how-card-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .how-card { opacity: 1; transform: none; transition: none; }
        }
        @media (max-width: 767px) {
          .how-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
