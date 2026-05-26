import type { ReactNode } from 'react'
import { PwaInstallBanner } from '@/components/ui/pwa-install-banner'
import { PushSubscribeBanner } from '@/components/ui/push-subscribe'

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PushSubscribeBanner />
      {children}
      <PwaInstallBanner />
    </>
  )
}
