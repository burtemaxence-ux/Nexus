import { createClient } from '@/lib/supabase/server'
import SettingsSidebar from './_sidebar'
import { ShieldAlert } from 'lucide-react'
import './settings.css'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isSupervisor = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    isSupervisor = profile?.role === 'supervisor'
  }

  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: 'calc(100vh - 44px)' }}>
      <SettingsSidebar />
      <main className="nx-settings-main flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-page)' }}>
        {isSupervisor && (
          <div className="flex items-center gap-2 px-5 py-2.5 text-xs font-medium" style={{ backgroundColor: '#FEF3C7', borderBottom: '0.5px solid #FDE68A', color: 'var(--warning)' }}>
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            Accès en lecture seule — les modifications de paramètres sont réservées aux managers.
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
