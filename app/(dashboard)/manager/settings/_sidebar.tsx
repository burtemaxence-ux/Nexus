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
  Store,
  ShieldCheck,
  CreditCard,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Organisation',      href: '/manager/settings/organisation',   icon: Building2 },
  { label: 'Établissements',    href: '/manager/settings/establishments', icon: Store },
  { label: 'Postes & rôles',   href: '/manager/settings/postes',         icon: Layers },
  { label: 'Planning',          href: '/manager/settings/regles',         icon: CalendarDays },
  { label: 'Contrats & RH',    href: '/manager/settings/contrats',       icon: FileText },
  { label: 'Congés & absences', href: '/manager/settings/conges',        icon: Umbrella },
  { label: 'Notifications',     href: '/manager/settings/notifications', icon: Bell },
  { label: 'Exports & paie',   href: '/manager/settings/exports',        icon: Download },
  { label: 'Intégrations',     href: '/manager/settings/integrations',   icon: Plug },
  { label: 'Abonnement',        href: '/manager/settings/billing',        icon: CreditCard },
  { label: 'Données & RGPD',   href: '/manager/settings/rgpd',           icon: ShieldCheck },
]

export default function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile: horizontal scroll nav */}
      <div
        className="md:hidden sticky top-14 z-20"
        style={{ backgroundColor: 'var(--bg-card)', borderBottom: '0.5px solid var(--border)' }}
      >
        <div className="flex overflow-x-auto px-2 py-2 gap-1.5" style={{ scrollbarWidth: 'none' }}>
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap transition-colors duration-150 flex-shrink-0"
                style={{
                  backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  border: `0.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <Icon
                  className="h-3.5 w-3.5 flex-shrink-0"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}
                />
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Desktop: sidebar */}
      <aside
        className="hidden md:flex w-[200px] shrink-0 flex-col py-5 sticky top-11 overflow-y-auto"
        style={{
          height: 'calc(100vh - 44px)',
          backgroundColor: 'var(--bg-card)',
          borderRight: '0.5px solid var(--border)',
        }}
      >
        <div className="px-4 mb-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
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
                className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] transition-colors duration-150"
                style={{
                  backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Icon
                  className="h-[14px] w-[14px] shrink-0"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}
                />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
