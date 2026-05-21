'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

const MAIN_PAGES = ['/manager', '/employee']

export function TopNav() {
  const router = useRouter()
  const pathname = usePathname()

  const isMainPage = MAIN_PAGES.includes(pathname)

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 h-12 flex items-center">
      <div className="w-full max-w-7xl mx-auto flex items-center gap-3">
        {!isMainPage && (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="font-semibold text-gray-900 text-sm">D-pot</span>
      </div>
    </header>
  )
}
