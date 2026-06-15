import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications/create'
import { sendPushToUser } from '@/lib/push'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { captureError } from '@/lib/logger'
import { sendSlackMessage } from '@/lib/integrations/slack'

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const nowIso = now.toISOString()

    // ── 1. Relance : demandes pending expirant dans < 15 minutes ──────────────
    // et dont aucune relance n'a encore été envoyée (pas de notif type sos_reminder
    // dans les dernières 45 min pour ces candidats)

    const in15min = new Date(now.getTime() + 15 * 60 * 1000).toISOString()

    const { data: soonExpiring } = await supabaseAdmin
      .from('replacement_requests')
      .select('id, candidates, shift_id, establishment_id, expires_at')
      .eq('status', 'pending')
      .lte('expires_at', in15min)
      .gt('expires_at', nowIso)

    let relanceCount = 0

    if (soonExpiring && soonExpiring.length > 0) {
      for (const rr of soonExpiring) {
        type Candidate = {
          employee_id: string
          score: number
          explanation: string
          notified_at: string | null
          response: string | null
        }
        const candidates: Candidate[] = Array.isArray(rr.candidates) ? rr.candidates : []

        // Candidats qui n'ont pas encore répondu
        const pendingCandidateIds = candidates
          .filter(c => c.response === null || c.response === undefined)
          .map(c => c.employee_id)

        if (pendingCandidateIds.length === 0) continue

        // Vérifier qu'aucune relance récente (45 min) n'a déjà été envoyée
        const since45min = new Date(now.getTime() - 45 * 60 * 1000).toISOString()
        const { data: recentRelances } = await supabaseAdmin
          .from('notifications')
          .select('user_id')
          .eq('type', 'sos_reminder')
          .in('user_id', pendingCandidateIds)
          .gte('created_at', since45min)

        const alreadyRelanced = new Set(
          (recentRelances ?? []).map((n: { user_id: string }) => n.user_id)
        )

        const toRelance = pendingCandidateIds.filter(id => !alreadyRelanced.has(id))
        if (toRelance.length === 0) continue

        // Récupérer les infos du shift pour le message
        const { data: shift } = await supabaseAdmin
          .from('shifts')
          .select('start_time, end_time, position, date')
          .eq('id', rr.shift_id)
          .single()

        const fmtTime = shift
          ? `${shift.start_time.slice(0, 5)}→${shift.end_time.slice(0, 5)}`
          : 'ce créneau'
        const actionUrl = `/employee/replacement/${rr.id}`

        // Notifications in-app
        await createNotification({
          user_ids: toRelance,
          establishment_id: rr.establishment_id,
          type: 'sos_reminder',
          title: '⏰ Shift toujours disponible — Dernier appel !',
          body: `${fmtTime} · Plus que quelques minutes pour répondre !`,
          data: { replacement_request_id: rr.id },
          action_url: actionUrl,
        })

        // Push notifications
        for (const candidateId of toRelance) {
          sendPushToUser(supabaseAdmin, candidateId, {
            title: '⏰ Shift toujours disponible — Dernier appel !',
            body: `${fmtTime} · Réponds avant expiration !`,
            url: actionUrl,
          }).catch(console.error)
        }

        relanceCount += toRelance.length
        console.log(`[check-replacements] relance envoyée pour rr=${rr.id} → ${toRelance.length} candidats`)
      }
    }

    // ── 2. Expiration : demandes pending dont expires_at < NOW() ─────────────

    const { data: expiredRrs } = await supabaseAdmin
      .from('replacement_requests')
      .select('id, candidates, shift_id, establishment_id, expires_at')
      .eq('status', 'pending')
      .lt('expires_at', nowIso)

    let expiredCount = 0

    if (expiredRrs && expiredRrs.length > 0) {
      // Passer en status 'expired' en batch
      const expiredIds = expiredRrs.map(rr => rr.id)
      await supabaseAdmin
        .from('replacement_requests')
        .update({ status: 'expired' })
        .in('id', expiredIds)

      // Pour chaque demande expirée, notifier les managers
      for (const rr of expiredRrs) {
        const { data: shift } = await supabaseAdmin
          .from('shifts')
          .select('start_time, end_time, date')
          .eq('id', rr.shift_id)
          .single()

        const fmtTime = shift
          ? `${shift.start_time.slice(0, 5)}→${shift.end_time.slice(0, 5)}`
          : 'le shift'

        // Récupérer les managers de l'établissement
        const { data: managers } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('establishment_id', rr.establishment_id)
          .in('role', ['manager', 'supervisor'])

        if (managers && managers.length > 0) {
          const managerIds = managers.map((m: { id: string }) => m.id)

          await createNotification({
            user_ids: managerIds,
            establishment_id: rr.establishment_id,
            type: 'replacement_expired',
            title: '⏰ Aucun candidat disponible',
            body: `Aucun candidat n'a répondu pour ${fmtTime}. Voir la liste complète →`,
            data: { replacement_request_id: rr.id, shift_id: rr.shift_id },
            action_url: '/manager/planning',
          })

          for (const manager of managers as { id: string }[]) {
            sendPushToUser(supabaseAdmin, manager.id, {
              title: '⏰ Aucun remplaçant trouvé',
              body: `Le shift ${fmtTime} n'a pas été pourvu. Action requise.`,
              url: '/manager/planning',
            }).catch(console.error)
          }
        }

        const webhookUrl = process.env.SLACK_WEBHOOK_URL
        if (webhookUrl) {
          const { data: estData } = await supabaseAdmin
            .from('establishments')
            .select('name')
            .eq('id', rr.establishment_id)
            .single()
          const estName = estData?.name ?? rr.establishment_id
          const slackMsg = `⚡ Remplacement expiré — ${estName} : Shift ${fmtTime} non couvert. Aucun candidat n'a répondu.`
          await sendSlackMessage(webhookUrl, slackMsg).catch(e => console.error('Slack:', e))
        }

        expiredCount++
      }

      console.log(`[check-replacements] expired=${expiredCount} rr ids: ${expiredIds.join(', ')}`)
    }

    // ── 3. Expiration des créneaux marketplace dépassés ──────────────────────
    // Les slots ouverts dont expires_at est passé restaient 'open' (filtrés
    // seulement à la lecture). On les passe explicitement en 'expired'.
    const { data: expiredSlots } = await supabaseAdmin
      .from('marketplace_slots')
      .update({ status: 'expired' })
      .eq('status', 'open')
      .lt('expires_at', nowIso)
      .select('id')

    return NextResponse.json({
      ok: true,
      relance_notifications: relanceCount,
      expired: expiredCount,
      marketplace_expired: expiredSlots?.length ?? 0,
      checked_at: nowIso,
    })
  } catch (err) {
    captureError(err, { cron: 'check-replacements' })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
