'use client'

import { useEffect } from 'react'
import { captureError } from '@/lib/logger'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureError(error, { digest: error.digest })
  }, [error])

  return (
    <html lang="fr">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-950">
          <div className="flex flex-col items-center gap-6 max-w-md w-full text-center">
            <div className="w-12 h-12 rounded-xl bg-[#2D3A8C] flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Une erreur inattendue s&apos;est produite
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
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
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                Retour au dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
