import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/operator'
import { captureError } from '@/lib/logger'

// ⚠️ TEMPORAIRE — endpoint de vérification Sentry, réservé à l'opérateur.
// Déclenche volontairement une erreur capturée pour prouver que la remontée
// serveur → Sentry fonctionne. À RETIRER une fois la validation faite.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isOperator(user.email)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const marker = `SENTRY_TEST_${Date.now()}`
  await captureError(new Error(`Test Sentry volontaire — ${marker}`), {
    context: 'sentry-test',
    operator: user.email,
  })

  return NextResponse.json({ ok: true, marker, message: 'Erreur de test envoyée à Sentry.' })
}
