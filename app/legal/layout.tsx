import Link from 'next/link'
import type { ReactNode } from 'react'

const LEGAL_LINKS = [
  { href: '/legal/mentions-legales',  label: 'Mentions légales' },
  { href: '/legal/confidentialite',   label: 'Confidentialité' },
  { href: '/legal/cgu',               label: 'CGU' },
  { href: '/legal/cookies',           label: 'Cookies' },
]

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Top bar */}
      <header style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Nexus
          </Link>
          <nav className="flex items-center gap-4">
            {LEGAL_LINKS.map(l => (
              <Link key={l.href} href={l.href} className="text-[13px] transition-colors duration-150" style={{ color: 'var(--text-secondary)' }}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-6 py-8" style={{ borderTop: '0.5px solid var(--border)' }}>
        <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          © {new Date().getFullYear()} Quartz. Tous droits réservés. Nexus est propulsé par Quartz.
        </p>
      </footer>
    </div>
  )
}
