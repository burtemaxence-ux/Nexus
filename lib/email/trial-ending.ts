import { Resend } from 'resend'

function buildHtml(firstName: string): string {
  const billingUrl = `${process.env.NEXT_PUBLIC_URL ?? 'https://quartzbase.fr'}/billing`

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
            <p style="margin:0 0 4px;color:#9ca3af;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Quartzbase</p>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">⏰ Votre essai se termine dans 3 jours</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px 20px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;">Bonjour <strong>${firstName}</strong>,</p>
            <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">
              Votre période d'essai gratuit sur Quartzbase se termine dans <strong style="color:#374151;">3 jours</strong>. Après cette date, votre accès sera suspendu.
            </p>
            <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
              Pour continuer à utiliser Quartzbase sans interruption — planning, badgeuse, congés, conformité légale — activez votre abonnement dès maintenant.
            </p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:8px 32px 28px;text-align:center;">
            <a href="${billingUrl}"
               style="display:inline-block;padding:13px 28px;background:#4F46E5;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
              Activer mon abonnement →
            </a>
            <p style="margin:12px 0 0;color:#9ca3af;font-size:12px;">
              À partir de 49€/mois. Annulation à tout moment.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:0 32px 28px;border-top:1px solid #f3f4f6;">
            <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
              Cet email a été envoyé automatiquement — merci de ne pas y répondre.<br>
              <span style="color:#d1d5db;">Quartzbase</span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendTrialEndingEmail(email: string, fullName: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY non défini — trial-ending email ignoré')
    return
  }

  const resend = new Resend(apiKey)
  const firstName = fullName.split(' ')[0] || fullName || 'Manager'
  const from = process.env.RESEND_FROM_EMAIL ?? 'Quartzbase <noreply@quartzbase.fr>'

  try {
    await resend.emails.send({
      from,
      to: email,
      subject: '⏰ Votre essai Quartzbase se termine dans 3 jours',
      html: buildHtml(firstName),
    })
  } catch (err) {
    console.error('[email] Erreur envoi trial-ending:', err)
  }
}
