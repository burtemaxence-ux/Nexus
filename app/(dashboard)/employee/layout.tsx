import type { ReactNode } from 'react'
import { PwaInstallBanner } from '@/components/ui/pwa-install-banner'

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PwaInstallBanner />
    </>
  )
}
