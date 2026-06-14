import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return <AppShell role="manager">{children}</AppShell>
}
