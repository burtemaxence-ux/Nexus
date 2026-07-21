import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: '#0a0a0f' }}
    >
      {/* Gradients décoratifs — auth-bg-glow ajoute le pulse CSS */}
      <div
        className="auth-bg-glow fixed inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: [
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(108,99,255,0.15), transparent)',
            'radial-gradient(ellipse 60% 40% at 80% 110%, rgba(0,212,170,0.08), transparent)',
          ].join(', '),
        }}
      />

      {/* Particules flottantes — CSS-only, définies à l'étape 3 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <span className="auth-particle auth-particle-1" />
        <span className="auth-particle auth-particle-2" />
        <span className="auth-particle auth-particle-3" />
        <span className="auth-particle auth-particle-4" />
        <span className="auth-particle auth-particle-5" />
      </div>

      {/* Logo centré en haut */}
      <div className="relative z-10 mb-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={36} />
          <span
            className="text-[17px] font-semibold tracking-tight"
            style={{ color: '#f0f0f8', fontFamily: 'var(--font-manrope)' }}
          >
            Quartzbase
          </span>
        </Link>
      </div>

      {/* Contenu (card) */}
      <main className="relative z-10 w-full flex justify-center">
        {children}
      </main>

      {/* Lien retour discret */}
      <div className="relative z-10 mt-10">
        <Link href="/" className="auth-back-link">
          ← Retour au site
        </Link>
      </div>
    </div>
  )
}
