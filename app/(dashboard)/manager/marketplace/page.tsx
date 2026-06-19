import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarketplaceManagerClient from './marketplace-manager-client'
import { PageHeader } from '@/components/ui/page-header'

export const metadata = { title: 'Marketplace remplaçants — Quartzbase' }

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
      <PageHeader
        title="Marketplace remplaçants"
        subtitle="Publiez des shifts disponibles et trouvez un remplaçant en quelques minutes."
      />
      <MarketplaceManagerClient />
    </div>
  )
}
