import type { ReactNode, CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

/** Conteneur de page : largeur + respiration sous la nav sticky. */
export function PageWrap({ children, maxWidth = 1000 }: { children: ReactNode; maxWidth?: number }) {
  return (
    <div style={{ position: 'relative', zIndex: 2, maxWidth, margin: '0 auto', padding: '64px 32px 0', fontFamily: FONT }}>
      {children}
      <style>{`@media (max-width: 640px){ .qb-page-h1{ font-size: 34px !important; } }`}</style>
    </div>
  )
}

/** En-tête de page : eyebrow + H1 + intro, centré. */
export function PageHeader({
  eyebrow,
  eyebrowColor = '#6C63FF',
  title,
  intro,
}: {
  eyebrow: string
  eyebrowColor?: string
  title: ReactNode
  intro?: ReactNode
}) {
  return (
    <Reveal style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 56px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: eyebrowColor, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
        {eyebrow}
      </div>
      <h1 className="qb-page-h1" style={{ fontWeight: 700, fontSize: 46, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 18px' }}>
        {title}
      </h1>
      {intro && (
        <p style={{ fontSize: 18, color: '#a6a8b8', lineHeight: 1.6, margin: '0 auto', maxWidth: 580 }}>{intro}</p>
      )}
    </Reveal>
  )
}

/** Bloc de section avec titre optionnel à gauche. */
export function Section({ title, children, style }: { title?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <Reveal style={{ margin: '64px 0 0', ...style }}>
      {title && (
        <h2 style={{ fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 22px' }}>{title}</h2>
      )}
      {children}
    </Reveal>
  )
}

/** Grille responsive de cartes. */
export function CardGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={`qb-card-grid qb-card-grid-${cols}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 18 }}>
      {children}
      <style>{`
        @media (max-width: 880px) { .qb-card-grid-3 { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 640px) { .qb-card-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}

/** Carte d'information (icône optionnelle + titre + corps). */
export function InfoCard({
  icon,
  accent = '#6C63FF',
  title,
  children,
}: {
  icon?: ReactNode
  accent?: string
  title: ReactNode
  children: ReactNode
}) {
  return (
    <Reveal style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '26px 24px', height: '100%', boxSizing: 'border-box' }}>
      {icon && (
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          {icon}
        </div>
      )}
      <h3 style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', margin: '0 0 8px', color: '#f0f0f8' }}>{title}</h3>
      <div style={{ fontSize: 14.5, color: '#a6a8b8', lineHeight: 1.6 }}>{children}</div>
    </Reveal>
  )
}

/** Placeholder éditorial pour les pages à compléter. */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div style={{ border: '1px dashed rgba(255,255,255,0.14)', borderRadius: 14, padding: '22px 24px', color: '#79828f', fontSize: 14.5, lineHeight: 1.6, background: 'rgba(255,255,255,0.015)' }}>
      {children}
    </div>
  )
}

/** Bloc CTA de conversion, réutilisé en bas des pages de contenu. */
export function FinalCta({
  title = 'Prêt à récupérer vos soirées ?',
  text = 'Créez votre premier planning conforme en 10 minutes. 30 jours gratuits, sans carte bancaire.',
}: {
  title?: string
  text?: string
}) {
  return (
    <Reveal style={{ margin: '88px 0 0', textAlign: 'center', background: 'linear-gradient(180deg,rgba(108,99,255,0.08),rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '48px 32px' }}>
      <h2 style={{ fontWeight: 700, fontSize: 30, letterSpacing: '-0.025em', lineHeight: 1.15, margin: '0 0 12px' }}>{title}</h2>
      <p style={{ fontSize: 16, color: '#a6a8b8', lineHeight: 1.6, margin: '0 auto 28px', maxWidth: 460 }}>{text}</p>
      <Link
        href="/register"
        className="qb-cta-shine"
        style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: 10, background: '#6C63FF', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 30px', fontFamily: FONT, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 26px rgba(108,99,255,0.5)' }}
      >
        <span style={{ position: 'relative', zIndex: 1 }}>Démarrer l&apos;essai gratuit</span>
        <span style={{ position: 'relative', zIndex: 1, display: 'flex' }}><ArrowRight size={18} strokeWidth={2.4} /></span>
      </Link>
    </Reveal>
  )
}

/** Liste de points avec puce colorée. */
export function CheckList({ items, accent = '#00D4AA' }: { items: ReactNode[]; accent?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: '50%', background: `${accent}1f`, color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, marginTop: 1 }}>✓</span>
          <span style={{ fontSize: 15, color: '#cfcfe0', lineHeight: 1.6 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}
