'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from './sidebar'
import { RoleRouteGuard } from './role-route-guard'
import { AccountDropdown } from './topbar'
import { NotificationsBell } from './notifications-bell'
import { TopbarSearch } from './topbar-search'
import { FullscreenToggle } from './fullscreen-toggle'
import { Settings } from 'lucide-react'
import { MobileHeader, BottomNav } from './bottom-nav'
import { AiAssistant } from './ai-assistant'
import { BreadcrumbNav } from './breadcrumb-nav'
import { PageTransition } from './page-transition'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

interface EstablishmentEntry {
  id: string
  name: string
}

interface AppShellProps {
  role: 'manager' | 'employee' | 'supervisor'
  userName: string
  userEmail: string
  establishmentName: string
  orgLogoUrl?: string
  currentPlan?: string
  pendingLeavesCount?: number
  alertsCount?: number
  complianceAlertsCount?: number
  establishments?: EstablishmentEntry[]
  activeEstablishmentId?: string
  children: ReactNode
}

// Smooth premium backdrop behind the whole app (softer than flat near-black).
const APP_BG =
  'radial-gradient(1100px 520px at 0% -5%, rgba(108,99,255,0.07), transparent 60%), ' +
  'radial-gradient(900px 500px at 100% 0%, rgba(0,212,170,0.035), transparent 55%), ' +
  'var(--bg-page)'

export function AppShell({
  role, userName, userEmail, establishmentName,
  orgLogoUrl, currentPlan,
  pendingLeavesCount = 0,
  alertsCount = 0,
  complianceAlertsCount = 0,
  establishments = [], activeEstablishmentId = '',
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()

  // Apply the user's chosen theme inside the app (default light — N4). On
  // unmount — i.e. navigating out to the landing/auth pages, which are
  // dark-only — restore dark so the marketing surface keeps its brand look.
  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', localStorage.getItem('dp-theme') === 'dark')
      setCollapsed(localStorage.getItem('qb-sidebar-collapsed') === '1')
    } catch { /* ignore */ }
    return () => { document.documentElement.classList.add('dark') }
  }, [])

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('qb-sidebar-collapsed', next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen" style={{ background: APP_BG }}>
      <RoleRouteGuard role={role} />
      <div className="md:flex">

        {/* Sidebar — desktop only, pinned */}
        <div className="hidden md:block md:sticky md:top-0 md:h-screen flex-shrink-0">
          <Sidebar
            role={role}
            userName={userName}
            userEmail={userEmail}
            establishmentName={establishmentName}
            orgLogoUrl={orgLogoUrl}
            pendingLeavesCount={pendingLeavesCount}
            establishments={establishments}
            activeEstablishmentId={activeEstablishmentId}
            collapsed={collapsed}
            onToggle={toggleCollapsed}
          />
        </div>

        {/* Right column */}
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">

          {/* Header mobile — mobile only */}
          <MobileHeader
            userName={userName}
            userEmail={userEmail}
            establishmentName={establishmentName}
            role={role}
          />

          {/* Topbar — desktop only (style Dhonu) */}
          <header
            className="hidden md:flex items-center gap-2 h-14 px-5 sticky top-0 z-30 flex-shrink-0 backdrop-blur-md bg-white/80 dark:bg-[#0b0b12]/70"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <TopbarSearch role={role} />
            <div className="flex-1" />
            {(role === 'manager' || role === 'supervisor') && (
              <Link
                href="/manager/settings"
                aria-label="Paramètres"
                title="Paramètres"
                className="flex items-center justify-center h-9 w-9 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
              >
                <Settings className="h-[18px] w-[18px]" />
              </Link>
            )}
            <NotificationsBell />
            <FullscreenToggle />
            <AccountDropdown
              userName={userName}
              userEmail={userEmail}
              role={role}
              currentPlan={currentPlan}
              onSignOut={handleSignOut}
            />
          </header>

          {/* Main content — content-safe-pt offsets the fixed mobile header; removed on desktop */}
          <div className="content-safe-pt md:!pt-0 flex flex-col flex-1 pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0">
            <BreadcrumbNav />
            <main className="flex-1">
              <PageTransition>{children}</PageTransition>
            </main>

            {/* Footer légal — desktop only */}
            <footer className="hidden md:flex px-6 py-4 items-center justify-center gap-4 flex-wrap" style={{ borderTop: '0.5px solid var(--border)' }}>
              {[
                { href: '/legal/mentions-legales', label: 'Mentions légales' },
                { href: '/legal/confidentialite',  label: 'Confidentialité' },
                { href: '/legal/cgu',              label: 'CGU' },
                { href: '/legal/cookies',          label: 'Cookies' },
              ].map(l => (
                <Link key={l.href} href={l.href} className="text-[11px] transition-colors duration-150" style={{ color: 'var(--text-tertiary)' }}>
                  {l.label}
                </Link>
              ))}
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Powered by Quartz</span>
            </footer>
          </div>
        </div>
      </div>

      {/* AI Assistant */}
      {(role === 'manager' || role === 'supervisor') && (
        <AiAssistant
          establishmentName={establishmentName}
          userName={userName}
          chatEndpoint="/api/ai/chat"
          contextEndpoint="/api/ai/context"
          mode="manager"
          pendingLeavesCount={pendingLeavesCount}
          alertesLegalesCount={complianceAlertsCount}
        />
      )}
      {role === 'employee' && (
        <AiAssistant
          establishmentName={establishmentName}
          userName={userName}
          chatEndpoint="/api/ai/employee-chat"
          contextEndpoint="/api/ai/employee-context"
          mode="employee"
        />
      )}
      <OnboardingWizard role={role} />

      {/* Bottom nav — mobile only */}
      <BottomNav
        role={role}
        pendingLeavesCount={pendingLeavesCount}
        alertsCount={alertsCount}
        complianceAlertsCount={complianceAlertsCount}
      />
    </div>
  )
}
