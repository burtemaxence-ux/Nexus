import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifyManagers } from '@/lib/notifications/notify'
import { getISOWeekNumber, getLastWeekBounds } from '@/lib/utils/dates'
import { sendWeeklyBriefEmail } from '@/lib/email/weekly-brief-email'
import { humanizeBrief } from '@/lib/notifications/humanize-brief'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { captureError } from '@/lib/logger'
import { sendSlackMessage } from '@/lib/integrations/slack'
import { BRIEF_FEATURE, collectBriefData, generateBriefSync, type EstablishmentBriefData } from '@/lib/briefs/manager-brief'

// Vercel Cron : tous les lundis à 07h00 UTC  →  "0 7 * * 1"
//
// Phase 2 du brief hebdo : récupère les briefs générés par la Batch API
// (soumis à 6h30 par weekly-brief-submit) et les envoie aux managers.
// Fallback par établissement : tout brief absent du batch (batch encore en
// cours, requête en erreur, soumission ratée) est généré en synchrone comme
// avant — le passage au batch ne peut faire perdre aucun brief.

const anthropic = new Anthropic()

export const maxDuration = 60

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const weekNum = getISOWeekNumber(getLastWeekBounds(now).start)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const results = { establishments: 0, briefs_sent: 0, from_batch: 0, errors: 0 }

  try {
    // ── Retrouver le job batch soumis à 6h30 (s'il existe) ────────────────
    const { data: job } = await supabaseAdmin
      .from('ai_batch_jobs')
      .select('id, batch_id, payload')
      .eq('feature', BRIEF_FEATURE)
      .eq('status', 'submitted')
      .gte('created_at', new Date(now.getTime() - 24 * 3600 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let entries: EstablishmentBriefData[]
    const briefByEst = new Map<string, string>()

    if (job) {
      entries = (job.payload ?? []) as EstablishmentBriefData[]
      try {
        const batch = await anthropic.messages.batches.retrieve(job.batch_id)
        if (batch.processing_status === 'ended') {
          for await (const result of await anthropic.messages.batches.results(job.batch_id)) {
            if (result.result.type === 'succeeded') {
              const block = result.result.message.content[0]
              if (block?.type === 'text') briefByEst.set(result.custom_id, block.text.trim())
            }
          }
        } else {
          console.warn(`[weekly-brief] batch ${job.batch_id} pas terminé (${batch.processing_status}) — fallback synchrone`)
        }
      } catch (err) {
        captureError(err, { context: 'weekly-brief-manager', batch_id: job.batch_id })
      }
      // Marquer le job traité quoi qu'il arrive : les briefs manquants sont
      // régénérés en synchrone ci-dessous, le job ne doit pas être rejoué.
      await supabaseAdmin.from('ai_batch_jobs').update({ status: 'processed' }).eq('id', job.id)
    } else {
      // Pas de batch soumis : chemin synchrone historique complet.
      entries = await collectBriefData(now)
    }

    if (!entries.length) {
      return NextResponse.json({ message: 'Aucun établissement actif', ...results })
    }

    for (const entry of entries) {
      try {
        results.establishments++

        const { data: managers } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'manager')
          .eq('archived', false)
          .or(`establishment_id.eq.${entry.est_id},active_establishment_id.eq.${entry.est_id}`)
          .not('email', 'is', null)

        if (!managers?.length) continue

        const fromBatch = briefByEst.get(entry.est_id)
        if (fromBatch) results.from_batch++
        const briefText = humanizeBrief(fromBatch ?? await generateBriefSync(anthropic, entry.context))
        const weekLabel = entry.week_label

        // ── Envoi email + notification pour chaque manager ────────────────
        const managerIds = managers.map((m: { id: string }) => m.id)

        await Promise.allSettled(
          (managers as { id: string; full_name: string | null; email: string }[]).map(async (manager) => {
            const firstName = manager.full_name?.split(' ')[0] ?? 'Manager'

            // Email Resend
            if (manager.email) {
              await sendWeeklyBriefEmail(manager.email, {
                managerFirstName: firstName,
                establishmentName: entry.est_name,
                weekLabel,
                briefText,
                siteUrl,
              }).catch(e => console.error('[weekly-brief] email error:', e.message))
            }
          })
        )

        // Notification in-app + push (groupée pour tous les managers)
        await notifyManagers({
          managerIds,
          establishmentId: entry.est_id,
          type: 'weekly_brief',
          title: `📊 Brief ${weekLabel}`,
          body: briefText.slice(0, 220),
          // Brief complet humanisé, lu tel quel par la carte « Brief IA » du home.
          data: { full: briefText, week_label: weekLabel },
          actionUrl: '/manager',
          pushTitle: `📊 Brief semaine disponible`,
          pushBody: briefText.slice(0, 100),
        })

        const webhookUrl = process.env.SLACK_WEBHOOK_URL
        if (webhookUrl) {
          const firstSentence = briefText.split('\n')[0]
          const slackMsg = `📊 Brief semaine ${weekNum} — ${entry.est_name} : ${firstSentence}`
          await sendSlackMessage(webhookUrl, slackMsg).catch(e => console.error('Slack:', e))
        }

        results.briefs_sent++
        console.log(`[weekly-brief] ${entry.est_name} → brief envoyé à ${managers.length} manager(s)`)
      } catch (err) {
        captureError(err, { context: 'weekly-brief-manager', etablissement: entry.est_id })
        results.errors++
      }
    }

    console.log('[weekly-brief-manager] done:', results)
    return NextResponse.json(results)
  } catch (err) {
    captureError(err, { cron: 'weekly-brief-manager', fatal: true })
    return NextResponse.json({ error: 'Erreur serveur', ...results }, { status: 500 })
  }
}
