'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { CountUp } from '@/components/ui/count-up'

const FIGURES = [
  {
    end: 4,
    suffix: ' h',
    label: 'perdues chaque semaine à faire et refaire le planning',
    color: '#FF6B6B',
  },
  {
    end: 5,
    suffix: ' semaines',
    label: 'de votre temps englouties chaque année, ni vu ni connu',
    color: '#FFB347',
  },
  {
    end: 49,
    suffix: ' €/mois',
    label: 'pour tout récupérer, et dormir tranquille',
    color: '#00D4AA',
  },
]

export function CostSection() {
  const ref = useRef<HTMLDivElement | null>(null)
  const figRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = el.dataset.delay ?? '0'
            setTimeout(() => el.classList.add('cost-visible'), parseInt(delay, 10))
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    figRefs.current.forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #0c0b18 100%)',
        padding: '96px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ maxWidth: 880, margin: '0 auto' }}>

        {/* Titre */}
        <div
          ref={ref}
          data-delay="0"
          className="cost-head"
          style={{ textAlign: 'center', marginBottom: 56 }}
        >
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#FF6B6B',
            marginBottom: 16,
          }}>
            Le vrai prix d&apos;Excel
          </p>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            maxWidth: 600,
            margin: '0 auto 18px',
          }}>
            « Gratuit » ? Faites le calcul.
          </h2>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 540,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Le tableur ne vous envoie pas de facture. Mais chaque semaine, il prélève
            son dû sur ce que vous avez de plus rare : votre temps.
          </p>
        </div>

        {/* Chiffres */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 40,
        }} className="cost-grid">
          {FIGURES.map((f, i) => (
            <div
              key={f.label}
              ref={(el) => { figRefs.current[i] = el }}
              data-delay={i * 100}
              className="cost-fig"
              style={{
                background: '#0c0b14',
                padding: '36px 24px',
                textAlign: 'center',
              }}
            >
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(28px, 4vw, 36px)',
                color: f.color,
                letterSpacing: '-0.02em',
                marginBottom: 10,
                lineHeight: 1,
              }}>
                <CountUp end={f.end} suffix={f.suffix} />
              </div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.5,
                maxWidth: 200,
                margin: '0 auto',
              }}>
                {f.label}
              </div>
            </div>
          ))}
        </div>

        {/* Punchline + CTA */}
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(18px, 2.5vw, 24px)',
            color: '#ffffff',
            letterSpacing: '-0.01em',
            lineHeight: 1.4,
            maxWidth: 620,
            margin: '0 auto 28px',
          }}>
            Le planning à la main ne vous coûte pas zéro. Il vous coûte vos
            soirées, et un risque juridique que vous ne voyez pas venir.
          </p>
          <Link
            href="/register"
            style={{
              display: 'inline-block',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: '#fff',
              textDecoration: 'none',
              padding: '14px 30px',
              background: '#6C63FF',
              borderRadius: 10,
              transition: 'background 200ms ease, transform 100ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#5a52e0'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#6C63FF'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Arrêter de perdre du temps
          </Link>
        </div>
      </div>

      <style>{`
        .cost-head, .cost-fig {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 550ms ease-out, transform 550ms ease-out;
        }
        .cost-visible {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .cost-head, .cost-fig { opacity: 1; transform: none; transition: none; }
        }
        @media (max-width: 600px) {
          .cost-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
