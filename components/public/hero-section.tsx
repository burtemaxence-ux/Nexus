'use client'

import Link from 'next/link'
import { PlanningDemo } from '@/components/public/planning-demo'

/* Hero — angle conformité (protection juridique) */
const HERO_TITLE = "Un planning qui vous protège des prud'hommes."

const HERO_SUBTITLE =
  `Repos, durées maximales, pauses… Quartzbase passe vos plannings au crible du Code du Travail et vous prévient avant la faute. Vous planifiez l'esprit léger. À partir de 49€/mois, sans engagement.`

const TRUST_BADGE = '30 jours gratuits · Sans carte bleue · Conforme Code du Travail'

export function HeroSection() {
  return (
    <section
      className="hero-section"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d0b1f 0%, #0a0a0f 55%, #0a0a0f 100%)',
        paddingTop: 101, /* navbar 64px + reassurance bar 37px */
      }}
    >
      {/* Glow violet en haut à gauche */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '-10%',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '80px 24px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 64,
        alignItems: 'center',
      }} className="hero-grid">

        {/* ── Colonne texte ───────────────────────────────────── */}
        <div>
          {/* Badge de confiance */}
          <div
            className="hero-animate hero-delay-3"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(108,99,255,0.12)',
              border: '1px solid rgba(108,99,255,0.25)',
              borderRadius: 100,
              padding: '6px 14px',
              marginBottom: 28,
            }}
          >
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '0.01em',
            }}>
              {TRUST_BADGE}
            </span>
          </div>

          {/* ② Titre — gradient animé */}
          <h1
            className="hero-animate hero-delay-0"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(32px, 4.5vw, 54px)',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              marginBottom: 24,
              background: 'linear-gradient(90deg, #ffffff 0%, #c4c0ff 20%, #6C63FF 42%, #00D4AA 62%, #c4c0ff 82%, #ffffff 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {HERO_TITLE}
          </h1>

          {/* Sous-titre */}
          <p
            className="hero-animate hero-delay-1"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 18,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.6)',
              marginBottom: 40,
              maxWidth: 480,
            }}
          >
            {HERO_SUBTITLE}
          </p>

          {/* CTAs */}
          <div
            className="hero-animate hero-delay-2"
            style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}
          >
            {/* ③ CTA — shimmer */}
            <Link
              href="/register"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                color: '#fff',
                textDecoration: 'none',
                padding: '13px 28px',
                background: '#6C63FF',
                borderRadius: 10,
                display: 'inline-block',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background 200ms ease, transform 100ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#5a52e0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#6C63FF')}
            >
              Essayer gratuitement 30 jours
              <span className="cta-shimmer" aria-hidden="true" style={{
                position: 'absolute',
                top: 0,
                left: '-80%',
                width: '60%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)',
                transform: 'skewX(-15deg)',
              }} />
            </Link>

            {/* CTA secondaire — démo live */}
            <a
              href="https://demo.quartzbase.fr"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                color: 'rgba(255,255,255,0.85)',
                textDecoration: 'none',
                padding: '13px 26px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'border-color 200ms ease, color 200ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(108,99,255,0.6)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M5 3.5l7 4.5-7 4.5v-9z" fill="currentColor" />
              </svg>
              Voir la démo
            </a>
          </div>
        </div>

        {/* ── Colonne mockup SVG — ① lévitation ───────────────── */}
        <div
          className="hero-mockup hero-animate hero-delay-1"
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <div className="mockup-float">
            <PlanningDemo />
          </div>
        </div>
      </div>

      {/* CSS animations + responsive */}
      <style>{`
        @keyframes hero-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ① Lévitation mockup */
        @keyframes hero-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        .mockup-float {
          animation: hero-float 3s ease-in-out infinite;
        }

        /* ② Gradient titre */
        @keyframes gradient-flow {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        h1.hero-animate {
          animation: hero-fade-up 600ms ease-out forwards, gradient-flow 5s linear 600ms infinite;
        }

        /* ③ Shimmer CTA */
        @keyframes cta-shimmer {
          0%   { left: -80%; }
          45%  { left: 150%; }
          100% { left: 150%; }
        }
        .cta-shimmer {
          animation: cta-shimmer 3.5s ease-in-out infinite;
        }

        .hero-animate {
          opacity: 0;
          animation: hero-fade-up 600ms ease-out forwards;
        }
        .hero-delay-0 { animation-delay: 0ms; }
        .hero-delay-1 { animation-delay: 150ms; }
        .hero-delay-2 { animation-delay: 300ms; }
        .hero-delay-3 { animation-delay: 450ms; }

        @media (prefers-reduced-motion: reduce) {
          .hero-animate { animation: none; opacity: 1; }
          h1.hero-animate { animation: none; opacity: 1; }
          .mockup-float { animation: none; }
          .cta-shimmer  { animation: none; }
        }

        @media (max-width: 767px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
            text-align: center;
          }
          .hero-mockup { order: 2; }
          .hero-section { padding-top: 64px !important; }
        }
      `}</style>
    </section>
  )
}
