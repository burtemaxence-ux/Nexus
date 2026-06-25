'use client'

import Link from 'next/link'
import { ArrowRight, Star, Clock } from 'lucide-react'
import { Reveal, useCountUp } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

export function CtaFinalSection() {
  const { ref, value } = useCountUp(96, { duration: 1300, fallback: 1400 })

  return (
    <section style={{ position: 'relative', zIndex: 2, maxWidth: 1080, margin: '120px auto 0', padding: '0 32px', fontFamily: FONT }}>
      <Reveal style={{ position: 'relative', padding: '20px 0' }}>
        <div className="qb-cta-grid" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 48, alignItems: 'center' }}>

          {/* Gauche : argument + CTA */}
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 38, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px' }}>
              Et si votre planning de la semaine prochaine était déjà prêt&nbsp;?
            </h2>
            <p style={{ fontSize: 17, color: '#c2c2d4', lineHeight: 1.6, margin: '0 0 30px', maxWidth: 440 }}>
              Le temps de lire cette page, vous auriez déjà fait votre premier planning. Lancez-vous, vous ajusterez en chemin.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
              <Link
                href="/register"
                className="qb-cta-shine"
                style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: 10, background: '#6C63FF', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 30px', fontFamily: FONT, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 26px rgba(108,99,255,0.5)' }}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>Démarrer l&apos;essai gratuit</span>
                <span style={{ position: 'relative', zIndex: 1, display: 'flex' }}><ArrowRight size={18} strokeWidth={2.4} /></span>
              </Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#9090a8' }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill="#FFB347" color="#FFB347" />
                ))}
              </div>
              <span>Recommandé par 1 200+ patrons</span>
            </div>
          </div>

          {/* Droite : compteur de temps gagné */}
          <div style={{ position: 'relative', overflow: 'hidden', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 30 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#79828f', marginBottom: 8 }}>
              Sur une année, vous récupérez
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
              <span ref={ref} style={{ fontWeight: 700, fontSize: 64, letterSpacing: '-0.03em', lineHeight: 1, background: 'linear-gradient(135deg,#fff,#b3aeff)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {value}
              </span>
              <span style={{ fontWeight: 700, fontSize: 30, color: '#b3aeff' }}>h</span>
            </div>
            <div style={{ fontSize: 14.5, color: '#c2c2d4', lineHeight: 1.5, marginBottom: 22 }}>
              de gestion en moins — l&apos;équivalent de <strong style={{ color: '#fff', fontWeight: 700 }}>plus de 2 semaines</strong> de travail rendues à votre métier.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#9090a8' }}>
              <span style={{ display: 'flex' }}><Clock size={16} color="#9090a8" strokeWidth={1.9} /></span>
              <span>Base&nbsp;: ~2h économisées chaque semaine</span>
            </div>
          </div>
        </div>
      </Reveal>

      <style>{`
        @media (max-width: 880px) {
          .qb-cta-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </section>
  )
}
