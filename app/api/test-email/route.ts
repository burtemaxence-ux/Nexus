import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY non défini dans les variables d\'environnement' }, { status: 500 })
  }

  const body = await request.json()
  const { to } = body as { to: string }
  if (!to) return NextResponse.json({ error: 'Champ "to" requis' }, { status: 400 })

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL ?? 'D-pot Planning <onboarding@resend.dev>'

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: '✅ Test email D-pot — configuration OK',
    html: `
      <div style="font-family:sans-serif;padding:32px;max-width:480px;margin:0 auto;">
        <h2 style="color:#111;">✅ Configuration Resend OK !</h2>
        <p style="color:#555;">Cet email confirme que votre clé API Resend est bien configurée dans D-pot.</p>
        <p style="color:#555;">Les notifications de planning seront envoyées automatiquement à la publication.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#aaa;font-size:12px;">D-pot Planning · email de test</p>
      </div>
    `,
  })

  if (error) {
    return NextResponse.json({ error: error.message, detail: error }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data?.id, to, from })
}
