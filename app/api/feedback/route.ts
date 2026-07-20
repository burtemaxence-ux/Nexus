import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifyOps } from '@/lib/ops-alert'

const schema = z.object({
  message: z.string().trim().min(5, 'Merci de décrire un peu plus le problème.').max(2000),
  // Motif + sujet : envoyés par la page /manager/support (facultatifs — le
  // bouton flottant « Signaler un problème » n'envoie que `message`).
  category: z.string().trim().max(80).optional(),
  subject: z.string().trim().max(120).optional(),
  url: z.string().max(500).optional(),
  userAgent: z.string().max(500).optional(),
})

// POST /api/feedback — enregistre un signalement et alerte l'opérateur.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const parsed = schema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide' }, { status: 400 })
    }
    const { message, category, subject, url, userAgent } = parsed.data

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, establishment_id, active_establishment_id')
      .eq('id', user.id)
      .single()

    const establishmentId = profile?.active_establishment_id ?? profile?.establishment_id ?? null

    const { error } = await supabaseAdmin.from('support_reports').insert({
      user_id: user.id,
      user_email: user.email ?? null,
      user_name: profile?.full_name ?? null,
      role: profile?.role ?? null,
      establishment_id: establishmentId,
      url: url ?? null,
      user_agent: userAgent ?? null,
      category: category || null,
      subject: subject || null,
      message,
    })
    if (error) {
      console.error('[feedback POST]', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // Alerte opérateur (non bloquant : notifyOps ne lève jamais d'erreur).
    await notifyOps({
      subject: `Nouveau signalement${subject ? ` — ${subject}` : ''} — ${profile?.full_name ?? user.email}`,
      body: [
        `De : ${user.email ?? '—'} (${profile?.role ?? 'rôle inconnu'})`,
        category ? `Motif : ${category}` : null,
        subject ? `Sujet : ${subject}` : null,
        `Page : ${url ?? '—'}`,
        '',
        message,
      ].filter(Boolean).join('\n'),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[feedback POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
