import { Resend } from 'resend'

export interface WeeklyBriefData {
  managerFirstName: string
  establishmentName: string
  weekLabel: string
  briefText: string      // 5 phrases générées par Claude
  siteUrl: string
}

function buildHtml(data: WeeklyBriefData): string {
  const { managerFirstName, establishmentName, weekLabel, briefText, siteUrl } = data

  // Split paragraphs on '. ' or '\n' to display as sentences
  const sentences = briefText
    .split(/(?<=\.)\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  const sentencesHtml = sentences
    .map(s => `<p style="margin:0 0 10px;color:#374151;font-size:15px;line-height:1.65;">${s}</p>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#111827;padding:28px 32px;">
            <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Nexus · RH Manager</p>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">📊 Brief semaine</h1>
            <p style="margin:8px 0 0;color:#d1d5db;font-size:14px;">${weekLabel} · ${establishmentName}</p>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:28px 32px 8px;">
            <p style="margin:0 0 20px;color:#111827;font-size:15px;">Bonjour <strong>${managerFirstName}</strong>,</p>
            ${sentencesHtml}
          </td>
        </tr>

        <!-- Separator -->
        <tr>
          <td style="padding:0 32px;">
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:8px 0 20px;" />
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;">
            <a href="${siteUrl}/manager"
               style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
              Ouvrir Nexus →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
              Vous recevez ce brief chaque lundi matin.<br>
              <a href="${siteUrl}/manager/settings/notifications" style="color:#6b7280;text-decoration:underline;">Gérer mes préférences de notifications</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendWeeklyBriefEmail(
  toEmail: string,
  data: WeeklyBriefData,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[weekly-brief-email] RESEND_API_KEY manquant')
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL ?? 'Quartzbase <noreply@quartzbase.fr>'

  const { weekLabel, establishmentName } = data
  const weekNum = weekLabel.match(/\d+/)?.[0] ?? ''

  await resend.emails.send({
    from,
    to: toEmail,
    subject: `📊 Brief semaine ${weekNum} — ${establishmentName}`,
    html: buildHtml(data),
  })
}
