'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit3, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ProfilActions() {
  const router = useRouter()
  const [editNotice, setEditNotice] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-2.5">
      <button
        onClick={() => setEditNotice(true)}
        className="w-full flex items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 text-[14px] font-semibold transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-dm-sans)' }}
      >
        <Edit3 className="h-4 w-4" />
        Modifier mes informations
      </button>
      {editNotice && (
        <p className="text-center text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          Édition du profil — bientôt disponible.
        </p>
      )}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 text-[14px] font-semibold transition-colors"
        style={{ backgroundColor: 'transparent', color: 'var(--danger)', border: '1px solid var(--border)', fontFamily: 'var(--font-dm-sans)' }}
      >
        <LogOut className="h-4 w-4" />
        Se déconnecter
      </button>
    </div>
  )
}
