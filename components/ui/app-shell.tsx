'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Topbar } from './topbar'
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
  pendingLeavesCount?: number
  alertsCount?: number
  establishments?: EstablishmentEntry[]
  activeEstablishmentId?: string
  children: ReactNode
}

export function AppShell({
  role, userName, userEmail, establishmentName,
  pendingLeavesCount = 0,
  alertsCount = 0,
  establishments = [], activeEstablishmentId = '',
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <Topbar
        role={role}
        userName={userName}
        userEmail={userEmail}
        establishmentName={establishmentName}
        pendingLeavesCount={pendingLeavesCount}
        alertsCount={alertsCount}
        establishments={establishments}
        activeEstablishmentId={activeEstablishmentId}
      />
      <div className="pt-11 flex flex-col min-h-screen">
        <BreadcrumbNav />
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      {(role === 'manager' || role === 'supervisor') && (
        <AiAssistant
          establishmentName={establishmentName}
          userName={userName}
          chatEndpoint="/api/ai/chat"
          contextEndpoint="/api/ai/context"
          mode="manager"
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

      {/* Legal footer */}
      <footer className="px-6 py-4 flex items-center justify-center gap-4 flex-wrap" style={{ borderTop: '0.5px solid var(--border)' }}>
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
  )
}
