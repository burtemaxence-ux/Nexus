'use client'

import type { ElementType } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar, Users, BarChart3, FileText, Clock,
  Settings, ChevronLeft, ChevronRight, LogOut,
  UtensilsCrossed
} from 'lucide-react'

interface NavItem {
  label: string
  icon: ElementType
  href: string
}

interface NavGroup {
  group: string | null
  items: NavItem[]
}

const managerNav: NavGroup[] = [
  {
    group: 'GESTION',
    items: [
      { label: 'Planning', icon: Calendar, href: '/manager/planning' },
      { label: 'Employés', icon: Users, href: '/manager/employees' },
      { label: 'Rapport', icon: BarChart3, href: '/manager/rapport' },
    ]
  },
  {
    group: 'DEMANDES',
    items: [
      { label: 'Congés', icon: FileText, href: '/manager/conges' },
      { label: 'Présences', icon: Clock, href: '/manager/presences' },
    ]
  },
  {
    group: 'CONFIGURATION',
    items: [
      { label: 'Paramètres', icon: Settings, href: '/manager/settings' },
    ]
  }
]

const employeeNav: NavGroup[] = [
  {
    group: null,
    items: [
      { label: 'Mon planning', icon: Calendar, href: '/employee/planning' },
      { label: 'Mes congés', icon: FileText, href: '/employee/conges' },
      { label: 'Badgeuse', icon: Clock, href: '/employee/badgeuse' },
    ]
  }
]

interface SidebarProps {
  role: 'manager' | 'employee'
  userName: string
  userEmail: string
  establishmentName: string
  collapsed: boolean
  onToggle: () => void
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export function Sidebar({ role, userName, userEmail, establishmentName, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const navGroups = role === 'manager' ? managerNav : employeeNav

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
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex-shrink-0 relative z-20',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo / Brand */}
      <div className={cn(
        'flex items-center h-14 border-b border-sidebar-border px-4 flex-shrink-0',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary flex-shrink-0">
          <UtensilsCrossed className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-semibold text-sidebar-foreground-active text-sm leading-tight truncate">
              {establishmentName}
            </p>
            <p className="text-xs text-sidebar-foreground leading-tight">D-pot</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {navGroups.map((group, gi) => (
          <div key={gi} className={cn('mb-1', gi > 0 && 'mt-4')}>
            {group.group && !collapsed && (
              <p className="px-4 text-[10px] font-semibold tracking-widest text-sidebar-foreground/50 mb-1 uppercase">
                {group.group}
              </p>
            )}
            {group.group && collapsed && <div className="mx-3 mb-1 border-t border-sidebar-border/50" />}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-all duration-150 group',
                        collapsed ? 'justify-center' : '',
                        active
                          ? 'bg-primary/10 text-white font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground-active'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={cn(
                        'h-4 w-4 flex-shrink-0 transition-colors',
                        active ? 'text-primary' : 'text-sidebar-foreground group-hover:text-sidebar-foreground-active'
                      )} />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom: user + collapse toggle */}
      <div className="flex-shrink-0 border-t border-sidebar-border">
        {/* User row */}
        <div className={cn(
          'flex items-center px-3 py-3 gap-3',
          collapsed ? 'justify-center' : ''
        )}>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 flex-shrink-0">
            <span className="text-xs font-semibold text-primary">{getInitials(userName || userEmail)}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground-active truncate leading-tight">
                {userName || 'Utilisateur'}
              </p>
              <p className="text-xs text-sidebar-foreground truncate leading-tight">{userEmail}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="flex-shrink-0 p-1.5 rounded-md text-sidebar-foreground hover:text-sidebar-foreground-active hover:bg-sidebar-accent transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 text-sidebar-foreground hover:text-sidebar-foreground-active hover:bg-sidebar-accent transition-colors text-xs gap-1.5 border-t border-sidebar-border/50"
          title={collapsed ? 'Déplier' : 'Replier'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : (
            <>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium tracking-wide">Replier</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
