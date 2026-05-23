'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Layers,
  CalendarDays,
  FileText,
  Umbrella,
  Bell,
  Download,
  Plug,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Organisation',      href: '/manager/settings/organisation', icon: Building2 },
  { label: 'Postes & rôles',   href: '/manager/settings/postes',       icon: Layers },
  { label: 'Planning',          href: '/manager/settings/regles',       icon: CalendarDays },
  { label: 'Contrats & RH',    href: '/manager/settings/contrats',     icon: FileText },
  { label: 'Congés & absences', href: '/manager/settings/conges',      icon: Umbrella },
  { label: 'Notifications',     href: '/manager/settings/alertes',     icon: Bell },
  { label: 'Exports & paie',   href: '/manager/settings/exports',      icon: Download },
  { label: 'Intégrations',     href: '/manager/settings/integrations', icon: Plug },
]

export default function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-[210px] shrink-0 border-r border-gray-200 bg-white flex flex-col py-6 sticky top-0 overflow-y-auto"
      style={{ height: 'calc(100vh - 48px)' }}
    >
      <div className="px-4 mb-4">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
          Paramètres
        </span>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-[7px] rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              )}
            >
              <Icon
                className={cn(
                  'h-[15px] w-[15px] shrink-0',
                  isActive ? 'text-gray-800' : 'text-gray-400'
                )}
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
