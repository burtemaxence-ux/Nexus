'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { AiAssistant } from './ai-assistant'
import { BreadcrumbNav } from './breadcrumb-nav'

interface AppShellProps {
  role: 'manager' | 'employee' | 'supervisor'
  userName: string
  userEmail: string
  establishmentName: string
  orgLogoUrl?: string
  pendingLeavesCount?: number
  children: ReactNode
}

export function AppShell({
  role, userName, userEmail, establishmentName,
  orgLogoUrl = '', pendingLeavesCount = 0,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        establishmentName={establishmentName}
        orgLogoUrl={orgLogoUrl}
        pendingLeavesCount={pendingLeavesCount}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <main className="flex-1 overflow-y-auto min-w-0 flex flex-col">
        <BreadcrumbNav />
        <div className="flex-1">
          {children}
        </div>
      </main>
      {(role === 'manager' || role === 'supervisor') && (
        <AiAssistant establishmentName={establishmentName} userName={userName} />
      )}
    </div>
  )
}
