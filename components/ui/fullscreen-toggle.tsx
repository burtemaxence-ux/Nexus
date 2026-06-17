'use client'

import { useEffect, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'

/** Plein écran (style Dhonu) — bascule document.fullscreen. */
export function FullscreenToggle() {
  const [fs, setFs] = useState(false)

  useEffect(() => {
    function onChange() { setFs(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggle() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen().catch(() => {})
  }

  return (
    <button
      onClick={toggle}
      aria-label={fs ? 'Quitter le plein écran' : 'Plein écran'}
      title={fs ? 'Quitter le plein écran' : 'Plein écran'}
      className="flex items-center justify-center h-9 w-9 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
    >
      {fs ? <Minimize className="h-[18px] w-[18px]" /> : <Maximize className="h-[18px] w-[18px]" />}
    </button>
  )
}
