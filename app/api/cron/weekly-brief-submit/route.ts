import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { captureError } from '@/lib/logger'
import { BRIEF_FEATURE, BRIEF_MODEL, BRIEF_MAX_TOKENS, buildBriefPrompt, collectBriefData } from '@/lib/briefs/manager-brief'

// Vercel Cron : tous les lundis à 06h30 UTC  →  "30 6 * * 1"
//
// Phase 1 du brief hebdo : soumet la génération des briefs à la Batch API
// Anthropic (−50 % du coût vs appels directs) et enregistre le job dans
// `ai_batch_jobs`. La phase 2 (weekly-brief-manager, 7h00) récupère les
// résultats et envoie les briefs. Si cette soumission échoue, aucun job
// n'est enregistré et le cron de 7h régénère tout en synchrone — le brief
// part dans tous les cas.

const anthropic = new Anthropic()

export const maxDuration = 60

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const entries = await collectBriefData(new Date())
    if (!entries.length) {
      return NextResponse.json({ message: 'Aucun établissement avec activité', submitted: 0 })
    }

    const batch = await anthropic.messages.batches.create({
      requests: entries.map((e) => ({
        custom_id: e.est_id,
        params: {
          model: BRIEF_MODEL,
          max_tokens: BRIEF_MAX_TOKENS,
          messages: [{ role: 'user', content: buildBriefPrompt(e.context) }],
        },
      })),
    })

    const { error } = await supabaseAdmin
      .from('ai_batch_jobs')
      .insert({ feature: BRIEF_FEATURE, batch_id: batch.id, payload: entries })
    if (error) throw error

    console.log(`[weekly-brief-submit] batch ${batch.id} soumis (${entries.length} établissement(s))`)
    return NextResponse.json({ submitted: entries.length, batch_id: batch.id })
  } catch (err) {
    captureError(err, { cron: 'weekly-brief-submit' })
    // Pas de job enregistré → weekly-brief-manager (7h) régénère en synchrone.
    return NextResponse.json({ error: 'Batch non soumis — fallback synchrone à 7h' }, { status: 500 })
  }
}
