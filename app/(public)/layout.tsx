import { PublicNavbar } from '@/components/public/navbar'
import { PublicFooter } from '@/components/public/footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <PublicNavbar />
      <main>{children}</main>
      <PublicFooter />
    </div>
  )
}
