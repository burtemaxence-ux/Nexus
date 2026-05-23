'use client'

import type { ElementType } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar, Users, BarChart3, Clock,
  Palmtree, AlertTriangle, Upload, FileText,
  Settings, ChevronLeft, ChevronRight, LogOut,
  UtensilsCrossed,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  icon: ElementType
  href: string
  badge?: number
  badgeColor?: 'orange' | 'red'
  comingSoon?: boolean
}

interface NavGroup {
  group: string
  items: NavItem[]
}

// ── Nav definition ────────────────────────────────────────────────────────────

function buildManagerNav(pendingLeavesCount: number): NavGroup[] {
  return [
    {
      group: 'Gestion',
      items: [
        { label: 'Planning',  icon: Calendar,  href: '/manager/planning' },
        { label: 'Employés',  icon: Users,     href: '/manager/employees' },
        { label: 'Rapport',   icon: BarChart3, href: '/manager/rapport' },
        { label: 'Présences', icon: Clock,     href: '/manager/presences' },
      ],
    },
    {
      group: 'Demandes',
      items: [
        {
          label: 'Congés',
          icon: Palmtree,
          href: '/manager/conges',
          badge: pendingLeavesCount,
          badgeColor: 'orange',
        },
        {
          label: 'Alertes',
          icon: AlertTriangle,
          href: '/manager/alertes',
          badgeColor: 'red',
        },
      ],
    },
    {
      group: 'Outils',
      items: [
        { label: 'Exports',   icon: Upload,   href: '/manager/settings/exports' },
        { label: 'Documents', icon: FileText, href: '#', comingSoon: true },
      ],
    },
    {
      group: 'Configuration',
      items: [
        { label: 'Paramètres', icon: Settings, href: '/manager/settings' },
      ],
    },
  ]
}

const employeeNav: NavGroup[] = [
  {
    group: 'Navigation',
    items: [
      { label: 'Mon planning', icon: Calendar,  href: '/employee/planning' },
      { label: 'Mes congés',   icon: Palmtree,  href: '/employee/conges' },
      { label: 'Badgeuse',     icon: Clock,     href: '/employee/badgeuse' },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function getEstablishmentInitials(name: string): string {
  if (!name) return 'E'
  const words = name.split(' ').filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function Badge({ count, color }: { count: number; color: 'orange' | 'red' }) {
  if (!count || count === 0) return null
  return (
    <span className={cn(
      'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none',
      count > 0 && 'animate-pulse',
      color === 'orange'
        ? 'bg-orange-500 text-white'
        : 'bg-red-500 text-white'
    )}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  role: 'manager' | 'employee'
  userName: string
  userEmail: string
  establishmentName: string
  orgLogoUrl?: string
  pendingLeavesCount?: number
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({
  role, userName, userEmail, establishmentName,
  orgLogoUrl, pendingLeavesCount = 0,
  collapsed, onToggle,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const navGroups = role === 'manager'
    ? buildManagerNav(pendingLeavesCount)
    : employeeNav

  function isActive(href: string) {
    if (href === '#') return false
    if (href === '/manager/settings') {
      return pathname.startsWith('/manager/settings') &&
        !pathname.startsWith('/manager/settings/exports')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex-shrink-0 relative z-20',
        collapsed ? 'w-16' : 'w-[220px]'
      )}
    >
      {/* ── Brand / Logo ─────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center h-14 border-b border-sidebar-border px-3 flex-shrink-0',
        collapsed ? 'justify-center' : 'gap-2.5'
      )}>
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#4F46E5] flex-shrink-0">
          <UtensilsCrossed className="h-3.5 w-3.5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-semibold text-sidebar-foreground-active text-sm leading-tight truncate">
              D-pot
            </p>
            <p className="text-[10px] text-sidebar-foreground/60 leading-tight">Gestion RH & Planning</p>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {navGroups.map((group, gi) => (
          <div key={gi} className={cn('mb-1', gi > 0 && 'mt-3')}>
            {/* Group label */}
            {!collapsed ? (
              <p className="px-3 mb-1 text-[9px] font-bold tracking-[0.12em] text-sidebar-foreground/40 uppercase">
                {group.group}
              </p>
            ) : (
              gi > 0 && <div className="mx-3 mb-2 border-t border-sidebar-border/40" />
            )}

            <ul className="space-y-0.5 px-1.5">
              {group.items.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                const disabled = item.comingSoon

                return (
                  <li key={item.href}>
                    {disabled ? (
                      /* Coming soon — not clickable */
                      <div
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm opacity-40 cursor-not-allowed select-none',
                          collapsed ? 'justify-center' : ''
                        )}
                        title={collapsed ? `${item.label} (bientôt)` : undefined}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0 text-sidebar-foreground" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate text-sidebar-foreground text-[13px]">{item.label}</span>
                            <span className="text-[9px] font-semibold text-sidebar-foreground/60 uppercase tracking-wide bg-sidebar-foreground/10 px-1.5 py-0.5 rounded">
                              Bientôt
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150 group',
                          collapsed ? 'justify-center' : '',
                          active
                            ? 'bg-[#4F46E5]/10 text-[#4F46E5] font-semibold'
                            : 'text-sidebar-foreground hover:bg-white/5 hover:text-sidebar-foreground-active'
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className={cn(
                          'h-4 w-4 flex-shrink-0 transition-colors',
                          active
                            ? 'text-[#4F46E5]'
                            : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground-active'
                        )} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge !== undefined && item.badgeColor && (
                              <Badge count={item.badge} color={item.badgeColor} />
                            )}
                          </>
                        )}
                        {/* Dot indicator on collapsed when badge > 0 */}
                        {collapsed && item.badge && item.badge > 0 ? (
                          <span className={cn(
                            'absolute top-1 right-1 h-2 w-2 rounded-full',
                            item.badgeColor === 'orange' ? 'bg-orange-500' : 'bg-red-500'
                          )} />
                        ) : null}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Bottom section ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-sidebar-border">

        {/* Establishment row */}
        <div className={cn(
          'flex items-center gap-2.5 px-3 py-3 border-b border-sidebar-border/50',
          collapsed ? 'justify-center' : ''
        )}>
          {orgLogoUrl ? (
            <div className="h-7 w-7 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-sidebar-border/30">
              <Image src={orgLogoUrl} alt={establishmentName} width={28} height={28} className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="h-7 w-7 rounded-lg bg-[#4F46E5]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-[#4F46E5]">
                {getEstablishmentInitials(establishmentName)}
              </span>
            </div>
          )}
          {!collapsed && (
            <p className="text-[12px] font-medium text-sidebar-foreground-active truncate leading-tight">
              {establishmentName}
            </p>
          )}
        </div>

        {/* User row */}
        <div className={cn(
          'flex items-center px-3 py-3 gap-2.5',
          collapsed ? 'justify-center' : ''
        )}>
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#4F46E5]/20 flex-shrink-0">
            <span className="text-[10px] font-bold text-[#4F46E5]">
              {getInitials(userName || userEmail)}
            </span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 overflow-hidden min-w-0">
                <p className="text-[12px] font-medium text-sidebar-foreground-active truncate leading-tight">
                  {userName || 'Utilisateur'}
                </p>
                <p className="text-[10px] text-sidebar-foreground/60 truncate leading-tight">{userEmail}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex-shrink-0 p-1.5 rounded-md text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Se déconnecter"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 text-sidebar-foreground/40 hover:text-sidebar-foreground-active hover:bg-white/5 transition-colors border-t border-sidebar-border/40"
          title={collapsed ? 'Déplier' : 'Replier'}
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : (
              <span className="flex items-center gap-1 text-[10px] font-medium tracking-wide">
                <ChevronLeft className="h-3 w-3" />
                Replier
              </span>
            )
          }
        </button>
      </div>
    </aside>
  )
}
