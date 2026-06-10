'use client'

import Link from 'next/link'

const LEGAL_LINKS = [
  { label: 'CGU',                href: '/legal/cgu' },
  { label: 'Confidentialité',    href: '/legal/confidentialite' },
  { label: 'Mentions légales',   href: '/legal/mentions-legales' },
  { label: 'Cookies',            href: '/legal/cookies' },
]

const USEFUL_LINKS = [
  { label: 'Se connecter',  href: '/login' },
  { label: 'Contact',       href: 'mailto:hello@quartzbase.fr' },
]

const LINK_STYLE: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: 'rgba(255,255,255,0.35)',
  textDecoration: 'none',
  transition: 'color 150ms ease',
  display: 'block',
  marginBottom: 10,
}

export function PublicFooter() {
  return (
    <footer
      style={{
        background: '#070710',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '56px 24px 32px',
      }}
    >
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        {/* Corps du footer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: 48,
          marginBottom: 48,
          alignItems: 'start',
        }} className="footer-grid">

          {/* Logo + tagline */}
          <div>
            <Link
              href="/"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: '#6C63FF',
                textDecoration: 'none',
                display: 'inline-block',
                marginBottom: 8,
              }}
            >
              Quartzbase
            </Link>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: 'rgba(255,255,255,0.3)',
              margin: 0,
              maxWidth: 220,
              lineHeight: 1.5,
            }}>
              {`Planning IA pour la restauration et l'artisanat.`}
            </p>
          </div>

          {/* Liens légaux */}
          <div>
            <p style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.25)',
              marginBottom: 16,
            }}>
              Légal
            </p>
            {LEGAL_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                style={LINK_STYLE}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Liens utiles */}
          <div>
            <p style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.25)',
              marginBottom: 16,
            }}>
              Liens utiles
            </p>
            {USEFUL_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                style={LINK_STYLE}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Séparateur */}
        <div style={{
          height: 1,
          background: 'rgba(255,255,255,0.05)',
          marginBottom: 24,
        }} />

        {/* Bas de footer */}
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          color: 'rgba(255,255,255,0.2)',
          textAlign: 'center',
          margin: 0,
          letterSpacing: '0.02em',
        }}>
          © 2026 Quartzbase · Fait en France 🇫🇷
        </p>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 32px !important;
          }
          .footer-grid > div:first-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </footer>
  )
}
