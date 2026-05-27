import { Resend } from 'resend'
import type { Profile, Shift } from '@/types'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long' })
  const day = d.getDate()
  const month = d.toLocaleDateString('fr-FR', { month: 'long' })
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day} ${month}`
}

function formatBreak(minutes: number): string {
  return minutes === 60 ? '1h' : `${minutes} min`
}

function buildHtml(firstName: string, weekLabel: string, shifts: Shift[]): string {
  const sorted = [...shifts].sort((a, b) => a.date.localeCompare(b.date))

  const rows = sorted.map(s => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#374151;font-weight:500;">
        ${formatDate(s.date)}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#111827;font-weight:600;">
        ${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}
        ${s.break_minutes > 0 ? `<span style="color:#9ca3af;font-size:12px;font-weight:400;"> · pause ${formatBreak(s.break_minutes)}</span>` : ''}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;">
        ${s.position ?? ''}
      </td>
    </tr>
  `).join('')

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
            <p style="margin:0 0 4px;color:#9ca3af;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Nexus by Quartz</p>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Planning publié</h1>
            <p style="margin:8px 0 0;color:#d1d5db;font-size:15px;">${weekLabel}</p>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:28px 32px 20px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;">Bonjour <strong>${firstName}</strong>,</p>
            <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
              Votre planning pour la semaine <strong style="color:#374151;">${weekLabel}</strong> vient d'être publié. Retrouvez ci-dessous vos créneaux.
            </p>
          </td>
        </tr>

        <!-- Shifts table -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                  <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Jour</th>
                  <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Horaires</th>
                  <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Poste</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:0 32px 28px;border-top:1px solid #f3f4f6;">
            <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
              Pour toute question, contactez votre responsable directement.<br>
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

export async function sendPlanningPublishedEmails({
  employees,
  shifts,
  weekLabel,
}: {
  employees: Profile[]
  shifts: Shift[]
  weekLabel: string
}): Promise<{ sent: number; errors: number }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY non défini — emails ignorés')
    return { sent: 0, errors: 0 }
  }

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL ?? 'Nexus by Quartz <onboarding@resend.dev>'

  const shiftsByEmployee = new Map<string, Shift[]>()
  for (const shift of shifts) {
    const existing = shiftsByEmployee.get(shift.employee_id) ?? []
    existing.push(shift)
    shiftsByEmployee.set(shift.employee_id, existing)
  }

  const targets = employees.filter(emp => (shiftsByEmployee.get(emp.id) ?? []).length > 0)

  const results = await Promise.allSettled(
    targets.map(emp => {
      const firstName = emp.full_name?.split(' ')[0] ?? emp.email.split('@')[0]
      const empShifts = shiftsByEmployee.get(emp.id) ?? []
      return resend.emails.send({
        from,
        to: emp.email,
        subject: `📅 Votre planning — ${weekLabel}`,
        html: buildHtml(firstName, weekLabel, empShifts),
      })
    })
  )

  let sent = 0
  let errors = 0
  for (const result of results) {
    if (result.status === 'fulfilled') sent++
    else { errors++; console.error('[email] Erreur envoi:', result.reason) }
  }

  return { sent, errors }
}
