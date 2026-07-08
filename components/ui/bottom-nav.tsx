'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Users, Palmtree, MoreHorizontal,
  Clock, Home, X, BarChart3, Settings, LogOut, Sun, Moon,
  AlertTriangle,
} from 'lucide-react'
import { NotificationsBell } from './notifications-bell'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isActive(href: string, pathname: string): boolean {
  if (href === '/manager') return pathname === '/manager'
  if (href === '/employee') return pathname === '/employee'
  if (href === '/manager/settings') return pathname.startsWith('/manager/settings')
  return pathname === href || pathname.startsWith(href + '/')
}

// ── Nav icon (visuel) ─────────────────────────────────────────────────────────

function NavIcon({
  icon: Icon,
  label,
  active,
  badge,
  accent,
  indicator,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  badge?: number
  accent?: boolean
  indicator?: boolean
}) {
  if (accent) {
    return (
      <div className="flex flex-col items-center justify-center gap-[3px]">
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: 44,
            height: 44,
            marginTop: -14,
            background: 'linear-gradient(150deg, #8B84FF, var(--accent))',
            boxShadow: '0 4px 14px rgba(108,99,255,.55), 0 0 22px rgba(108,99,255,.45)',
            border: '3px solid var(--bg-page)',
          }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="text-[9px] font-medium leading-none text-[var(--accent)]">{label}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-[3px]">
      <div className="relative flex items-center justify-center w-7 h-7 rounded-full transition-all duration-150" style={{ backgroundColor: active ? 'var(--accent-light)' : undefined }}>
        {indicator && active && (
          <span className="nx-indic absolute -top-[9px] w-[26px] h-[3px] rounded-b-[3px]" style={{ backgroundColor: 'var(--accent)' }} />
        )}
        <Icon className={cn('h-[17px] w-[17px]', active ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]')} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-[14px] min-w-[14px] px-[3px] rounded-full bg-[#D97706] text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className={cn('text-[9px] font-medium leading-none', active ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]')}>
        {label}
      </span>
    </div>
  )
}

// ── Drawer "Plus" manager ─────────────────────────────────────────────────────

function ManagerMoreDrawer({
  onClose,
  alertsCount,
  pathname,
}: {
  onClose: () => void
  alertsCount: number
  pathname: string
}) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const items = [
    { href: '/manager/presences', icon: Clock, label: 'Présences' },
    { href: '/manager/alertes', icon: AlertTriangle, label: 'Alertes', badge: alertsCount },
    { href: '/manager/rapport', icon: BarChart3, label: 'Rapport' },
    { href: '/manager/settings', icon: Settings, label: 'Paramètres' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-card)] rounded-t-2xl md:hidden"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2">
          <span className="text-[13px] font-medium text-[var(--text-primary)]">Autres modules</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-tertiary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Items */}
        <div className="px-3 pb-2">
          {items.map(({ href, icon: Icon, label, badge }) => {
            const active = isActive(href, pathname)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] transition-colors',
                  active
                    ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                    : 'text-[var(--text-primary)]'
                )}
              >
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] flex-shrink-0',
                    active ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
                  )}
                />
                <span className="flex-1">{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-[#FEF3C7] text-[#D97706] text-[11px] font-medium leading-none">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            )
          })}
          {/* Separator + logout */}
          <div className="mx-1 my-2 border-t border-[var(--border)]" />
          <button
            onClick={() => { onClose(); handleSignOut() }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] text-[var(--danger)]"
          >
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>
    </>
  )
}

// ── Mobile Header ─────────────────────────────────────────────────────────────

interface MobileHeaderProps {
  userName: string
  userEmail: string
  establishmentName: string
  role: 'manager' | 'employee' | 'supervisor'
}

export function MobileHeader({ userName, userEmail, establishmentName, role }: MobileHeaderProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function toggleTheme() {
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

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const showEstablishment =
    establishmentName && establishmentName !== 'Mon établissement'

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-[var(--bg-card)] flex flex-col md:hidden" style={{ borderBottom: '0.5px solid var(--border)' }}>
      {/* Safe area spacer for notched iPhones in PWA standalone mode */}
      <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      {/* Content row */}
      <div className="flex items-center h-14 px-4 gap-3">
        <Link
          href={role === 'employee' ? '/employee' : '/manager'}
          className="text-[16px] font-medium tracking-[-0.03em] text-[var(--text-primary)] flex-shrink-0"
        >
          Quartzbase
        </Link>

        {showEstablishment && (
          <span className="text-[11px] text-[var(--text-tertiary)] truncate flex-1 min-w-0">
            {establishmentName}
          </span>
        )}

        {/* Notifications cloche — mobile (ml-auto quand pas d'établissement pour aligner à droite) */}
        <div className={cn(!showEstablishment && 'ml-auto')}>
          <NotificationsBell isMobile />
        </div>

        <div className={cn('flex-shrink-0 relative')} ref={ref}>
          <button
            onClick={() => setMenuOpen((o: boolean) => !o)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-light)]"
          >
            <span className="text-[11px] font-semibold text-[var(--accent)]">
              {getInitials(userName || userEmail)}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--bg-card)] rounded-xl overflow-hidden z-50 shadow-lg" style={{ border: '0.5px solid var(--border)' }}>
              {role === 'employee' ? (
                <Link
                  href="/employee/profil"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 transition-colors"
                  style={{ borderBottom: '0.5px solid var(--border)' }}
                >
                  <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">{userName || userEmail}</p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--accent)' }}>Voir mon profil</p>
                </Link>
              ) : (
                <div className="px-3 py-2.5" style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">{userName || userEmail}</p>
                  {userName && <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">{userEmail}</p>}
                </div>
              )}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[var(--text-primary)] transition-colors"
              >
                {dark
                  ? <Sun className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" />
                  : <Moon className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" />}
                {dark ? 'Mode clair' : 'Mode sombre'}
              </button>
              <button
                onClick={() => { setMenuOpen(false); handleSignOut() }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[var(--danger)] transition-colors"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────

interface BottomNavProps {
  role: 'manager' | 'employee' | 'supervisor'
  pendingLeavesCount?: number
  alertsCount?: number
  complianceAlertsCount?: number
}

export function BottomNav({ role, pendingLeavesCount = 0, alertsCount = 0, complianceAlertsCount = 0 }: BottomNavProps) {
  const pathname = usePathname()
  const [livePendingLeaves, setLivePendingLeaves] = useState(pendingLeavesCount)
  const [liveComplianceCount, setLiveComplianceCount] = useState(complianceAlertsCount)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => { setLivePendingLeaves(pendingLeavesCount) }, [pendingLeavesCount])
  useEffect(() => { setLiveComplianceCount(complianceAlertsCount) }, [complianceAlertsCount])

  // Realtime badge congés
  useEffect(() => {
    if (role !== 'manager' && role !== 'supervisor') return
    const supabase = createClient()
    let active = true
    const refresh = () => {
      supabase
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .then(({ count }: { count: number | null }) => { if (active) setLivePendingLeaves(count ?? 0) })
    }
    const channel = supabase
      .channel('bottom-nav-leaves')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, refresh)
      .subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [role])

  const navBarStyle: React.CSSProperties = {
    borderTop: '0.5px solid var(--border)',
    height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  }

  if (role === 'manager' || role === 'supervisor') {
    const moreRoutes = ['/manager/presences', '/manager/alertes', '/manager/rapport', '/manager/settings']
    const moreActive = moreRoutes.some(h => isActive(h, pathname))

    return (
      <>
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden bg-white/90 dark:bg-[#13131c]/90 items-stretch px-1"
          style={navBarStyle}
        >
          <Link href="/manager" className="flex-1 flex items-center justify-center">
            <NavIcon icon={LayoutDashboard} label="Accueil" active={pathname === '/manager'} />
          </Link>
          <Link href="/manager/planning" className="flex-1 flex items-center justify-center">
            <NavIcon icon={Calendar} label="Planning" active={isActive('/manager/planning', pathname)} />
          </Link>
          <Link href="/manager/employees" className="flex-1 flex items-center justify-center">
            <NavIcon icon={Users} label="Équipe" active={isActive('/manager/employees', pathname)} />
          </Link>
          <Link href="/manager/conges" className="flex-1 flex items-center justify-center">
            <NavIcon icon={Palmtree} label="Congés" active={isActive('/manager/conges', pathname)} badge={livePendingLeaves} />
          </Link>
          <button
            onClick={() => setShowMore((o: boolean) => !o)}
            className="flex-1 flex items-center justify-center"
          >
            <NavIcon icon={MoreHorizontal} label="Plus" active={moreActive || showMore} />
          </button>
        </nav>

        {showMore && (
          <ManagerMoreDrawer
            onClose={() => setShowMore(false)}
            alertsCount={alertsCount + liveComplianceCount}
            pathname={pathname}
          />
        )}
      </>
    )
  }

  // ── Employé ──────────────────────────────────────────────────────────────────
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden bg-white/90 dark:bg-[#13131c]/90 items-stretch px-1"
      style={navBarStyle}
    >
      <Link href="/employee" className="flex-1 flex items-center justify-center active:scale-90 transition-transform duration-100">
        <NavIcon icon={Home} label="Accueil" active={pathname === '/employee'} indicator />
      </Link>
      <Link href="/employee/badgeuse" className="flex-1 flex items-center justify-center active:scale-90 transition-transform duration-100">
        <NavIcon icon={Clock} label="Badgeuse" active={isActive('/employee/badgeuse', pathname)} accent />
      </Link>
      <Link href="/employee/planning" className="flex-1 flex items-center justify-center active:scale-90 transition-transform duration-100">
        <NavIcon icon={Calendar} label="Planning" active={isActive('/employee/planning', pathname)} indicator />
      </Link>
      <Link href="/employee/conges" className="flex-1 flex items-center justify-center active:scale-90 transition-transform duration-100">
        <NavIcon icon={Palmtree} label="Congés" active={isActive('/employee/conges', pathname)} indicator />
      </Link>
    </nav>
  )
}
