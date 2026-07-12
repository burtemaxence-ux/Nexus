'use client'

import type { ElementType, CSSProperties } from 'react'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getInitials, getEstablishmentInitials } from '@/lib/planning-utils'
import {
  Home, Calendar, Users, BarChart3, Clock, LineChart, Scale, Zap, BookOpen,
  Palmtree, AlertTriangle, Upload, CreditCard,
  Settings, ChevronLeft, ChevronRight, ChevronDown, LogOut,
  ShieldCheck, ChevronsUpDown, Plus, Check, ArrowLeftRight, Moon, Sun,
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
      group: 'Pilotage',
      items: [
        { label: 'Accueil',  icon: Home,     href: '/manager' },
        { label: 'Planning', icon: Calendar, href: '/manager/planning' },
        { label: 'Badgeuse', icon: Clock,    href: '/manager/presences' },
      ],
    },
    {
      group: 'Équipe & demandes',
      items: [
        { label: 'Employés',    icon: Users,          href: '/manager/employees' },
        {
          label: 'Congés',
          icon: Palmtree,
          href: '/manager/conges',
          badge: pendingLeavesCount,
          badgeColor: 'orange',
        },
        { label: 'Échanges',    icon: ArrowLeftRight, href: '/manager/echanges' },
        { label: 'Marketplace', icon: Zap,            href: '/manager/marketplace' },
      ],
    },
    {
      group: 'Conformité & analyse',
      items: [
        { label: 'Conformité',  icon: Scale,         href: '/manager/compliance' },
        { label: 'Alertes',     icon: AlertTriangle, href: '/manager/alertes', badgeColor: 'red' },
        { label: 'Rapport',     icon: BarChart3,     href: '/manager/rapport' },
        { label: 'Analytiques', icon: LineChart,     href: '/manager/analytics' },
        { label: 'Journal',     icon: ShieldCheck,   href: '/manager/audit-log' },
      ],
    },
    {
      group: 'Paramètres',
      items: [
        { label: 'Paramètres', icon: Settings,   href: '/manager/settings' },
        { label: 'Exports',    icon: Upload,     href: '/manager/settings/exports' },
        { label: 'Abonnement', icon: CreditCard, href: '/manager/settings/billing' },
        { label: 'Aide',       icon: BookOpen,   href: '/manager/help' },
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

// ── Establishment tile (purple gradient logo, or image when provided) ──────────

function EstTile({
  size, text, name, logoUrl,
}: { size: number; text: string; name: string; logoUrl?: string }) {
  if (logoUrl) {
    return (
      <div
        className="qb-esttile rounded-[10px] overflow-hidden flex-shrink-0 bg-white"
        style={{ width: size, height: size, border: '1px solid rgba(138,131,255,0.7)' }}
      >
        <Image src={logoUrl} alt={name} width={size} height={size} className="object-cover w-full h-full" />
      </div>
    )
  }
  return (
    <div
      className="qb-esttile flex items-center justify-center flex-shrink-0 rounded-[10px]"
      style={{
        width: size, height: size,
        background: 'linear-gradient(145deg,#8079ff,#6C63FF)',
        border: '1px solid rgba(138,131,255,0.7)',
        boxShadow: '0 4px 12px rgba(108,99,255,0.42), inset 0 1px 0 rgba(255,255,255,0.4)',
      }}
    >
      <span className={cn('font-extrabold text-white tracking-[0.02em]', text)}>
        {getEstablishmentInitials(name)}
      </span>
    </div>
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
  // Theme toggle lives in the footer (Nexus `.dark` mechanism, `dp-theme` key).
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('qb-sidebar-groups')
      if (raw) setOpenGroups(JSON.parse(raw))
      setIsDark(localStorage.getItem('dp-theme') !== 'light')
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

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    try { localStorage.setItem('dp-theme', next ? 'dark' : 'light') } catch { /* ignore */ }
    document.documentElement.classList.toggle('dark', next)
  }

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
    if (href === '/manager') return pathname === '/manager'
    if (href === '/manager/settings') {
      return pathname.startsWith('/manager/settings') &&
        !pathname.startsWith('/manager/settings/exports') &&
        !pathname.startsWith('/manager/settings/billing')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const canSwitch = establishments.length > 1
  const roleBadgeShow = role !== 'employee'
  const roleLabel = role === 'supervisor' ? 'Superviseur' : 'Manager'

  // Animated label — max-width/opacity collapse (matches prototype).
  const labelStyle: CSSProperties = {
    flex: '1 1 auto', minWidth: 0,
    marginLeft: collapsed ? 0 : 11,
    maxWidth: collapsed ? 0 : 170,
    opacity: collapsed ? 0 : 1,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    transition: 'opacity .2s ease, max-width .3s cubic-bezier(.4,0,.2,1), margin-left .3s cubic-bezier(.4,0,.2,1)',
    transitionDelay: collapsed ? '0s' : '.07s',
  }

  // Cascade index for staggered item entrance.
  let itemIndex = 0

  return (
    <aside
      className={cn(
        'qb-aside flex flex-col h-screen flex-shrink-0 relative z-20',
        collapsed && 'qb-aside--collapsed',
        collapsed ? 'w-16' : 'w-[248px]'
      )}
    >
      {/* ── Establishment switcher (top) ─────────────────────────────── */}
      <div className="p-3 flex-shrink-0">
        {collapsed ? (
          <button
            onClick={onToggle}
            className="qb-esttile-btn w-full flex items-center justify-center py-1.5 rounded-xl transition-colors hover:bg-[rgb(var(--sidebar-overlay)/0.05)]"
            title={establishmentName}
          >
            <EstTile size={34} text="text-[12px]" name={establishmentName} logoUrl={orgLogoUrl} />
          </button>
        ) : (
          <div className="relative" ref={switcherRef}>
            <button
              onClick={() => canSwitch && setSwitcherOpen(o => !o)}
              disabled={switching || !canSwitch}
              className={cn(
                'qb-switcher w-full flex items-center rounded-[14px]',
                canSwitch && 'qb-switcher--interactive',
                switching && 'opacity-60'
              )}
              style={{
                gap: 11, padding: '9px 10px',
                border: '1px solid rgb(var(--sidebar-overlay) / 0.09)',
                background: 'linear-gradient(180deg, rgb(var(--sidebar-overlay) / 0.07), rgb(var(--sidebar-overlay) / 0.02))',
                boxShadow: '0 2px 10px var(--sidebar-shadow), inset 0 1px 0 rgb(var(--sidebar-overlay) / 0.05)',
                cursor: canSwitch ? 'pointer' : 'default',
              }}
            >
              <EstTile size={36} text="text-[12px]" name={establishmentName} logoUrl={orgLogoUrl} />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] mb-0.5 text-[rgb(var(--sidebar-foreground)/0.6)]">
                  Espace
                </p>
                <p className="text-[13.5px] font-bold leading-[1.1] truncate text-[rgb(var(--sidebar-foreground-active))]">
                  {establishmentName}
                </p>
              </div>
              {canSwitch && (
                <span className="flex items-center justify-center flex-shrink-0 rounded-[7px] w-[22px] h-[22px] bg-[rgb(var(--sidebar-overlay)/0.06)]">
                  <ChevronsUpDown className="h-3.5 w-3.5 text-[rgb(var(--sidebar-foreground)/0.85)]" />
                </span>
              )}
            </button>

            {switcherOpen && canSwitch && (
              <div
                className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-50"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid rgb(var(--sidebar-border))',
                  boxShadow: '0 12px 32px var(--sidebar-shadow)',
                  animation: 'qbDropIn .18s ease',
                }}
              >
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-[rgb(var(--sidebar-foreground)/0.55)]">
                    Changer d&apos;établissement
                  </p>
                </div>
                {establishments.map(est => (
                  <button
                    key={est.id}
                    onClick={() => handleSwitch(est.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[rgb(var(--sidebar-overlay)/0.05)]"
                  >
                    <div className="h-6 w-6 rounded-md bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-[var(--accent)]">
                        {getEstablishmentInitials(est.name)}
                      </span>
                    </div>
                    <span className="flex-1 text-[13px] truncate text-[rgb(var(--sidebar-foreground-active))]">
                      {est.name}
                    </span>
                    {est.id === activeEstablishmentId && (
                      <Check className="h-3.5 w-3.5 text-[var(--accent)] flex-shrink-0" />
                    )}
                  </button>
                ))}
                {role === 'manager' && (
                  <>
                    <div className="mx-3 my-1" style={{ borderTop: '1px solid var(--sidebar-divider)' }} />
                    <Link
                      href="/manager/settings/establishments"
                      onClick={() => setSwitcherOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[rgb(var(--sidebar-overlay)/0.05)]"
                    >
                      <div className="h-6 w-6 rounded-md bg-[rgb(var(--sidebar-overlay)/0.06)] flex items-center justify-center flex-shrink-0">
                        <Plus className="h-3.5 w-3.5 text-[rgb(var(--sidebar-foreground)/0.7)]" />
                      </div>
                      <span className="text-[13px] text-[rgb(var(--sidebar-foreground)/0.8)]">
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
      <nav className="qb-scroll flex-1 overflow-y-auto px-2.5 pb-3">
        {navGroups.map((group, gi) => {
          const open = isGroupOpen(group.group)
          const groupOpen = collapsed || open
          return (
            <div key={group.group} className="mb-0.5">
              {/* Divider between groups when collapsed */}
              {collapsed && gi > 0 && (
                <div className="mx-3 my-2" style={{ borderTop: '1px solid var(--sidebar-divider)' }} />
              )}

              {/* Group header (expanded only) */}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.group)}
                  className="qb-group-header w-full flex items-center gap-2"
                  style={{ padding: '15px 10px 7px' }}
                >
                  <span
                    className="flex-shrink-0 rounded-[2px]"
                    style={{
                      width: 3, height: 11,
                      background: 'linear-gradient(180deg,#8079ff,#6C63FF)',
                      boxShadow: '0 0 6px rgba(108,99,255,0.5)',
                    }}
                  />
                  <span className="flex-1 text-left text-[10.5px] font-bold uppercase tracking-[0.11em]" style={{ color: 'inherit' }}>
                    {group.group}
                  </span>
                  <ChevronDown
                    className="h-3.5 w-3.5 flex-shrink-0"
                    style={{
                      transform: open ? 'none' : 'rotate(-90deg)',
                      transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
                    }}
                  />
                </button>
              )}

              {/* Items — animated grid-rows collapse */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: groupOpen ? '1fr' : '0fr',
                  transition: 'grid-template-rows .3s cubic-bezier(.4,0,.2,1)',
                }}
              >
                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                  <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href)
                      const Icon = item.icon
                      const count = item.badge ?? 0
                      const color = item.badgeColor
                      const delay = `${itemIndex++ * 32}ms`
                      const linkStyle: CSSProperties = {
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        animation: 'qbItemIn .5s cubic-bezier(.22,1,.36,1) backwards',
                        animationDelay: delay,
                      }

                      const inner = (
                        <>
                          <span className="qb-ico">
                            <Icon className="h-5 w-5" style={{ color: 'currentColor' }} />
                          </span>
                          <span style={labelStyle}>{item.label}</span>
                          {!collapsed && count > 0 && color && (
                            <span className={cn('qb-badge', color === 'red' ? 'qb-badge--red' : 'qb-badge--orange')}>
                              {count > 99 ? '99+' : count}
                            </span>
                          )}
                          {collapsed && count > 0 && color && (
                            <span className={cn('qb-dot', color === 'red' ? 'qb-dot--red' : 'qb-dot--orange')} />
                          )}
                        </>
                      )

                      if (item.comingSoon) {
                        return (
                          <li key={item.href}>
                            <div
                              className="qb-item opacity-40 cursor-not-allowed select-none"
                              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                              title={collapsed ? `${item.label} (bientôt)` : undefined}
                            >
                              <span className="qb-ico">
                                <Icon className="h-5 w-5" style={{ color: 'currentColor' }} />
                              </span>
                              <span style={labelStyle}>{item.label}</span>
                            </div>
                          </li>
                        )
                      }

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn('qb-item', active && 'qb-item--active')}
                            style={linkStyle}
                            title={collapsed ? item.label : undefined}
                          >
                            {inner}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* ── Bottom section ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 p-2" style={{ borderTop: '1px solid rgb(var(--sidebar-border))' }}>
        {/* User row */}
        <div
          className={cn('qb-user', !collapsed && 'qb-user--interactive')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12, padding: 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: collapsed ? 'transparent' : 'rgb(var(--sidebar-overlay) / 0.03)',
            border: collapsed ? '1px solid transparent' : '1px solid rgb(var(--sidebar-overlay) / 0.07)',
            boxShadow: collapsed ? 'none' : 'inset 0 1px 0 rgb(var(--sidebar-overlay) / 0.03)',
            cursor: 'pointer',
          }}
        >
          <div className="qb-avatar flex items-center justify-center flex-shrink-0" style={{ width: 34, height: 34 }}>
            <span className="text-[14px] font-bold tracking-[0.02em] text-[var(--accent)]">
              {getInitials(userName || userEmail)}
            </span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 overflow-hidden min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-[12.5px] font-medium leading-[1.2] truncate text-[rgb(var(--sidebar-foreground-active))]">
                    {userName || 'Utilisateur'}
                  </p>
                  {roleBadgeShow && (
                    <span
                      className="flex-shrink-0 text-[9px] font-bold leading-none text-white"
                      style={{
                        padding: '2px 7px', borderRadius: 9999, letterSpacing: '.02em',
                        background: 'linear-gradient(135deg,#8079ff,#6C63FF)',
                        boxShadow: '0 2px 7px rgba(108,99,255,0.45)',
                      }}
                    >
                      {roleLabel}
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] leading-[1.3] truncate text-[rgb(var(--sidebar-foreground)/0.7)]">
                  {userEmail}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="qb-logout flex-shrink-0 flex p-1.5 rounded-lg text-[rgb(var(--sidebar-foreground)/0.6)]"
                title="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Footer buttons — theme toggle + collapse */}
        <div
          style={{
            display: 'flex', gap: 6, marginTop: 6,
            flexDirection: collapsed ? 'column' : 'row',
          }}
        >
          <button
            onClick={toggleTheme}
            className="qb-foot-btn qb-theme flex-1 min-w-0"
            title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {isDark ? <Moon className="h-[15px] w-[15px]" /> : <Sun className="h-[15px] w-[15px]" />}
            {!collapsed && <span>{isDark ? 'Sombre' : 'Clair'}</span>}
          </button>

          <button
            onClick={onToggle}
            className="qb-foot-btn qb-collapse flex-1 min-w-0"
            title={collapsed ? 'Déplier' : 'Replier'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Replier</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}
