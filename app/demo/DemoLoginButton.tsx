'use client'

import { useState } from 'react'
import { ArrowRight, Copy, Check } from 'lucide-react'
import { getDemoMagicLink } from './actions'

const DEMO_EMAIL    = 'demo@quartzbase.fr'
const DEMO_PASSWORD = 'Demo2024!'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-[#F3F4F6] dark:hover:bg-white/10 transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-[#9CA3AF]" />}
    </button>
  )
}

export default function DemoLoginButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    const { url, error: linkError } = await getDemoMagicLink()
    if (linkError || !url) {
      console.error('[Demo] magic link error:', linkError)
      setError('Connexion impossible. Réessayez dans quelques instants.')
      setLoading(false)
      return
    }
    window.location.href = url
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#1A1D27] divide-y divide-[#E5E7EB] dark:divide-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide font-medium mb-0.5">Identifiant</p>
            <p className="text-[14px] font-medium text-[#18181B] dark:text-[#F0F2F8]">{DEMO_EMAIL}</p>
          </div>
          <CopyButton text={DEMO_EMAIL} />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide font-medium mb-0.5">Mot de passe</p>
            <p className="text-[14px] font-medium text-[#18181B] dark:text-[#F0F2F8]">{DEMO_PASSWORD}</p>
          </div>
          <CopyButton text={DEMO_PASSWORD} />
        </div>
      </div>

      {error && <p className="text-[12px] text-red-600 text-center">{error}</p>}

      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-70 text-white text-[15px] font-semibold transition-all duration-150 shadow-[0_2px_8px_0_rgba(79,70,229,0.35)]"
      >
        {loading ? 'Connexion…' : 'Se connecter à la démo'}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>
    </div>
  )
}
