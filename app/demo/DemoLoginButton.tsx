'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ensureDemoAuth } from './actions'

const DEMO_EMAIL    = 'demo@quartzbase.fr'
const DEMO_PASSWORD = 'Demo2024!'

export default function DemoLoginButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    await ensureDemoAuth()
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    })
    if (authError) {
      console.error('[Demo] signInWithPassword error:', authError.message)
      setError('Une erreur est survenue. Réessayez dans quelques instants.')
      setLoading(false)
      return
    }
    router.push('/manager')
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-70 text-white text-[15px] font-semibold transition-all duration-150 shadow-[0_2px_8px_0_rgba(79,70,229,0.35)] hover:shadow-[0_4px_12px_0_rgba(79,70,229,0.4)]"
      >
        {loading ? 'Connexion…' : 'Essayer la démo'}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  )
}
