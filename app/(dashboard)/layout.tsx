import { TopNav } from '@/components/ui/top-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      {children}
    </div>
  )
}
