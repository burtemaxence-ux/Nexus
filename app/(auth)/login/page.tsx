'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff, Calendar, Clock, Users, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
// TODO: i18n — apply useTranslations('auth') to all hardcoded strings below

// ── Supabase auth logic — NE PAS MODIFIER ─────────────────────────────────────────

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
      if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        setError("Compte non activé. Demandez à votre manager de vous renvoyer le lien d'accès.")
      } else if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
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

// ── Sub-components ──────────────────────────────────────────────────────────────────

function NexusLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const s = size === 'md'
  return (
    <div className={cn('flex items-center', s ? 'gap-2.5' : 'gap-2')}>
      <div className={cn(
        'rounded-xl bg-[#4F46E5] flex items-center justify-center font-bold text-white select-none',
        s ? 'w-9 h-9 text-[17px]' : 'w-7 h-7 text-[14px]'
      )}>
        D
      </div>
      <span className={cn('font-semibold tracking-tight text-[#18181B]', s ? 'text-[17px]' : 'text-[15px]')}>
        Nexus
      </span>
    </div>
  )
}

const BENEFITS = [
  {
    icon: Calendar,
    label: 'Planning intelligent',
    desc: 'Créez vos plannings rapidement.',
  },
  {
    icon: Clock,
    label: 'Présences en temps réel',
    desc: 'Suivez retards et pointages.',
  },
  {
    icon: Users,
    label: 'Congés synchronisés',
    desc: "Centralisez les demandes d'absence.",
  },
]

function AppMockup() {
  return (
    <div className="relative w-full max-w-[360px]">
      <div className="rounded-2xl border border-[#4F46E5]/10 bg-white/70 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#4F46E5]/08 bg-white/50">
          <div className="w-2 h-2 rounded-full bg-[#4F46E5]/30" />
          <div className="h-1.5 w-20 rounded-full bg-[#4F46E5]/15" />
          <div className="ml-auto h-1.5 w-10 rounded-full bg-[#4F46E5]/10" />
        </div>
        <div className="px-4 py-3 space-y-2">
          {[70, 50, 85, 60].map((w, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-md bg-[#4F46E5]/10 flex-shrink-0" />
              <div className="flex gap-1.5 flex-1">
                <div className="h-1.5 rounded-full bg-[#4F46E5]/20" style={{ width: `${w}%` }} />
              </div>
              <div className="h-4 w-8 rounded-md bg-[#4F46E5]/10 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -right-4 top-6 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 shadow-sm flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-[11px] font-medium text-[#374151]">12 présents</span>
      </div>

      <div className="absolute -left-2 -bottom-3 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 shadow-sm">
        <span className="text-[11px] font-medium text-[#374151]">3 congés en attente</span>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function MeshBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div
        className="absolute rounded-full"
        style={{
          width: 600,
          height: 600,
          top: '-160px',
          left: '-140px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          top: '30%',
          right: '-100px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 450,
          height: 450,
          bottom: '-80px',
          left: '15%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 280,
          height: 280,
          top: '8%',
          right: '30%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { email, setEmail, password, setPassword, error, loading, handleLogin } = useLogin()
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="min-h-screen bg-[#EDEEFF] lg:grid lg:grid-cols-2 relative">
      <MeshBackground />

      <div className="hidden lg:flex flex-col justify-between px-16 py-14 relative z-10">

        <NexusLogo size="md" />

        <div className="space-y-10">

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#4F46E5]/20 bg-white/60 text-[#4F46E5] text-[12px] font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
            Le logiciel de planning nouvelle génération
          </div>

          <div className="space-y-4">
            <h1 className="text-[2.6rem] leading-[1.15] font-bold text-[#18181B] tracking-tight">
              Le planning d&apos;équipe,<br />
              simplement{' '}
              <span className="text-[#4F46E5]">maîtrisé.</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-[#6B7280] max-w-[360px]">
              Gérez les horaires, absences et présences de votre établissement depuis une interface claire, rapide et fiable.
            </p>
          </div>

          <div className="space-y-5">
            {BENEFITS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-[18px] w-[18px] text-[#4F46E5]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#18181B] leading-tight">{label}</p>
                  <p className="text-[13px] text-[#6B7280] leading-tight mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <AppMockup />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-16 relative z-10">
        <div className="absolute top-4 right-4 z-20">
          <LanguageSwitcher />
        </div>

        <div className="lg:hidden mb-10">
          <NexusLogo size="sm" />
        </div>

        <div className="w-full max-w-[420px] bg-white rounded-[20px] border border-[#E5E7EB] shadow-[0_4px_32px_0_rgba(79,70,229,0.08)] px-9 py-10">

          <div className="mb-8 text-center">
            <h2 className="text-[26px] font-bold text-[#18181B] tracking-tight">
              Connexion
            </h2>
            <p className="text-[14px] text-[#6B7280] mt-1.5">
              Accédez à votre espace de gestion
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-[#374151]">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#9CA3AF] pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className={cn(
                    'w-full pl-10 pr-4 py-3 text-[14px] text-[#18181B] placeholder:text-[#C4C9D4]',
                    'bg-white border border-[#E5E7EB] rounded-xl outline-none',
                    'transition-all duration-150',
                    'hover:border-[#C7C8F0]',
                    'focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-medium text-[#374151]">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#9CA3AF] pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={cn(
                    'w-full pl-10 pr-11 py-3 text-[14px] text-[#18181B] placeholder:text-[#C4C9D4]',
                    'bg-white border border-[#E5E7EB] rounded-xl outline-none',
                    'transition-all duration-150',
                    'hover:border-[#C7C8F0]',
                    'focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                >
                  {showPassword
                    ? <EyeOff className="h-[15px] w-[15px]" />
                    : <Eye className="h-[15px] w-[15px]" />
                  }
                </button>
              </div>
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  tabIndex={-1}
                  className="text-[12px] text-[#4F46E5] hover:text-[#4338CA] transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </div>

            {error && (
              <div className="flex gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <span className="text-red-400 text-[13px] mt-px flex-shrink-0">✕</span>
                <p className="text-[13px] text-red-600 leading-snug">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 mt-1',
                'px-4 py-3 rounded-xl text-[14px] font-semibold text-white',
                'bg-[#4F46E5] hover:bg-[#4338CA] active:bg-[#3730A3]',
                'transition-all duration-150',
                'shadow-[0_2px_8px_0_rgba(79,70,229,0.35)]',
                'hover:shadow-[0_4px_12px_0_rgba(79,70,229,0.4)]',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connexion en cours…</span>
                </>
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#F3F4F6]" />
            <span className="text-[12px] text-[#9CA3AF]">ou</span>
            <div className="flex-1 h-px bg-[#F3F4F6]" />
          </div>

          <button
            type="button"
            disabled
            className={cn(
              'w-full flex items-center justify-center gap-2.5',
              'px-4 py-3 rounded-xl text-[14px] font-medium text-[#374151]',
              'bg-white border border-[#E5E7EB]',
              'hover:bg-[#F9FAFB] transition-all duration-150',
              'opacity-60 cursor-not-allowed'
            )}
          >
            <GoogleIcon />
            <span>Se connecter avec Google</span>
          </button>

          <p className="mt-8 text-center text-[11px] text-[#C4C9D4]">
            Nexus — Gestion planning &amp; équipe
          </p>
        </div>
      </div>
    </div>
  )
}
