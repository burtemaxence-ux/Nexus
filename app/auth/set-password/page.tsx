'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'

type PageState = 'loading' | 'ready' | 'error'

export default function SetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // PKCE flow: ?code= in query string (code verifier was set on same device — unlikely for invite)
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setSessionError("Le lien d'invitation a expiré ou est invalide. Demandez un nouvel accès au manager.")
          setPageState('error')
        } else {
          setPageState('ready')
        }
      })
      return
    }

    // Hash-based / implicit flow: Supabase processes #access_token automatically.
    // Listen for the SIGNED_IN event which fires once the hash is exchanged.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        setPageState('ready')
      }
    })

    // Also check immediately — session may already be present if page reloaded
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPageState('ready')
      }
    })

    // Timeout: if no session after 8 seconds, the link is invalid/expired
    const timeout = setTimeout(() => {
      setPageState(prev => {
        if (prev === 'loading') {
          setSessionError("Le lien d'invitation a expiré ou est invalide. Demandez un nouvel accès au manager.")
          return 'error'
        }
        return prev
      })
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.user_metadata?.role
    router.push(role === 'manager' ? '/manager' : '/employee')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 mb-4">
            {pageState === 'loading' ? (
              <Loader2 className="h-7 w-7 text-white animate-spin" />
            ) : (
              <KeyRound className="h-7 w-7 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {pageState === 'error' ? 'Lien invalide' : 'Créez votre mot de passe'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            {pageState === 'loading' && "Vérification de votre invitation…"}
            {pageState === 'ready' && 'Bienvenue ! Choisissez un mot de passe pour accéder à votre espace.'}
            {pageState === 'error' && sessionError}
          </p>
        </div>

        {pageState === 'ready' && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Nouveau mot de passe</CardTitle>
              <CardDescription>Minimum 8 caractères</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoFocus
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm"
                    type={showPwd ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Accéder à mon espace'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
