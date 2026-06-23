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
  Gift,
} from 'lucide-react'

// Les ~12 écrans regroupés en 5 catégories pour réduire la charge cognitive.
const NAV_GROUPS = [
  {
    title: 'Établissement',
    items: [
      { label: 'Organisation',   href: '/manager/settings/organisation',   icon: Building2 },
      { label: 'Établissements', href: '/manager/settings/establishments', icon: Store },
      { label: 'Postes & rôles', href: '/manager/settings/postes',         icon: Layers },
    ],
  },
  {
    title: 'Planning & RH',
    items: [
      { label: 'Planning',          href: '/manager/settings/regles',   icon: CalendarDays },
      { label: 'Contrats & RH',     href: '/manager/settings/contrats', icon: FileText },
      { label: 'Congés & absences', href: '/manager/settings/conges',   icon: Umbrella },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Notifications', href: '/manager/settings/notifications', icon: Bell },
      { label: 'Intégrations',  href: '/manager/settings/integrations',  icon: Plug },
    ],
  },
  {
    title: 'Données & paie',
    items: [
      { label: 'Exports & paie',  href: '/manager/settings/exports', icon: Download },
      { label: 'Données & RGPD',  href: '/manager/settings/rgpd',    icon: ShieldCheck },
    ],
  },
  {
    title: 'Compte',
    items: [
      { label: 'Abonnement', href: '/manager/settings/billing', icon: CreditCard },
      { label: 'Parrainage', href: '/manager/settings/parrainage', icon: Gift },
    ],
  },
]

const NAV_FLAT = NAV_GROUPS.flatMap(g => g.items)

export default function SettingsSidebar() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Mobile: horizontal scroll nav (à plat) */}
      <div
        className="md:hidden sticky top-14 z-20"
        style={{ backgroundColor: 'var(--bg-card)', borderBottom: '0.5px solid var(--border)' }}
      >
        <div className="flex overflow-x-auto px-2 py-2 gap-1.5" style={{ scrollbarWidth: 'none' }}>
          {NAV_FLAT.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap transition-colors duration-150 flex-shrink-0"
                style={{
                  backgroundColor: active ? 'var(--accent-light)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  border: `0.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <Icon
                  className="h-3.5 w-3.5 flex-shrink-0"
                  style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}
                />
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Desktop: sidebar groupée */}
      <aside
        className="hidden md:flex w-[210px] shrink-0 flex-col py-5 sticky top-11 overflow-y-auto"
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

        <nav className="flex-1 px-2 space-y-4">
          {NAV_GROUPS.map(group => (
            <div key={group.title} className="space-y-0.5">
              <p
                className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.08em]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {group.title}
              </p>
              {group.items.map(({ label, href, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] transition-colors duration-150"
                    style={{
                      backgroundColor: active ? 'var(--accent-light)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon
                      className="h-[14px] w-[14px] shrink-0"
                      style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}
                    />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
