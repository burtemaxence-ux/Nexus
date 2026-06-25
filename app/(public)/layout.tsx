import { PublicNavbar } from '@/components/public/navbar'
import { PublicFooter } from '@/components/public/footer'
import { LandingStyles } from '@/components/public/landing-styles'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#0b0b12',
        color: '#f0f0f8',
        fontFamily: 'var(--font-manrope), sans-serif',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      {/* Décor ambiant (clipé ici, pas sur le wrapper, pour préserver la nav sticky) */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)',
          backgroundSize: '42px 42px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%,#000,transparent 70%)',
          maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%,#000,transparent 70%)',
          opacity: 0.5,
        }} />
        <div className="qb-glow" style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, background: 'radial-gradient(ellipse at center,rgba(108,99,255,0.18),transparent 65%)', animationDuration: '7s' }} />
        <div className="qb-glow" style={{ position: 'absolute', top: 120, right: -150, width: 500, height: 500, background: 'radial-gradient(ellipse at center,rgba(0,212,170,0.10),transparent 65%)', animationDuration: '9s' }} />
      </div>

      <PublicNavbar />
      <main style={{ position: 'relative', zIndex: 2 }}>{children}</main>
      <PublicFooter />

      <LandingStyles />
    </div>
  )
}
