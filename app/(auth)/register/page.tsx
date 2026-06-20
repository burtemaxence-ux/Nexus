'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'

// ── Supabase auth logic — NE PAS MODIFIER ─────────────────────────────────────

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

export default function RegisterPage() {
  const { fullName, setFullName, email, setEmail, password, setPassword, error, loading, googleLoading, success, handleRegister, handleGoogleRegister } = useRegister()
  const [showPassword, setShowPassword] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Persist the referral code in a cookie so it survives the Google OAuth
  // round-trip (signInWithOAuth can't carry user_metadata). /api/auth/set-role
  // reads it as a fallback when user_metadata.referral_code is absent.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) {
      document.cookie = `qz_ref=${encodeURIComponent(ref)}; path=/; max-age=1800; SameSite=Lax`
    }
  }, [])

  useEffect(() => {
    if (!error || !cardRef.current) return
    const card = cardRef.current
    card.classList.add('auth-card-error')
    const timer = setTimeout(() => card.classList.remove('auth-card-error'), 400)
    return () => clearTimeout(timer)
  }, [error])

  if (success) {
    return (
      <div className="auth-card text-center space-y-5 py-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)' }}
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#00D4AA" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-[22px] font-bold" style={{ color: '#f0f0f8', fontFamily: 'var(--font-syne)' }}>
          Vérifiez vos emails
        </h2>
        <p className="text-[14px]" style={{ color: '#9090a8', fontFamily: 'var(--font-dm-sans)' }}>
          Un lien de confirmation a été envoyé à{' '}
          <strong style={{ color: '#f0f0f8' }}>{email}</strong>.
          Cliquez dessus pour activer votre compte.
        </p>
        <Link
          href="/login"
          className="block text-[13px] hover:underline transition-colors"
          style={{ color: '#6C63FF' }}
        >
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <div ref={cardRef} className="auth-card">

      {/* Titre + badges */}
      <div className="auth-cascade-1 flex flex-col items-center mb-7 text-center">
        <h2
          className="text-[22px] font-bold tracking-tight mb-3"
          style={{ color: '#f0f0f8', fontFamily: 'var(--font-syne)' }}
        >
          Démarrez votre essai gratuit
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {['30 jours', 'Sans carte bleue', 'Annulation libre'].map(badge => (
            <span key={badge} className="auth-badge-success">{badge}</span>
          ))}
        </div>
      </div>

      {/* Bouton Google */}
      <button
        type="button"
        onClick={handleGoogleRegister}
        disabled={googleLoading || loading}
        className="auth-cascade-2 auth-btn-google w-full flex items-center justify-center gap-2.5 mb-5"
      >
        {googleLoading
          ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#9090a8' }} />
          : <GoogleIcon />
        }
        <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '14px', color: '#f0f0f8' }}>
          S&apos;inscrire avec Google
        </span>
      </button>

      {/* Séparateur */}
      <div className="auth-cascade-3 flex items-center gap-3 mb-5">
        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <span className="text-[12px]" style={{ color: '#5a5a72', fontFamily: 'var(--font-dm-sans)' }}>
          ou continuer avec email
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
      </div>

      <form onSubmit={handleRegister} className="space-y-4">

        {/* Nom complet */}
        <div className="auth-cascade-4 space-y-1.5">
          <label htmlFor="fullName" className="auth-label block">Nom complet</label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Jean Dupont"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            disabled={loading}
            className="auth-input w-full"
          />
        </div>

        {/* Email */}
        <div className="auth-cascade-5 space-y-1.5">
          <label htmlFor="email" className="auth-label block">Adresse email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vous@restaurant.fr"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
            className="auth-input w-full"
          />
        </div>

        {/* Mot de passe */}
        <div className="auth-cascade-6 space-y-1.5">
          <label htmlFor="password" className="auth-label block">Mot de passe</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="8 caractères minimum"
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

        {/* Submit + liens */}
        <div className="auth-cascade-7 space-y-4 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="auth-btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Création en cours...</span>
              </>
            ) : (
              <span>Créer mon compte</span>
            )}
          </button>

          <p className="text-center text-[13px]" style={{ color: '#9090a8', fontFamily: 'var(--font-dm-sans)' }}>
            Déjà un compte ?{' '}
            <Link
              href="/login"
              className="font-medium hover:underline transition-colors duration-150"
              style={{ color: '#6C63FF' }}
            >
              Se connecter
            </Link>
          </p>

          <p className="text-center text-[11px]" style={{ color: '#5a5a72', fontFamily: 'var(--font-dm-sans)' }}>
            En créant un compte, vous acceptez nos{' '}
            <Link href="/legal/cgu" className="underline" style={{ color: '#5a5a72' }}>CGU</Link>
            {' '}et notre{' '}
            <Link href="/legal/confidentialite" className="underline" style={{ color: '#5a5a72' }}>
              politique de confidentialité
            </Link>.
          </p>
        </div>
      </form>
    </div>
  )
}
