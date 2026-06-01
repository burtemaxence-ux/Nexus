'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getInitials, getEstablishmentInitials } from '@/lib/planning-utils'
import {
  LogOut, Sun, Moon, ChevronsUpDown, Check, Plus,
} from 'lucide-react'
import { NotificationsBell } from './notifications-bell'
import { LanguageSwitcher } from './language-switcher'
import { useTranslations } from 'next-intl'

// ── Types ────────────────────────────────────────────────────────────────

interface EstablishmentEntry {
  id: string
  name: string
}

interface NavItem {
  label: string
  href: string
  badge?: number
}

// ── Nav definitions ──────────────────────────────────────────────────────────────

function buildManagerNav(pendingLeavesCount: number, alertsCount: number, t: ReturnType<typeof useTranslations<'nav'>>): NavItem[] {
  return [
    { label: t('planning'),    href: '/manager/planning' },
    { label: t('employees'),   href: '/manager/employees' },
    { label: t('report'),      href: '/manager/rapport' },
    { label: t('analytics'),   href: '/manager/analytics' },
    { label: t('compliance'),  href: '/manager/compliance' },
    { label: t('leaves'),      href: '/manager/conges',  badge: pendingLeavesCount },
    { label: t('exchanges'),   href: '/manager/echanges' },
    { label: t('marketplace'), href: '/manager/marketplace' },
    { label: t('alerts'),      href: '/manager/alertes', badge: alertsCount },
    { label: t('attendance'),  href: '/manager/presences' },
    { label: t('settings'),    href: '/manager/settings' },
    { label: t('help'),        href: '/manager/help' },
  ]
}

function buildEmployeeNav(t: ReturnType<typeof useTranslations<'nav'>>): NavItem[] {
  return [
    { label: t('my_planning'), href: '/employee/planning' },
    { label: t('my_leaves'),   href: '/employee/conges' },
    { label: t('attendance'),  href: '/employee/badgeuse' },
    { label: t('exchanges'),   href: '/employee/echanges' },
    { label: t('marketplace'), href: '/employee/marketplace' },
  ]
}

// ── Dark mode toggle ──────────────────────────────────────────────────────────────

function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('dp-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('dp-theme', 'light')
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-light)] transition-colors duration-150"
      title={dark ? 'Mode clair' : 'Mode sombre'}
    >
      {dark
        ? <Sun className="h-3.5 w-3.5" />
        : <Moon className="h-3.5 w-3.5" />
      }
    </button>
  )
}

// ── Nav link ────────────────────────────────────────────────────────────────

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex items-center gap-1.5 h-full px-0.5 text-[13px] transition-colors duration-150 whitespace-nowrap',
        isActive
          ? 'text-[var(--text-primary)]'
          : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
      )}
    >
      {item.label}
      {item.badge !== undefined && item.badge > 0 && (
        <span className="relative flex items-center justify-center">
          <span className="absolute inset-0 rounded-[4px] bg-[#D97706] opacity-25 animate-ping" />
          <span className="relative flex items-center justify-center h-4 min-w-[16px] px-1 rounded-[4px] bg-[#FEF3C7] text-[#D97706] text-[10px] font-medium leading-none">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        </span>
      )}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[var(--accent)] rounded-full" />
      )}
    </Link>
  )
}

// ── Establishment Switcher ─────────────────────────────────────────────────────────────

interface SwitcherProps {
  establishments: EstablishmentEntry[]
  activeEstablishmentId: string
  establishmentName: string
  role: 'manager' | 'employee' | 'supervisor'
}

function EstablishmentSwitcher({ establishments, activeEstablishmentId, establishmentName, role }: SwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  async function handleSwitch(id: string) {
    if (id === activeEstablishmentId || switching) return
    setSwitching(true)
    setOpen(false)
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

  if (establishments.length <= 1) {
    return (
      <span className="text-[12px] text-[var(--text-tertiary)] truncate max-w-[140px]">
        {establishmentName}
      </span>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={switching}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors duration-150 max-w-[160px]',
          switching && 'opacity-60'
        )}
      >
        <span className="truncate">{establishmentName}</span>
        <ChevronsUpDown className="h-3 w-3 flex-shrink-0 text-[var(--text-tertiary)]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden z-50">
          <p className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-[0.06em] text-[var(--text-tertiary)] font-medium">
            Changer d&apos;établissement
          </p>
          {establishments.map(est => (
            <button
              key={est.id}
              onClick={() => handleSwitch(est.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--accent-light)] transition-colors duration-150"
            >
              <div className="h-5 w-5 rounded-md bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-[var(--accent)]">
                  {getEstablishmentInitials(est.name)}
                </span>
              </div>
              <span className="flex-1 text-[12px] text-[var(--text-primary)] truncate">{est.name}</span>
              {est.id === activeEstablishmentId && (
                <Check className="h-3 w-3 text-[var(--accent)] flex-shrink-0" />
              )}
            </button>
          ))}
          {role === 'manager' && (
            <>
              <div className="mx-3 my-1 border-t border-[var(--border)]" />
              <Link
                href="/manager/settings/establishments"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--accent-light)] transition-colors duration-150"
              >
                <div className="h-5 w-5 rounded-md border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                  <Plus className="h-3 w-3 text-[var(--text-tertiary)]" />
                </div>
                <span className="text-[12px] text-[var(--text-secondary)]">Gérer les établissements</span>
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Topbar ────────────────────────────────────────────────────────────────

interface TopbarProps {
  role: 'manager' | 'employee' | 'supervisor'
  userName: string
  userEmail: string
  establishmentName: string
  pendingLeavesCount?: number
  alertsCount?: number
  complianceAlertsCount?: number
  establishments?: EstablishmentEntry[]
  activeEstablishmentId?: string
}

export function Topbar({
  role, userName, userEmail, establishmentName,
  pendingLeavesCount = 0,
  alertsCount = 0,
  complianceAlertsCount = 0,
  establishments = [],
  activeEstablishmentId = '',
}: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const [livePendingLeaves, setLivePendingLeaves] = useState(pendingLeavesCount)
  const [liveComplianceCount, setLiveComplianceCount] = useState(complianceAlertsCount)

  useEffect(() => { setLivePendingLeaves(pendingLeavesCount) }, [pendingLeavesCount])
  useEffect(() => { setLiveComplianceCount(complianceAlertsCount) }, [complianceAlertsCount])

  useEffect(() => {
    if (role !== 'manager' && role !== 'supervisor') return
    const supabase = createClient()
    let active = true
    const refresh = () => {
      supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        .then(({ count }) => { if (active) setLivePendingLeaves(count ?? 0) })
    }
    const channel = supabase
      .channel('topbar-leaves')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, refresh)
      .subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [role])

  useEffect(() => {
    if (role !== 'manager' && role !== 'supervisor') return
    let active = true
    const fetchCount = () => {
      fetch('/api/compliance/alerts')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (active && d) setLiveComplianceCount(d.count ?? 0) })
        .catch(() => {})
    }
    const timer = setInterval(fetchCount, 5 * 60 * 1000)
    return () => { active = false; clearInterval(timer) }
  }, [role])

  const liveAlertsCount = alertsCount + liveComplianceCount

  const navItems = (role === 'manager' || role === 'supervisor')
    ? buildManagerNav(livePendingLeaves, liveAlertsCount, t)
    : buildEmployeeNav(t)

  function isActive(href: string) {
    if (href === '/manager/settings') {
      return pathname.startsWith('/manager/settings')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-11 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center px-5 gap-6">

      <Link
        href={role === 'employee' ? '/employee' : '/manager'}
        className="text-[15px] font-medium tracking-[-0.03em] text-[var(--text-primary)] flex-shrink-0"
      >
        Nexus
      </Link>

      <div className="h-4 w-px bg-[var(--border)] flex-shrink-0" />

      <nav className="flex items-stretch h-full gap-5 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
        {navItems.map(item => (
          <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
        ))}
      </nav>

      <div className="flex items-center gap-3 flex-shrink-0">

        <EstablishmentSwitcher
          establishments={establishments}
          activeEstablishmentId={activeEstablishmentId}
          establishmentName={establishmentName}
          role={role}
        />

        <NotificationsBell />

        <LanguageSwitcher />

        <ThemeToggle />

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent-light)] flex-shrink-0">
            <span className="text-[10px] font-medium text-[var(--accent)]">
              {getInitials(userName || userEmail)}
            </span>
          </div>
          <span className="text-[13px] text-[var(--text-secondary)] truncate max-w-[100px]">
            {userName || userEmail}
          </span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--text-tertiary)] hover:text-[var(--color-critical-text)] hover:bg-[var(--color-critical-bg)] transition-colors duration-150"
          title="Se déconnecter"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  )
}
