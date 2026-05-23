import SettingsSidebar from './_sidebar'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 48px)' }}>
      <SettingsSidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50/40">
        {children}
      </main>
    </div>
  )
}
