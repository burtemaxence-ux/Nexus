'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const settingsNav = [
  { label: 'Postes', href: '/manager/settings/postes' },
  { label: 'Règles', href: '/manager/settings/regles' },
  { label: 'Alertes', href: '/manager/settings/alertes' },
  { label: 'Établissement', href: '/manager/settings/etablissement' },
]

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-full">
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 max-w-6xl mx-auto">
          <div className="flex items-center h-14">
            <h1 className="text-lg font-semibold text-foreground">Paramètres</h1>
          </div>
          <nav className="flex gap-1 -mb-px">
            {settingsNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
      <div className="px-6 py-8 max-w-6xl mx-auto">
        {children}
      </div>
    </div>
  )
}
