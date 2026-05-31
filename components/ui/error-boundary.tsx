'use client'

import React from 'react'
import { captureError } from '@/lib/logger'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureError(error, { componentStack: errorInfo.componentStack ?? undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-main)] p-6">
          <div className="flex flex-col items-center gap-6 max-w-md w-full text-center">
            <div className="w-12 h-12 rounded-xl bg-[#2D3A8C] flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                Une erreur inattendue s&apos;est produite
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {process.env.NODE_ENV === 'development' && this.state.error
                  ? this.state.error.message
                  : 'Veuillez recharger la page. Si le problème persiste, contactez le support.'}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[#2D3A8C] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Recharger la page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
