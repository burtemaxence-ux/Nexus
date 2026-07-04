import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/operator'

export const metadata = { title: 'Back-office — Quartzbase' }

// Toutes les pages /admin sont réservées à l'opérateur (OPERATOR_EMAILS).
// Double sécurité avec le middleware.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isOperator(user.email)) redirect('/login')

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  )
}
