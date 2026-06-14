'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  LayoutDashboard, Calendar, Users, Palmtree, MoreHorizontal,
  Clock, Home, X, BarChart3, Settings, LogOut, Sun, Moon,
  AlertTriangle,
} from 'lucide-react'

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function isActive(href: string, pathname: string): boolean {
  if (href === '/manager') return pathname === '/manager'
  if (href === '/employee') return pathname === '/employee'
  if (href === '/manager/settings') return pathname.startsWith('/manager/settings')
  return pathname === href || pathname.startsWith(href + '/')
}

function NavIcon({
  icon: Icon,
  label,
  active,
  badge,
  accent,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  badge?: number
  accent?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-[3px]">
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full transition-all duration-150',
          accent ? 'w-10 h-10 shadow-sm' : 'w-7 h-7',
          accent ? 'bg-[var(--accent)]' : active ? 'bg-[var(--accent-light)]' : ''
        )}
      >
        <Icon
          className={cn(
            accent ? 'h-[18px] w-[18px] text-white' : 'h-[17px] w-[17px]',
            !accent && active ? 'text-[var(--accent)]' : !accent ? 'text-[var(--text-tertiary)]' : ''
          )}
        />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-[14px] min-w-[14px] px-[3px] rounded-full bg-[#D97706] text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className={cn('text-[9px] font-medium leading-none', accent ? 'text-[var(--accent)]' : active ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]')}>
        {label}
      </span>
    </div>
  )
}

function ManagerMoreDrawer({ onClose, pathname }: { onClose: () => void; pathname: string }) {
  const items = [
    { href: '/manager/compliance', icon: AlertTriangle, label: 'Conformité' },
    { href: '/manager/rapport', icon: BarChart3, label: 'Rapport' },
    { href: '/manager/settings', icon: Settings, label: 'Paramètres' },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-card)] rounded-t-2xl md:hidden"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>
        <div className="flex items-center justify-between px-5 py-2">
          <span className="text-[13px] font-medium text-[var(--text-primary)]">Autres modules</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-tertiary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-3 pb-2">
          {items.map(({ href, icon: Icon, label }) => {
            const active = isActive(href, pathname)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] transition-colors',
                  active ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-primary)]'
                )}
              >
                <Icon className={cn('h-[18px] w-[18px] flex-shrink-0', active ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]')} />
                <span className="flex-1">{label}</span>
              </Link>
            )
          })}
          <div className="mx-1 my-2 border-t border-[var(--border)]" />
          <button
            onClick={() => { onClose(); toast.info('🎭 Mode démo — connexion désactivée') }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] text-[var(--danger)]"
          >
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            Se déconnecter
          </button>
        </div>
      </div>
    </>
  )
}

export function MobileHeader({ role }: { role: 'manager' | 'employee' }) {
  const [dark, setDark] = useState(false)

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

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-[var(--bg-card)] flex flex-col md:hidden" style={{ borderBottom: '0.5px solid var(--border)' }}>
      <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      <div className="flex items-center h-14 px-4 gap-3">
        <Link
          href={role === 'employee' ? '/employee' : '/manager'}
          className="text-[16px] font-medium tracking-[-0.03em] text-[var(--text-primary)] flex-shrink-0"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          Quartzbase
        </Link>
        <span className="text-[11px] text-[var(--text-tertiary)] truncate flex-1 min-w-0">
          La Boulangerie du Soleil
        </span>
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-7 h-7 rounded-lg"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-light)]">
          <span className="text-[11px] font-semibold text-[var(--accent)]">MB</span>
        </div>
      </div>
    </header>
  )
}

export function BottomNav({ role }: { role: 'manager' | 'employee' }) {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  const navBarStyle: React.CSSProperties = {
    borderTop: '0.5px solid var(--border)',
    height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    backgroundColor: 'rgba(15,15,22,0.92)',
  }

  if (role === 'manager') {
    const moreRoutes = ['/manager/compliance', '/manager/rapport', '/manager/settings']
    const moreActive = moreRoutes.some(h => isActive(h, pathname))

    return (
      <>
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden bg-[var(--bg-card)] items-stretch px-1" style={navBarStyle}>
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
            <NavIcon icon={Palmtree} label="Congés" active={isActive('/manager/conges', pathname)} badge={2} />
          </Link>
          <button onClick={() => setShowMore(o => !o)} className="flex-1 flex items-center justify-center">
            <NavIcon icon={MoreHorizontal} label="Plus" active={moreActive || showMore} />
          </button>
        </nav>
        {showMore && <ManagerMoreDrawer onClose={() => setShowMore(false)} pathname={pathname} />}
      </>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden items-stretch px-1" style={navBarStyle}>
      <Link href="/employee" className="flex-1 flex items-center justify-center active:scale-90 transition-transform duration-100">
        <NavIcon icon={Home} label="Accueil" active={pathname === '/employee'} />
      </Link>
      <Link href="/employee" className="flex-1 flex items-center justify-center active:scale-90 transition-transform duration-100">
        <NavIcon icon={Clock} label="Badgeuse" active={isActive('/employee', pathname)} accent />
      </Link>
      <Link href="/employee/planning" className="flex-1 flex items-center justify-center active:scale-90 transition-transform duration-100">
        <NavIcon icon={Calendar} label="Planning" active={isActive('/employee/planning', pathname)} />
      </Link>
      <Link href="/employee/leaves" className="flex-1 flex items-center justify-center active:scale-90 transition-transform duration-100">
        <NavIcon icon={Palmtree} label="Congés" active={isActive('/employee/leaves', pathname)} />
      </Link>
    </nav>
  )
}
