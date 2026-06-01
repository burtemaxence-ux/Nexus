'use client'

import { useState, useEffect } from 'react'

type Locale = 'fr' | 'en'

const FLAGS: Record<Locale, string> = { fr: '🇫🇷', en: '🇬🇧' }
const LABELS: Record<Locale, string> = { fr: 'FR', en: 'EN' }

export function LanguageSwitcher() {
  const [locale, setLocale] = useState<Locale>('fr')

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
    if (match && (match[1] === 'fr' || match[1] === 'en')) {
      setLocale(match[1] as Locale)
    }
  }, [])

  async function switchLocale(next: Locale) {
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    })
    setLocale(next)
    window.location.reload()
  }

  const next: Locale = locale === 'fr' ? 'en' : 'fr'

  return (
    <button
      onClick={() => switchLocale(next)}
      className="flex items-center gap-1 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors duration-150 px-1"
      title={`Switch to ${next === 'en' ? 'English' : 'Français'}`}
    >
      <span>{FLAGS[locale]}</span>
      <span className="font-medium">{LABELS[locale]}</span>
    </button>
  )
}
