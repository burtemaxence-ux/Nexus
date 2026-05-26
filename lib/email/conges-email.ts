import { Resend } from 'resend'
import type { LeaveType } from '@/types'

const LEAVE_LABELS: Record<LeaveType, string> = {
  CP: 'Congés payés', RTT: 'RTT', maladie: 'Arrêt maladie', sans_solde: 'Sans solde', autre: 'Autre',
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function countDays(start: string, end: string): number {
  return Math.round((new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86400000) + 1
}

function buildHtml({
  firstName, status, type, startDate, endDate, managerComment,
}: {
  firstName: string
  status: 'approved' | 'rejected'
  type: LeaveType
  startDate: string
  endDate: string
  managerComment?: string | null
}): string {
  const isApproved = status === 'approved'
  const days = countDays(startDate, endDate)
  const dateRange = startDate === endDate
    ? formatDate(startDate)
    : `${formatDate(startDate)} → ${formatDate(endDate)}`

  const accent = isApproved ? '#16a34a' : '#dc2626'
  const accentLight = isApproved ? '#f0fdf4' : '#fef2f2'
  const statusLabel = isApproved ? '✅ Demande validée' : '❌ Demande refusée'
  const statusText = isApproved
    ? `Votre demande de <strong>${LEAVE_LABELS[type]}</strong> a été <strong>acceptée</strong> par votre responsable.`
    : `Votre demande de <strong>${LEAVE_LABELS[type]}</strong> a été <strong>refusée</strong> par votre responsable.`

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <tr>
          <td style="background:#111827;padding:28px 32px;">
            <p style="margin:0 0 4px;color:#9ca3af;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Nexus by Quartz</p>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${statusLabel}</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 32px 20px;">
            <p style="margin:0 0 16px;color:#111827;font-size:15px;">Bonjour <strong>${firstName}</strong>,</p>
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${statusText}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:${accentLight};border:1px solid ${accent}20;border-radius:8px;overflow:hidden;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Détails</p>
                  <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#111827;">${LEAVE_LABELS[type]}</p>
                  <p style="margin:0;font-size:14px;color:#374151;">${dateRange}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">${days} jour${days > 1 ? 's' : ''}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${managerComment ? `
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Message de votre responsable</p>
                  <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;font-style:italic;">&ldquo;${managerComment}&rdquo;</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ` : ''}

        <tr>
          <td style="padding:0 32px 28px;border-top:1px solid #f3f4f6;">
            <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
              Cet email a été envoyé automatiquement — merci de ne pas y répondre.<br>
              <span style="color:#d1d5db;">Nexus by Quartz</span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendLeaveDecisionEmail({
  toEmail,
  firstName,
  status,
  type,
  startDate,
  endDate,
  managerComment,
}: {
  toEmail: string
  firstName: string
  status: 'approved' | 'rejected'
  type: LeaveType
  startDate: string
  endDate: string
  managerComment?: string | null
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY non défini — notification congé ignorée')
    return
  }

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL ?? 'Nexus by Quartz <onboarding@resend.dev>'
  const subject = status === 'approved'
    ? `✅ Votre congé a été validé — ${LEAVE_LABELS[type]}`
    : `❌ Votre congé a été refusé — ${LEAVE_LABELS[type]}`

  try {
    await resend.emails.send({
      from,
      to: toEmail,
      subject,
      html: buildHtml({ firstName, status, type, startDate, endDate, managerComment }),
    })
    console.log(`[email] Notification congé envoyée à ${toEmail}`)
  } catch (err) {
    console.error('[email] Erreur notification congé:', err)
  }
}
