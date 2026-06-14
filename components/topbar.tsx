'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Sun, Moon, Bell } from 'lucide-react'

const DEMO_USER = { name: 'Maxence', initials: 'MB', email: 'maxence@boulangerie.fr' }
const ESTABLISHMENT = 'La Boulangerie du Soleil'

interface NavItem {
  label: string
  href: string
  badge?: number
}

const managerNav: NavItem[] = [
  { label: 'Planning',    href: '/manager/planning' },
  { label: 'Employés',    href: '/manager/employees' },
  { label: 'Conformité',  href: '/manager/compliance' },
  { label: 'Congés',      href: '/manager/conges', badge: 2 },
]

const employeeNav: NavItem[] = [
  { label: 'Badgeuse',    href: '/employee' },
  { label: 'Mon planning',href: '/employee/planning' },
  { label: 'Mes congés',  href: '/employee/leaves' },
]

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
        <span className="relative flex items-center justify-center alert-pulse">
          <span className="absolute inset-0 rounded-[4px] opacity-30 animate-ping" style={{ backgroundColor: '#FF6B6B' }} />
          <span className="relative flex items-center justify-center h-4 min-w-[16px] px-1 rounded-[4px] text-[10px] font-medium leading-none" style={{ backgroundColor: 'rgba(255,107,107,0.15)', color: '#FF6B6B' }}>
            {item.badge}
          </span>
        </span>
      )}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[var(--accent)] rounded-full" />
      )}
    </Link>
  )
}

function AccountDropdown() {
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--accent-light)] transition-colors duration-150"
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6C63FF 0%, #4A8FD4 100%)' }}>
          <span className="text-[10px] font-bold text-white" style={{ fontFamily: 'var(--font-syne)' }}>
            {DEMO_USER.initials}
          </span>
        </div>
        <span className="text-[13px] text-[var(--text-secondary)] truncate max-w-[100px]">
          {DEMO_USER.name}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-lg overflow-hidden z-50"
          style={{ animation: 'dropdownIn 0.15s ease' }}
        >
          <div className="px-3 py-2.5 border-b border-[var(--border)]">
            <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">{DEMO_USER.name}</p>
            <p className="text-[11px] text-[var(--text-tertiary)] truncate">{DEMO_USER.email}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--text-primary)] transition-colors duration-150"
          >
            {dark
              ? <Sun className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              : <Moon className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            }
            {dark ? 'Mode clair' : 'Mode sombre'}
          </button>
          <div className="mx-3 my-1 border-t border-[var(--border)]" />
          <button
            onClick={() => { setOpen(false); toast.info('🎭 Mode démo — connexion désactivée') }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[rgba(255,107,107,0.1)] hover:text-[#FF6B6B] transition-colors duration-150"
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}

export function Topbar({ role }: { role: 'manager' | 'employee' }) {
  const pathname = usePathname()
  const navItems = role === 'manager' ? managerNav : employeeNav

  function isActive(href: string) {
    if (href === '/employee') return pathname === '/employee'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isManager = pathname.startsWith('/manager')

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-11 backdrop-blur-md flex items-center px-5 gap-6" style={{ backgroundColor: 'rgba(10,10,15,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Logo + demo badge */}
      <Link
        href={role === 'employee' ? '/employee' : '/manager'}
        className="flex items-center gap-2 flex-shrink-0"
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-white text-[11px] select-none flex-shrink-0"
          style={{ backgroundColor: '#6C63FF' }}
        >
          Q
        </div>
        <span className="text-[14px] font-semibold tracking-tight" style={{ color: '#f0f0f8', fontFamily: 'var(--font-syne)' }}>
          Quartzbase
        </span>
        <span className="demo-badge">🎭 DÉMO</span>
      </Link>

      {/* Separator */}
      <div className="h-4 w-px bg-[var(--border)] flex-shrink-0" />

      {/* Nav */}
      <nav className="flex items-stretch h-full gap-5 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
        {navItems.map(item => (
          <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">

        {/* Establishment */}
        <span
          className="text-[12px] truncate max-w-[140px] px-3 py-1.5 rounded-lg hidden md:block"
          style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
        >
          {ESTABLISHMENT}
        </span>

        {/* Manager/Employé switcher */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '0.5px solid var(--border)' }}>
          <Link
            href="/manager"
            className={cn(
              'px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-150',
              isManager
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            )}
          >
            Manager
          </Link>
          <Link
            href="/employee"
            className={cn(
              'px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-150',
              !isManager
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            )}
          >
            Employé
          </Link>
        </div>

        {/* Notifications */}
        <button
          onClick={() => toast.info('🎭 Mode démo — notifications désactivées')}
          className="relative flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--accent-light)] transition-colors duration-150"
        >
          <Bell className="h-4 w-4 text-[var(--text-secondary)]" />
          <span className="absolute -top-0.5 -right-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full px-[3px] text-[9px] font-bold leading-none text-white" style={{ backgroundColor: '#FF6B6B' }}>
            2
          </span>
        </button>

        {/* Account */}
        <AccountDropdown />
      </div>
    </header>
  )
}
