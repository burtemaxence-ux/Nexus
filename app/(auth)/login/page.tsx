'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'

// ── Supabase auth logic — NE PAS MODIFIER ─────────────────────────────────────

function useLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_URL ?? window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

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

  return { email, setEmail, password, setPassword, error, loading, handleLogin, googleLoading, handleGoogleLogin }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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

// ── Page principale ────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { email, setEmail, password, setPassword, error, loading, handleLogin, googleLoading, handleGoogleLogin } = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!error || !cardRef.current) return
    const card = cardRef.current
    card.classList.add('auth-card-error')
    const timer = setTimeout(() => card.classList.remove('auth-card-error'), 400)
    return () => clearTimeout(timer)
  }, [error])

  return (
    <div ref={cardRef} className="auth-card">

      {/* Logo + sous-titre */}
      <div className="auth-cascade-1 flex flex-col items-center mb-8 text-center">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-[17px] select-none"
            style={{ backgroundColor: '#6C63FF', fontFamily: 'var(--font-syne)' }}
          >
            Q
          </div>
          <span
            className="text-[18px] font-bold tracking-tight"
            style={{ color: '#f0f0f8', fontFamily: 'var(--font-syne)' }}
          >
            Quartzbase
          </span>
        </div>
        <p className="text-[13px]" style={{ color: '#5a5a72', fontFamily: 'var(--font-dm-sans)' }}>
          Connectez-vous à votre espace
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">

        {/* Email */}
        <div className="auth-cascade-2 space-y-1.5">
          <label htmlFor="email" className="auth-label block">Adresse email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="votre@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
            className="auth-input w-full"
          />
        </div>

        {/* Mot de passe */}
        <div className="auth-cascade-3 space-y-1.5">
          <label htmlFor="password" className="auth-label block">Mot de passe</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
              className="auth-input w-full pr-11"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-150"
              style={{ color: '#5a5a72' }}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              tabIndex={-1}
              className="text-[12px] transition-colors duration-150 hover:underline"
              style={{ color: '#6C63FF', fontFamily: 'var(--font-dm-sans)' }}
            >
              Mot de passe oublié ?
            </button>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div
            className="flex gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)' }}
          >
            <span className="text-[13px] mt-px flex-shrink-0" style={{ color: '#FF6B6B' }}>✕</span>
            <p className="text-[13px] leading-snug" style={{ color: '#FF6B6B' }}>{error}</p>
          </div>
        )}

        {/* Bouton submit */}
        <button
          type="submit"
          disabled={loading}
          className="auth-cascade-4 auth-btn-primary w-full flex items-center justify-center gap-2 mt-1"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Connexion...</span>
            </>
          ) : (
            <span>Se connecter</span>
          )}
        </button>
      </form>

      {/* Séparateur */}
      <div className="auth-cascade-5 flex items-center gap-3 my-5">
        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <span className="text-[12px]" style={{ color: '#5a5a72', fontFamily: 'var(--font-dm-sans)' }}>
          ou continuer avec
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Bouton Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
        className="auth-cascade-6 auth-btn-google w-full flex items-center justify-center gap-2.5"
      >
        {googleLoading
          ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#9090a8' }} />
          : <GoogleIcon />
        }
        <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '14px', color: '#f0f0f8' }}>
          Continuer avec Google
        </span>
      </button>

      {/* Lien inscription */}
      <p
        className="auth-cascade-7 mt-6 text-center text-[13px]"
        style={{ color: '#9090a8', fontFamily: 'var(--font-dm-sans)' }}
      >
        Pas encore de compte ?{' '}
        <Link
          href="/register"
          className="font-medium transition-colors duration-150 hover:underline"
          style={{ color: '#6C63FF' }}
        >
          Essai gratuit 14 jours →
        </Link>
      </p>
    </div>
  )
}
