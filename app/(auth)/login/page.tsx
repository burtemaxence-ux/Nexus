'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UtensilsCrossed, Calendar, Clock, Palmtree, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Preserved Supabase auth logic ─────────────────────────────────────────────

function useLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (
        error.message.includes('Email not confirmed') ||
        error.message.includes('email_not_confirmed')
      ) {
        setError("Compte non activé. Demandez à votre manager de vous renvoyer le lien d'accès.")
      } else if (
        error.message.includes('Invalid login credentials') ||
        error.message.includes('invalid_credentials')
      ) {
        setError("Email ou mot de passe incorrect. Si vous n'avez pas encore défini votre mot de passe, utilisez le lien envoyé par votre manager.")
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    const role = data.user?.user_metadata?.role as string | undefined
    router.push(role === 'manager' ? '/manager' : '/employee')
    router.refresh()
  }

  return { email, setEmail, password, setPassword, error, loading, handleLogin }
}

// ── Left panel — branding ─────────────────────────────────────────────────────

const BENEFITS = [
  { icon: Calendar, label: 'Planning intelligent',      desc: 'Construisez et ajustez les plannings en quelques clics.' },
  { icon: Clock,    label: 'Présences en temps réel',   desc: 'Suivez les badgeages et les retards instantanément.' },
  { icon: Palmtree, label: 'Congés synchronisés',       desc: 'Validez les absences sans friction, tout est centralisé.' },
]

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between px-14 py-14 bg-[#1C1741] text-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/10">
          <UtensilsCrossed className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-[15px] tracking-tight">D-pot</span>
      </div>

      {/* Main pitch */}
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-[2rem] leading-[1.2] font-semibold tracking-tight text-white">
            Le planning d&apos;équipe,<br />simplement maîtrisé.
          </h1>
          <p className="text-[15px] leading-relaxed text-white/55 max-w-[340px]">
            Gérez les horaires, absences et présences de votre établissement depuis une interface claire, rapide et moderne.
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-5">
          {BENEFITS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3.5">
              <div className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 flex-shrink-0">
                <Icon className="h-3.5 w-3.5 text-white/80" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-white/90 leading-snug">{label}</p>
                <p className="text-[12px] text-white/45 leading-snug mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-white/25">
        © {new Date().getFullYear()} D-pot — Tous droits réservés
      </p>
    </div>
  )
}

// ── Right panel — login card ──────────────────────────────────────────────────

export default function LoginPage() {
  const { email, setEmail, password, setPassword, error, loading, handleLogin } = useLogin()

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1fr]">
      <BrandPanel />

      {/* Right: form */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-14 bg-[#FAFAFA]">

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-10">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#4F46E5]">
            <UtensilsCrossed className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-[15px] text-[#18181B]">D-pot</span>
        </div>

        {/* Card */}
        <div className="w-full max-w-[400px] bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_2px_16px_0_rgba(0,0,0,0.06)] px-8 py-9">

          {/* Card header */}
          <div className="mb-8">
            <h2 className="text-[22px] font-semibold text-[#18181B] tracking-tight">Connexion</h2>
            <p className="text-[14px] text-[#6B7280] mt-1">Accédez à votre espace de gestion</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-[#374151]">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
                className={cn(
                  'w-full px-3.5 py-2.5 text-[14px] text-[#18181B] placeholder:text-[#9CA3AF]',
                  'bg-white border border-[#E5E7EB] rounded-xl outline-none',
                  'transition-all duration-150',
                  'focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/12',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[13px] font-medium text-[#374151]">
                  Mot de passe
                </label>
                <button
                  type="button"
                  tabIndex={-1}
                  className="text-[12px] text-[#4F46E5] hover:text-[#4338CA] transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                className={cn(
                  'w-full px-3.5 py-2.5 text-[14px] text-[#18181B] placeholder:text-[#9CA3AF]',
                  'bg-white border border-[#E5E7EB] rounded-xl outline-none',
                  'transition-all duration-150',
                  'focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/12',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <span className="text-red-400 mt-px flex-shrink-0 text-base leading-none">✕</span>
                <p className="text-[13px] text-red-600 leading-snug">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'px-4 py-2.5 rounded-xl text-[14px] font-medium text-white',
                'bg-[#4F46E5] hover:bg-[#4338CA] active:bg-[#3730A3]',
                'transition-all duration-150',
                'shadow-[0_1px_3px_0_rgba(79,70,229,0.3)]',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'group'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connexion en cours…</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Card footer */}
          <p className="mt-8 text-center text-[11px] text-[#9CA3AF]">
            D-pot — Gestion planning &amp; équipe
          </p>
        </div>
      </div>
    </div>
  )
}
