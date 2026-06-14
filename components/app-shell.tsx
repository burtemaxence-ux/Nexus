'use client'

import type { ReactNode } from 'react'
import { Topbar } from './topbar'
import { MobileHeader, BottomNav } from './bottom-nav'

interface AppShellProps {
  role: 'manager' | 'employee'
  children: ReactNode
}

export function AppShell({ role, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="hidden md:block">
        <Topbar role={role} />
      </div>
      <MobileHeader role={role} />
      <div className="content-safe-pt flex flex-col min-h-screen pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0">
        <main className="flex-1">{children}</main>
      </div>
      <BottomNav role={role} />
    </div>
  )
}
