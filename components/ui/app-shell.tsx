'use client'

import type { ReactNode } from 'react'
import { Topbar } from './topbar'
import { AiAssistant } from './ai-assistant'
import { BreadcrumbNav } from './breadcrumb-nav'

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
  establishments?: EstablishmentEntry[]
  activeEstablishmentId?: string
  children: ReactNode
}

export function AppShell({
  role, userName, userEmail, establishmentName,
  pendingLeavesCount = 0,
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
        establishments={establishments}
        activeEstablishmentId={activeEstablishmentId}
      />
      <div className="pt-11 flex flex-col min-h-screen">
        <BreadcrumbNav />
        <main className="flex-1">
          {children}
        </main>
      </div>
      {(role === 'manager' || role === 'supervisor') && (
        <AiAssistant establishmentName={establishmentName} userName={userName} />
      )}
    </div>
  )
}
