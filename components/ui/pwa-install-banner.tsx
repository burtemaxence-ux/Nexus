'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, X, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Already installed as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // User dismissed previously
    if (localStorage.getItem('pwa-dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !/crios|fxios/i.test(navigator.userAgent) &&
      !('standalone' in navigator && (navigator as { standalone?: boolean }).standalone)

    if (ios) {
      setIsIOS(true)
      const timer = setTimeout(() => setVisible(true), 2500)
      return () => clearTimeout(timer)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      deferredRef.current = e as BeforeInstallPromptEvent
      const timer = setTimeout(() => setVisible(true), 2500)
      return () => clearTimeout(timer)
    }
    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => setVisible(false), { once: true })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  async function install() {
    if (!deferredRef.current) return
    await deferredRef.current.prompt()
    const { outcome } = await deferredRef.current.userChoice
    if (outcome === 'accepted') setVisible(false)
    deferredRef.current = null
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-3 safe-area-bottom"
      style={{ backgroundColor: 'var(--bg-card)', borderTop: '0.5px solid var(--border)' }}
    >
      <div className="max-w-sm mx-auto">
        {isIOS ? (
          <div className="flex items-start gap-3">
            <div
              className="h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-light)' }}
            >
              <span className="text-base font-bold" style={{ color: 'var(--accent)' }}>N</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                Installer Quartzbase
              </p>
              <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Appuyez sur{' '}
                <Share className="inline h-3.5 w-3.5 align-text-bottom" />
                {' '}puis{' '}
                <strong>{"« Sur l'écran d'accueil »"}</strong>
              </p>
            </div>
            <button onClick={dismiss} className="flex-shrink-0 p-1" style={{ color: 'var(--text-tertiary)' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-light)' }}
            >
              <span className="text-base font-bold" style={{ color: 'var(--accent)' }}>N</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                Installer Quartzbase
              </p>
              <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                Accès rapide à votre planning
              </p>
            </div>
            <button
              onClick={install}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              <Download className="h-3.5 w-3.5" />
              Installer
            </button>
            <button onClick={dismiss} className="flex-shrink-0 p-1" style={{ color: 'var(--text-tertiary)' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
