'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Tarifs',          href: '#tarifs' },
  { label: 'Démo',            href: '#demo' },
  { label: 'FAQ',             href: '#faq' },
]

export function PublicNavbar() {
  const [scrolled, setScrolled]   = useState(false)
  const [drawerOpen, setDrawer]   = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Ferme le drawer sur resize desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setDrawer(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Bloque le scroll quand le drawer est ouvert
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
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: 'background 300ms ease, border-color 300ms ease',
          background: scrolled ? 'rgba(10,10,15,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        }}
      >
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>

          {/* Logo */}
          <Link
            href="/"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: '#6C63FF',
              textDecoration: 'none',
              letterSpacing: '-0.02em',
            }}
          >
            Quartzbase
          </Link>

          {/* Liens centrés — desktop uniquement */}
          <div style={{
            display: 'flex',
            gap: 32,
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }} className="nav-desktop-links">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.75)',
                  textDecoration: 'none',
                  transition: 'color 200ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#6C63FF')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
                onFocus={e => (e.currentTarget.style.textDecoration = 'underline')}
                onBlur={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions droite — desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="nav-desktop-links">
            <Link
              href="/login"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: 'rgba(255,255,255,0.75)',
                textDecoration: 'none',
                padding: '7px 16px',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                transition: 'border-color 200ms ease, color 200ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(108,99,255,0.5)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
              }}
              onFocus={e => (e.currentTarget.style.textDecoration = 'underline')}
              onBlur={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: '#fff',
                textDecoration: 'none',
                padding: '7px 16px',
                background: '#6C63FF',
                borderRadius: 8,
                transition: 'background 200ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#5a52e0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#6C63FF')}
              onFocus={e => (e.currentTarget.style.textDecoration = 'underline')}
              onBlur={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              Essai gratuit
            </Link>
          </div>

          {/* Hamburger — mobile */}
          <button
            className="nav-hamburger"
            aria-label={drawerOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            onClick={() => setDrawer(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              color: '#fff',
              display: 'none',
            }}
          >
            {drawerOpen ? (
              /* X icon */
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="4" x2="18" y2="18" />
                <line x1="18" y1="4" x2="4" y2="18" />
              </svg>
            ) : (
              /* Hamburger icon */
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="19" y2="6"  />
                <line x1="3" y1="11" x2="19" y2="11" />
                <line x1="3" y1="16" x2="19" y2="16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Overlay */}
      {drawerOpen && (
        <div
          aria-hidden="true"
          onClick={() => setDrawer(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 48,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)',
          }}
        />
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
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              color: 'rgba(255,255,255,0.8)',
              textDecoration: 'none',
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              transition: 'color 200ms ease',
            }}
            onFocus={e => (e.currentTarget.style.textDecoration = 'underline')}
            onBlur={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            {link.label}
          </Link>
        ))}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link
            href="/login"
            onClick={() => setDrawer(false)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              color: 'rgba(255,255,255,0.75)',
              textDecoration: 'none',
              padding: '12px 20px',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            onClick={() => setDrawer(false)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              fontWeight: 500,
              color: '#fff',
              textDecoration: 'none',
              padding: '12px 20px',
              background: '#6C63FF',
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            Essai gratuit
          </Link>
        </div>
      </div>

      {/* CSS responsive */}
      <style>{`
        @media (max-width: 767px) {
          .nav-desktop-links { display: none !important; }
          .nav-hamburger     { display: block !important; }
        }
      `}</style>
    </>
  )
}
