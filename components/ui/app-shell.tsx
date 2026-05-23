'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from './sidebar'

interface AppShellProps {
  role: 'manager' | 'employee'
  userName: string
  userEmail: string
  establishmentName: string
  children: ReactNode
}

export function AppShell({ role, userName, userEmail, establishmentName, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        establishmentName={establishmentName}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
