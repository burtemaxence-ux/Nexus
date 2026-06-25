'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const FONT = 'var(--font-manrope), sans-serif'

const NAV_LINKS: { label: string; href: string }[] = [
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Tarifs',          href: '#tarifs' },
  { label: 'Connexion',       href: '/login' },
]

/* Logo « Q » — carré dégradé violet→teal + wordmark */
function Wordmark() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: 'linear-gradient(135deg,#6C63FF,#00D4AA)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 16,
        color: '#0b0b12',
      }}>Q</span>
      <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', color: '#f0f0f8' }}>
        Quartzbase
      </span>
    </span>
  )
}

export function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawer] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setDrawer(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <>
      <nav
        role="navigation"
        aria-label="Navigation principale"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          transition: 'background 250ms ease, border-color 250ms ease, backdrop-filter 250ms ease',
          background: scrolled ? 'rgba(11,11,18,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 1200,
          margin: '0 auto',
          padding: '18px 32px',
        }}>
          <Link href="/" aria-label="Quartzbase — accueil" style={{ textDecoration: 'none', fontFamily: FONT }}>
            <Wordmark />
          </Link>

          {/* Liens — desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="nav-desktop-links">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="qb-navlink"
                style={{
                  fontFamily: FONT,
                  fontSize: 14,
                  color: '#9090a8',
                  textDecoration: 'none',
                  transition: 'color 180ms ease',
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/register"
              style={{
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                textDecoration: 'none',
                background: '#6C63FF',
                border: 'none',
                borderRadius: 9,
                padding: '10px 18px',
                boxShadow: '0 2px 12px rgba(108,99,255,0.35)',
                transition: 'transform 180ms ease, box-shadow 180ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(108,99,255,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(108,99,255,0.35)' }}
            >
              Démarrer l&apos;essai gratuit
            </Link>
          </div>

          {/* Hamburger — mobile */}
          <button
            className="nav-hamburger"
            aria-label={drawerOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            onClick={() => setDrawer(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#fff', display: 'none' }}
          >
            {drawerOpen ? (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="4" x2="18" y2="18" /><line x1="18" y1="4" x2="4" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="19" y2="6" /><line x1="3" y1="11" x2="19" y2="11" /><line x1="3" y1="16" x2="19" y2="16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Overlay */}
      {drawerOpen && (
        <div aria-hidden="true" onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
      )}

      {/* Drawer mobile */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-label="Menu mobile"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 280,
          zIndex: 49,
          background: '#0f0f18',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease',
          display: 'flex',
          flexDirection: 'column',
          padding: '80px 32px 32px',
          gap: 8,
        }}
      >
        {NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setDrawer(false)}
            style={{ fontFamily: FONT, fontSize: 16, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/register"
          onClick={() => setDrawer(false)}
          style={{ marginTop: 24, fontFamily: FONT, fontSize: 15, fontWeight: 600, color: '#fff', textDecoration: 'none', padding: '14px 20px', background: '#6C63FF', borderRadius: 10, textAlign: 'center', boxShadow: '0 2px 12px rgba(108,99,255,0.35)' }}
        >
          Démarrer l&apos;essai gratuit
        </Link>
      </div>

      <style>{`
        .qb-navlink:hover { color: #f0f0f8 !important; }
        @media (max-width: 767px) {
          .nav-desktop-links { display: none !important; }
          .nav-hamburger     { display: block !important; }
        }
      `}</style>
    </>
  )
}
