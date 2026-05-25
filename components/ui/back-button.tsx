'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-sm transition-colors duration-150"
      style={{ color: 'var(--text-secondary)' }}
    >
      <ArrowLeft className="h-4 w-4" />
      Retour
    </button>
  )
}
