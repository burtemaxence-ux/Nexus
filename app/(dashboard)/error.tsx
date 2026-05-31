'use client'

import { useEffect } from 'react'
import { captureError } from '@/lib/logger'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureError(error, { digest: error.digest, zone: 'dashboard' })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="flex flex-col items-center gap-6 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-xl bg-[#2D3A8C] flex items-center justify-center">
          <span className="text-white font-bold text-lg">N</span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Une erreur inattendue s&apos;est produite
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {process.env.NODE_ENV === 'development'
              ? error.message
              : 'Veuillez réessayer. Si le problème persiste, contactez le support.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-[#2D3A8C] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Réessayer
          </button>
          <a
            href="/manager/planning"
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
          >
            Retour au planning
          </a>
        </div>
      </div>
    </div>
  )
}
