'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/public/reveal'
import { PlanningDemo } from '@/components/public/planning-demo'

const FONT = 'var(--font-manrope), sans-serif'

export function HeroSection() {
  return (
    <section style={{ position: 'relative', zIndex: 2 }}>
      <div className="qb-hero-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1.05fr 0.95fr',
        gap: 56,
        alignItems: 'center',
        maxWidth: 1200,
        margin: '0 auto',
        padding: '60px 32px 80px',
        fontFamily: FONT,
      }}>

        {/* ── Colonne gauche ─────────────────────────────────────── */}
        <Reveal>
          {/* Eyebrow pill teal */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 9,
            padding: '6px 14px',
            borderRadius: 999,
            background: 'rgba(0,212,170,0.08)',
            border: '1px solid rgba(0,212,170,0.22)',
            marginBottom: 28,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00D4AA', position: 'relative', display: 'inline-block' }}>
              <span className="qb-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#00D4AA' }} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#7fe9cf', letterSpacing: '0.01em' }}>
              Le planning intelligent qui pense à votre place
            </span>
          </div>

          {/* H1 */}
          <h1 style={{ fontWeight: 700, fontSize: 58, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 22px' }} className="qb-hero-h1">
            Vos plannings faits en{' '}
            <span style={{ position: 'relative', whiteSpace: 'nowrap', color: '#6C63FF' }}>
              10 minutes
              <svg width="100%" height="10" viewBox="0 0 300 10" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: -6 }} aria-hidden="true">
                <path d="M2 7 Q150 1 298 6" stroke="#00D4AA" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </span>
            .<br />Pas en 2 heures.
          </h1>

          {/* Sous-titre */}
          <p style={{ fontSize: 18, lineHeight: 1.6, color: '#a6a8b8', maxWidth: 460, margin: '0 0 32px' }}>
            Quartzbase génère le planning de votre équipe, vérifie la conformité au Code du travail et prévient vos salariés. Sans Excel.
          </p>

          {/* CTAs */}
          <div className="qb-hero-cta" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
            <Link
              href="/register"
              className="qb-cta-shine"
              style={{
                position: 'relative',
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: '#6C63FF',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '17px 30px',
                fontFamily: FONT,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                textDecoration: 'none',
                boxShadow: '0 10px 30px rgba(108,99,255,0.45)',
              }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>Créer mon premier planning</span>
              <span style={{ position: 'relative', zIndex: 1, display: 'flex' }}><ArrowRight size={18} strokeWidth={2.4} /></span>
            </Link>

            <Link
              href="#fonctionnalites"
              style={{
                background: 'transparent',
                color: '#f0f0f8',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 11,
                padding: '16px 24px',
                fontFamily: FONT,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'border-color 180ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(108,99,255,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
            >
              Voir une démo →
            </Link>
          </div>

          {/* Réassurance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 13.5, color: '#79828f', flexWrap: 'wrap' }}>
            <span>14 jours gratuits</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#5a5a72' }} />
            <span>Sans carte bancaire</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#5a5a72' }} />
            <span>Sans engagement</span>
          </div>
        </Reveal>

        {/* ── Colonne droite ─────────────────────────────────────── */}
        <Reveal className="qb-hero-card" style={{ position: 'relative' }}>
          <PlanningDemo />
        </Reveal>
      </div>

      <style>{`
        @keyframes qbPing { 0%{transform:scale(1);opacity:.6} 75%,100%{transform:scale(2.6);opacity:0} }
        .qb-ping { animation: qbPing 1.8s cubic-bezier(0,0,0.2,1) infinite; }
        @media (prefers-reduced-motion: reduce) { .qb-ping { animation: none; } }
        @media (max-width: 900px) {
          .qb-hero-grid { grid-template-columns: 1fr !important; gap: 64px !important; }
          .qb-hero-card { order: 2; margin: 0 auto; }
          .qb-hero-h1   { font-size: 40px !important; }
        }
      `}</style>
    </section>
  )
}
