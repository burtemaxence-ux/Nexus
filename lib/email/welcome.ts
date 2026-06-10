import { Resend } from 'resend'

function buildHtml(firstName: string): string {
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
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Bienvenue sur Quartzbase 🎉</h1>
            <p style="margin:8px 0 0;color:#d1d5db;font-size:15px;">Vos 14 jours d'essai démarrent maintenant</p>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:28px 32px 20px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;">Bonjour <strong>${firstName}</strong>,</p>
            <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
              Votre compte Quartzbase est prêt. Vous disposez de <strong style="color:#374151;">14 jours d'essai gratuit</strong> pour explorer toutes les fonctionnalités — sans carte bancaire.
            </p>
          </td>
        </tr>

        <!-- Steps -->
        <tr>
          <td style="padding:0 32px 28px;">
            <p style="margin:0 0 16px;color:#111827;font-size:14px;font-weight:600;">3 étapes pour démarrer</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:32px;vertical-align:top;">
                        <div style="width:24px;height:24px;background:#4F46E5;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:700;">1</div>
                      </td>
                      <td style="padding-left:12px;vertical-align:top;">
                        <p style="margin:0 0 2px;color:#111827;font-size:14px;font-weight:600;">Ajoutez vos employés</p>
                        <p style="margin:0;color:#6b7280;font-size:13px;">Ils recevront une invitation par email pour créer leur compte.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:32px;vertical-align:top;">
                        <div style="width:24px;height:24px;background:#4F46E5;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:700;">2</div>
                      </td>
                      <td style="padding-left:12px;vertical-align:top;">
                        <p style="margin:0 0 2px;color:#111827;font-size:14px;font-weight:600;">Créez votre premier planning</p>
                        <p style="margin:0;color:#6b7280;font-size:13px;">Utilisez l'IA pour générer un planning complet en quelques secondes.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:32px;vertical-align:top;">
                        <div style="width:24px;height:24px;background:#4F46E5;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:700;">3</div>
                      </td>
                      <td style="padding-left:12px;vertical-align:top;">
                        <p style="margin:0 0 2px;color:#111827;font-size:14px;font-weight:600;">Publiez et notifiez votre équipe</p>
                        <p style="margin:0;color:#6b7280;font-size:13px;">Un clic pour envoyer le planning par email à tous vos employés.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 28px;text-align:center;">
            <a href="${process.env.NEXT_PUBLIC_URL ?? 'https://quartzbase.fr'}/manager"
               style="display:inline-block;padding:13px 28px;background:#4F46E5;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
              Accéder à mon tableau de bord →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:0 32px 28px;border-top:1px solid #f3f4f6;">
            <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
              Cet email a été envoyé automatiquement — merci de ne pas y répondre.<br>
              Pour toute question : <a href="mailto:assistance.quartzbase@mail.fr" style="color:#4F46E5;">assistance.quartzbase@mail.fr</a><br>
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

export async function sendWelcomeEmail(email: string, fullName: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY non défini — welcome email ignoré')
    return
  }

  const resend = new Resend(apiKey)
  const firstName = fullName.split(' ')[0] || fullName || 'Manager'
  const from = process.env.RESEND_FROM_EMAIL ?? 'Quartzbase <noreply@quartzbase.fr>'

  try {
    await resend.emails.send({
      from,
      to: email,
      subject: 'Bienvenue sur Quartzbase 🎉 — Vos 14 jours démarrent maintenant',
      html: buildHtml(firstName),
    })
  } catch (err) {
    console.error('[email] Erreur envoi welcome:', err)
  }
}
