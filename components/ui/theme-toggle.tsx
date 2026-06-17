'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

/**
 * Light/dark toggle for the authenticated app. Persists the choice in
 * `dp-theme` (read at first paint by the inline script in app/layout.tsx)
 * and flips the `.dark` class that drives the CSS variables + Tailwind
 * `dark:` variants. Default is dark when nothing is stored.
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    try {
      setIsDark(localStorage.getItem('dp-theme') !== 'light')
    } catch { /* ignore */ }
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    try { localStorage.setItem('dp-theme', next ? 'dark' : 'light') } catch { /* ignore */ }
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
      title={isDark ? 'Thème clair' : 'Thème sombre'}
      className="flex items-center justify-center h-9 w-9 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )
}
