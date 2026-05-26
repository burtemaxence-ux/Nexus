/** Twilio SMS — only sends when TWILIO_* env vars are configured */
export async function sendSms(to: string, body: string): Promise<boolean> {
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
