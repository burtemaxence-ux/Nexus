/** Twilio SMS — only sends when TWILIO_* env vars are configured */
export async function sendSms(to: string, body: string): Promise<boolean> {
  // Numéros de démonstration : plage 06 39 98 xx xx, réservée à la fiction par
  // l'ARCEP et donc attribuée à personne. La garde est posée au transport et
  // non dans les routes appelantes : elle couvre aussi les tâches planifiées et
  // tout appelant futur, et elle ne peut par construction pas atteindre un
  // vrai client. Sans elle, publier un planning depuis la démo enverrait un SMS
  // à chaque salarié fictif.
  if (isFictionNumber(to)) return false

  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_FROM_NUMBER
  if (!sid || !token || !from) return false

  const credentials = Buffer.from(`${sid}:${token}`).toString('base64')
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    }
  )
  return res.ok
}

/**
 * Plage de numéros réservée à la fiction en France (ARCEP) : 06 39 98 00 00 à
 * 06 39 98 99 99. Aucun abonné réel ne peut s'y trouver, ce qui en fait un
 * marqueur sûr pour les données de démonstration. Tolère les espaces, points,
 * tirets et la forme internationale +33.
 */
export function isFictionNumber(phone: string | null | undefined): boolean {
  if (!phone) return false
  const d = phone.replace(/[^\d+]/g, '').replace(/^\+33/, '0')
  return d.startsWith('063998')
}
