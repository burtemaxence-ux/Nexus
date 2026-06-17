'use client'

import type { ElementType } from 'react'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getInitials, getEstablishmentInitials } from '@/lib/planning-utils'
import {
  Calendar, Users, BarChart3, Clock, LineChart, Scale, Zap, BookOpen,
  Palmtree, AlertTriangle, Upload, FileText, CreditCard,
  Settings, ChevronLeft, ChevronRight, ChevronDown, LogOut,
  ShieldCheck, ChevronsUpDown, Plus, Check, ArrowLeftRight,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface EstablishmentEntry {
  id: string
  name: string
}

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
        { label: 'Planning',     icon: Calendar,   href: '/manager/planning' },
        { label: 'Employés',     icon: Users,      href: '/manager/employees' },
        { label: 'Rapport',      icon: BarChart3,  href: '/manager/rapport' },
        { label: 'Analytiques',  icon: LineChart,  href: '/manager/analytics' },
        { label: 'Badgeuse',     icon: Clock,      href: '/manager/presences' },
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
          label: 'Échanges',
          icon: ArrowLeftRight,
          href: '/manager/echanges',
        },
        {
          label: 'Marketplace',
          icon: Zap,
          href: '/manager/marketplace',
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
        { label: 'Conformité', icon: Scale,        href: '/manager/compliance' },
        { label: 'Exports',    icon: Upload,       href: '/manager/settings/exports' },
        { label: 'Journal',    icon: ShieldCheck,  href: '/manager/audit-log' },
        { label: 'Documents',  icon: FileText,      href: '#', comingSoon: true },
      ],
    },
    {
      group: 'Configuration',
      items: [
        { label: 'Abonnement', icon: CreditCard, href: '/manager/settings/billing' },
        { label: 'Paramètres', icon: Settings,  href: '/manager/settings' },
        { label: 'Aide',       icon: BookOpen,  href: '/manager/help' },
      ],
    },
  ]
}

const employeeNav: NavGroup[] = [
  {
    group: 'Navigation',
    items: [
      { label: 'Mon planning', icon: Calendar,      href: '/employee/planning' },
      { label: 'Mes congés',   icon: Palmtree,      href: '/employee/conges' },
      { label: 'Badgeuse',     icon: Clock,         href: '/employee/badgeuse' },
      { label: 'Marketplace',  icon: Zap,           href: '/employee/marketplace' },
    ],
  },
]

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
  role: 'manager' | 'employee' | 'supervisor'
  userName: string
  userEmail: string
  establishmentName: string
  orgLogoUrl?: string
  pendingLeavesCount?: number
  establishments?: EstablishmentEntry[]
  activeEstablishmentId?: string
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({
  role, userName, userEmail, establishmentName,
  orgLogoUrl, pendingLeavesCount = 0,
  establishments = [], activeEstablishmentId = '',
  collapsed, onToggle,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)
  // Collapsible groups — default open; persisted across sessions.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem('qb-sidebar-groups')
      if (raw) setOpenGroups(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  function toggleGroup(name: string) {
    setOpenGroups(prev => {
      const next = { ...prev, [name]: prev[name] === false ? true : false }
      try { localStorage.setItem('qb-sidebar-groups', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }
  const isGroupOpen = (name: string) => openGroups[name] !== false

  async function handleSwitch(id: string) {
    if (id === activeEstablishmentId || switching) return
    setSwitching(true)
    setSwitcherOpen(false)
    try {
      await fetch('/api/establishments/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establishment_id: id }),
      })
      router.refresh()
    } finally {
      setSwitching(false)
    }
  }

  const navGroups = (role === 'manager' || role === 'supervisor')
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

  const canSwitch = establishments.length > 1

  // Establishment avatar (logo or initials) — reused in pill & collapsed rail.
  const orgAvatar = (size: number, text: string) => (
    orgLogoUrl ? (
      <div className="rounded-lg overflow-hidden flex-shrink-0 bg-white border border-white/10" style={{ width: size, height: size }}>
        <Image src={orgLogoUrl} alt={establishmentName} width={size} height={size} className="object-cover w-full h-full" />
      </div>
    ) : (
      <div className="rounded-lg bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
        <span className={cn('font-bold text-[var(--accent)]', text)}>{getEstablishmentInitials(establishmentName)}</span>
      </div>
    )
  )

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex-shrink-0 relative z-20',
        collapsed ? 'w-16' : 'w-[248px]'
      )}
    >
      {/* ── Establishment switcher (pill, top) ───────────────────────── */}
      <div className="p-3 flex-shrink-0">
        {collapsed ? (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center py-1.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
            title={establishmentName}
          >
            {orgAvatar(30, 'text-[11px]')}
          </button>
        ) : (
          <div className="relative" ref={switcherRef}>
            <button
              onClick={() => canSwitch && setSwitcherOpen(o => !o)}
              disabled={switching || !canSwitch}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.07] bg-black/[0.02] dark:bg-white/[0.05] transition-colors',
                canSwitch && 'hover:bg-black/[0.04] dark:hover:bg-white/[0.09] cursor-pointer',
                switching && 'opacity-60'
              )}
            >
              {orgAvatar(30, 'text-[11px]')}
              <span className="flex-1 text-left text-[13.5px] font-semibold text-sidebar-foreground-active truncate leading-tight">
                {establishmentName}
              </span>
              {canSwitch && <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/40 flex-shrink-0" />}
            </button>

            {switcherOpen && canSwitch && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[var(--bg-elevated)] border border-sidebar-border rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[9px] font-bold tracking-[0.12em] text-sidebar-foreground/40 uppercase">
                    Changer d&apos;établissement
                  </p>
                </div>
                {establishments.map(est => (
                  <button
                    key={est.id}
                    onClick={() => handleSwitch(est.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="h-6 w-6 rounded-md bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-[var(--accent)]">
                        {getEstablishmentInitials(est.name)}
                      </span>
                    </div>
                    <span className="flex-1 text-[13px] text-sidebar-foreground-active truncate">
                      {est.name}
                    </span>
                    {est.id === activeEstablishmentId && (
                      <Check className="h-3.5 w-3.5 text-[var(--accent)] flex-shrink-0" />
                    )}
                  </button>
                ))}
                {role === 'manager' && (
                  <>
                    <div className="mx-3 my-1 border-t border-sidebar-border/50" />
                    <Link
                      href="/manager/settings/establishments"
                      onClick={() => setSwitcherOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="h-6 w-6 rounded-md bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <Plus className="h-3.5 w-3.5 text-sidebar-foreground/60" />
                      </div>
                      <span className="text-[13px] text-sidebar-foreground/70">
                        Gérer les établissements
                      </span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-3 scrollbar-thin">
        {navGroups.map((group, gi) => {
          const open = isGroupOpen(group.group)
          return (
            <div key={gi} className="mb-0.5">
              {/* Group header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.group)}
                  className="group/gh w-full flex items-center gap-1.5 px-3 pt-3.5 pb-1.5"
                >
                  <span className="flex-1 text-left text-[10.5px] font-semibold tracking-[0.1em] text-sidebar-foreground/45 uppercase group-hover/gh:text-sidebar-foreground/70 transition-colors">
                    {group.group}
                  </span>
                  <ChevronDown className={cn(
                    'h-3.5 w-3.5 text-sidebar-foreground/35 transition-transform duration-200',
                    !open && '-rotate-90'
                  )} />
                </button>
              ) : (
                gi > 0 && <div className="mx-3 my-2 border-t border-sidebar-border/50" />
              )}

              {/* Items */}
              {(collapsed || open) && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    const disabled = item.comingSoon

                    return (
                      <li key={item.href}>
                        {disabled ? (
                          <div
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-xl text-[14px] opacity-40 cursor-not-allowed select-none',
                              collapsed ? 'justify-center' : ''
                            )}
                            title={collapsed ? `${item.label} (bientôt)` : undefined}
                          >
                            <Icon className="h-[18px] w-[18px] flex-shrink-0 text-sidebar-foreground" />
                            {!collapsed && (
                              <>
                                <span className="flex-1 truncate text-sidebar-foreground">{item.label}</span>
                                <span className="text-[9px] font-semibold text-sidebar-foreground/60 uppercase tracking-wide bg-black/[0.05] dark:bg-white/[0.06] px-1.5 py-0.5 rounded">
                                  Bientôt
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <Link
                            href={item.href}
                            className={cn(
                              'relative flex items-center gap-3 px-3 py-2 rounded-xl text-[14px] transition-all duration-150 group',
                              collapsed ? 'justify-center' : '',
                              active
                                ? 'bg-[var(--accent-light)] text-[var(--accent)] font-medium'
                                : 'text-sidebar-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-sidebar-foreground-active'
                            )}
                            title={collapsed ? item.label : undefined}
                          >
                            <Icon className={cn(
                              'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                              active
                                ? 'text-[var(--accent)]'
                                : 'text-sidebar-foreground/65 group-hover:text-sidebar-foreground-active'
                            )} />
                            {!collapsed && (
                              <>
                                <span className="flex-1 truncate">{item.label}</span>
                                {item.badge !== undefined && item.badgeColor && (
                                  <Badge count={item.badge} color={item.badgeColor} />
                                )}
                              </>
                            )}
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
              )}
            </div>
          )
        })}
      </nav>

      {/* ── Bottom section ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-sidebar-border p-2">
        {/* User row */}
        <div className={cn(
          'flex items-center rounded-xl gap-2.5 px-2 py-2',
          collapsed ? 'justify-center' : ''
        )}>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-light)] flex-shrink-0">
            <span className="text-[11px] font-bold text-[var(--accent)]">
              {getInitials(userName || userEmail)}
            </span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 overflow-hidden min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-[12.5px] font-medium text-sidebar-foreground-active truncate leading-tight">
                    {userName || 'Utilisateur'}
                  </p>
                  {role !== 'employee' && (
                    <span className={cn(
                      'shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none',
                      role === 'manager'
                        ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                        : 'bg-amber-500/20 text-amber-500'
                    )}>
                      {role === 'manager' ? 'Manager' : 'Superviseur'}
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-sidebar-foreground/55 truncate leading-tight">{userEmail}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex-shrink-0 p-1.5 rounded-lg text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="mt-1 w-full flex items-center justify-center py-2 rounded-xl text-sidebar-foreground/40 hover:text-sidebar-foreground-active hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
          title={collapsed ? 'Déplier' : 'Replier'}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : (
              <span className="flex items-center gap-1 text-[11px] font-medium tracking-wide">
                <ChevronLeft className="h-3.5 w-3.5" />
                Replier
              </span>
            )
          }
        </button>
      </div>
    </aside>
  )
}
