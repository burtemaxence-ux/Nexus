'use client'

import React from 'react'
import Link from 'next/link'

/* Remplacer HERO_TITLE par le titre validé */
const HERO_TITLE = 'Fini les dimanches soir à galérer sur le planning.'

const HERO_SUBTITLE =
  `Générez le planning de votre équipe en 2 minutes avec l'IA. Jusqu'à 4 fois moins cher, conforme Code du Travail.`

const TRUST_BADGE = '14 jours gratuits · Sans carte bleue · Conforme Code du Travail'

export function HeroSection() {
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d0b1f 0%, #0a0a0f 55%, #0a0a0f 100%)',
        paddingTop: 64, /* hauteur navbar */
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
              Essai gratuit — 14 jours
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
          </div>
        </div>

        {/* ── Colonne mockup SVG — ① lévitation ───────────────── */}
        <div
          className="hero-mockup hero-animate hero-delay-1"
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <div className="mockup-float">
            <PlanningMockup />
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
        }
      `}</style>
    </section>
  )
}

/* ── Mockup planning réaliste — boulangerie ────────────────────────────── */
const MOCK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
const MOCK_ROWS = [
  { name: 'Sophie',  role: 'Boulanger', hours: '6h–14h',  color: '#6C63FF', days: [1, 1, 1, 0, 1] },
  { name: 'Lucas',   role: 'Vendeur',   hours: '14h–22h', color: '#00D4AA', days: [1, 0, 1, 1, 1] },
  { name: 'Camille', role: 'Pâtissier', hours: '6h–14h',  color: '#FFB347', days: [1, 1, 0, 1, 1] },
  { name: 'Marc',    role: 'Vendeur',   hours: '10h–18h', color: '#FF8C42', days: [0, 1, 1, 1, 1] },
]

function PlanningMockup() {
  const font = "'DM Sans', sans-serif"
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 20,
      maxWidth: 460,
      width: '100%',
    }}>
      {/* Barre de titre simulée */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B6B' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFB347' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00D4AA' }} />
        <span style={{ fontFamily: font, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
          Planning — Semaine 24
        </span>
      </div>

      {/* Grille planning */}
      <div style={{ display: 'grid', gridTemplateColumns: '88px repeat(5, 1fr)', gap: 5 }}>
        <div />
        {MOCK_DAYS.map(day => (
          <div key={day} style={{ fontFamily: font, fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center', paddingBottom: 4 }}>
            {day}
          </div>
        ))}

        {MOCK_ROWS.map(row => (
          <React.Fragment key={row.name}>
            <div style={{ paddingRight: 6, alignSelf: 'center' }}>
              <div style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>{row.name}</div>
              <div style={{ fontFamily: font, fontSize: 9, color: 'rgba(255,255,255,0.32)' }}>{row.role}</div>
            </div>
            {row.days.map((worked, di) => worked ? (
              <div key={di} style={{
                background: row.color,
                opacity: 0.9,
                borderRadius: 6,
                padding: '7px 2px',
                textAlign: 'center',
              }}>
                <span style={{ fontFamily: font, fontSize: 8.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
                  {row.hours}
                </span>
              </div>
            ) : (
              <div key={di} style={{ border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 6 }} />
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* Badge conformité */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <span style={{
          fontFamily: font, fontSize: 10.5, fontWeight: 600, color: '#00D4AA',
          background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)',
          borderRadius: 100, padding: '4px 12px',
        }}>
          ✓ Conforme Code du Travail
        </span>
      </div>
    </div>
  )
}
