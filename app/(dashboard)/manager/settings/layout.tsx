import { createClient } from '@/lib/supabase/server'
import SettingsSidebar from './_sidebar'
import { ShieldAlert } from 'lucide-react'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isSupervisor = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    isSupervisor = profile?.role === 'supervisor'
  }

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 48px)' }}>
      <SettingsSidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50/40">
        {isSupervisor && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-700 text-xs font-medium">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            Accès en lecture seule — les modifications de paramètres sont réservées aux managers.
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
