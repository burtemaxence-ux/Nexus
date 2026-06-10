'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff, User, Loader2, Calendar, Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

function useRegister() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [refCode, setRefCode] = useState<string | null>(null)

  // Read referral code from URL client-side to avoid SSR/Suspense issues
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) setRefCode(ref)
  }, [])

  async function handleGoogleRegister() {
    setGoogleLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_URL ?? window.location.origin}/auth/callback?next=/manager`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role: 'manager',
          ...(refCode ? { referral_code: refCode } : {}),
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_URL ?? window.location.origin}/auth/callback?next=/manager`,
      },
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        setError('Un compte existe déjà avec cet email. Connectez-vous.')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return { fullName, setFullName, email, setEmail, password, setPassword, error, loading, googleLoading, success, handleRegister, handleGoogleRegister }
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

const BENEFITS = [
  { icon: Calendar, label: 'Planning intelligent',    desc: 'Créez vos plannings rapidement.' },
  { icon: Clock,    label: 'Présences en temps réel', desc: 'Suivez retards et pointages.' },
  { icon: Users,   label: 'Congés synchronisés',      desc: "Centralisez les demandes d'absence." },
]

function MeshBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute rounded-full" style={{ width: 600, height: 600, top: '-160px', left: '-140px', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute rounded-full" style={{ width: 500, height: 500, top: '30%', right: '-100px', background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      <div className="absolute rounded-full" style={{ width: 450, height: 450, bottom: '-80px', left: '15%', background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
    </div>
  )
}

export default function RegisterPage() {
  const { fullName, setFullName, email, setEmail, password, setPassword, error, loading, googleLoading, success, handleRegister, handleGoogleRegister } = useRegister()
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="min-h-screen bg-[#EDEEFF] dark:bg-[#0F1117] lg:grid lg:grid-cols-2 relative">
      <MeshBackground />

      {/* Colonne gauche */}
      <div className="hidden lg:flex flex-col justify-between px-16 py-14 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#4F46E5] flex items-center justify-center font-bold text-white text-[17px] select-none">Q</div>
          <span className="text-[17px] font-semibold tracking-tight text-[#18181B] dark:text-[#F0F2F8]">Quartzbase</span>
        </div>
        <div className="space-y-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#4F46E5]/20 bg-white/60 text-[#4F46E5] text-[12px] font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
            14 jours d&apos;essai gratuit — aucune carte requise
          </div>
          <div className="space-y-4">
            <h1 className="text-[2.6rem] leading-[1.15] font-bold text-[#18181B] dark:text-[#F0F2F8] tracking-tight">
              Gérez votre équipe,<br />
              simplement{' '}
              <span className="text-[#4F46E5]">maîtrisé.</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-[#6B7280] dark:text-[#8B90A7] max-w-[360px]">
              Quartzbase remplace les logiciels de planning traditionnels. Planning, congés, badgeuse et conformité légale en un seul outil.
            </p>
          </div>
          <div className="space-y-5">
            {BENEFITS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-[18px] w-[18px] text-[#4F46E5]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#18181B] dark:text-[#F0F2F8] leading-tight">{label}</p>
                  <p className="text-[13px] text-[#6B7280] dark:text-[#8B90A7] leading-tight mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[12px] text-[#9CA3AF]">© 2026 Quartzbase by Quartz SAS</p>
      </div>

      {/* Colonne droite */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-16 relative z-10">
        <div className="lg:hidden mb-10 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#4F46E5] flex items-center justify-center font-bold text-white text-[14px] select-none">Q</div>
          <span className="text-[15px] font-semibold tracking-tight text-[#18181B] dark:text-[#F0F2F8]">Quartzbase</span>
        </div>

        <div className="w-full max-w-[420px] bg-white dark:bg-[#1A1D27] rounded-[20px] border border-[#E5E7EB] dark:border-[#2A2D3A] shadow-[0_4px_32px_0_rgba(79,70,229,0.08)] px-9 py-10">

          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-[22px] font-bold text-[#18181B] dark:text-[#F0F2F8]">Vérifiez vos emails</h2>
              <p className="text-[14px] text-[#6B7280] dark:text-[#8B90A7]">
                Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez dessus pour activer votre compte.
              </p>
              <Link href="/login" className="block text-[13px] text-[#4F46E5] hover:underline mt-2">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h2 className="text-[26px] font-bold text-[#18181B] dark:text-[#F0F2F8] tracking-tight">Créer un compte</h2>
                <p className="text-[14px] text-[#6B7280] dark:text-[#8B90A7] mt-1.5">14 jours d&apos;essai gratuit, sans carte bancaire</p>
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={googleLoading || loading}
                className={cn(
                  'w-full flex items-center justify-center gap-2.5 mb-5',
                  'px-4 py-3 rounded-xl text-[14px] font-medium text-[#374151] dark:text-[#F0F2F8]',
                  'bg-white dark:bg-[#1A1D27] border border-[#E5E7EB] dark:border-[#2A2D3A]',
                  'hover:bg-[#F9FAFB] dark:hover:bg-[#0F1117] transition-all duration-150',
                  'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              >
                {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                <span>Continuer avec Google</span>
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-[#F3F4F6] dark:bg-[#2A2D3A]" />
                <span className="text-[12px] text-[#9CA3AF] dark:text-[#4A4F66]">ou</span>
                <div className="flex-1 h-px bg-[#F3F4F6] dark:bg-[#2A2D3A]" />
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                {/* Nom complet */}
                <div className="space-y-1.5">
                  <label htmlFor="fullName" className="block text-[13px] font-medium text-[#374151] dark:text-[#F0F2F8]">Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#9CA3AF] pointer-events-none" />
                    <input
                      id="fullName" type="text" autoComplete="name" placeholder="Jean Dupont"
                      value={fullName} onChange={e => setFullName(e.target.value)} required disabled={loading}
                      className={cn('w-full pl-10 pr-4 py-3 text-[14px] text-[#18181B] dark:text-[#F0F2F8] placeholder:text-[#C4C9D4]', 'bg-white dark:bg-[#0F1117] border border-[#E5E7EB] dark:border-[#2A2D3A] rounded-xl outline-none', 'transition-all duration-150 hover:border-[#C7C8F0] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10', 'disabled:opacity-50 disabled:cursor-not-allowed')}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-[13px] font-medium text-[#374151] dark:text-[#F0F2F8]">Adresse email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#9CA3AF] pointer-events-none" />
                    <input
                      id="email" type="email" autoComplete="email" placeholder="vous@restaurant.fr"
                      value={email} onChange={e => setEmail(e.target.value)} required disabled={loading}
                      className={cn('w-full pl-10 pr-4 py-3 text-[14px] text-[#18181B] dark:text-[#F0F2F8] placeholder:text-[#C4C9D4]', 'bg-white dark:bg-[#0F1117] border border-[#E5E7EB] dark:border-[#2A2D3A] rounded-xl outline-none', 'transition-all duration-150 hover:border-[#C7C8F0] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10', 'disabled:opacity-50 disabled:cursor-not-allowed')}
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-[13px] font-medium text-[#374151] dark:text-[#F0F2F8]">Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#9CA3AF] pointer-events-none" />
                    <input
                      id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="8 caractères minimum"
                      value={password} onChange={e => setPassword(e.target.value)} required disabled={loading}
                      className={cn('w-full pl-10 pr-11 py-3 text-[14px] text-[#18181B] dark:text-[#F0F2F8] placeholder:text-[#C4C9D4]', 'bg-white dark:bg-[#0F1117] border border-[#E5E7EB] dark:border-[#2A2D3A] rounded-xl outline-none', 'transition-all duration-150 hover:border-[#C7C8F0] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10', 'disabled:opacity-50 disabled:cursor-not-allowed')}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                      {showPassword ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
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
                  type="submit" disabled={loading}
                  className={cn('w-full flex items-center justify-center gap-2 mt-1', 'px-4 py-3 rounded-xl text-[14px] font-semibold text-white', 'bg-[#4F46E5] hover:bg-[#4338CA] active:bg-[#3730A3]', 'transition-all duration-150 shadow-[0_2px_8px_0_rgba(79,70,229,0.35)]', 'disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none')}
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Création en cours…</span></> : <span>Créer mon compte</span>}
                </button>
              </form>

              <p className="mt-6 text-center text-[13px] text-[#6B7280]">
                Déjà un compte ?{' '}
                <Link href="/login" className="text-[#4F46E5] hover:underline font-medium">Se connecter</Link>
              </p>

              <p className="mt-4 text-center text-[11px] text-[#C4C9D4]">
                En créant un compte, vous acceptez nos{' '}
                <Link href="/legal/cgu" className="underline">CGU</Link>
                {' '}et notre{' '}
                <Link href="/legal/confidentialite" className="underline">politique de confidentialité</Link>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
