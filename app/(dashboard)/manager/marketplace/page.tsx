import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarketplaceManagerClient from './marketplace-manager-client'

export const metadata = { title: 'Marketplace remplaçants — Nexus' }

export default async function MarketplaceManagerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) {
    redirect('/employee/planning')
  }

  return (
    <div className="px-6 py-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-[-0.02em]">
            Marketplace remplaçants
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Publiez des shifts disponibles et trouvez un remplaçant en quelques minutes.
          </p>
        </div>
      </div>
      <MarketplaceManagerClient />
    </div>
  )
}
