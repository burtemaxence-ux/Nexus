import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  let dbStatus = 'ok'
  let dbLatency = 0

  try {
    const t = Date.now()
    const { error } = await supabaseAdmin.from('profiles').select('id').limit(1)
    dbLatency = Date.now() - t
    if (error) dbStatus = 'error'
  } catch {
    dbStatus = 'error'
  }

  return Response.json(
    {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: { status: dbStatus, latency_ms: dbLatency },
        ai: { status: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing' },
        email: { status: process.env.RESEND_API_KEY ? 'configured' : 'missing' },
        push: { status: process.env.VAPID_PRIVATE_KEY ? 'configured' : 'missing' },
        slack: { status: process.env.SLACK_WEBHOOK_URL ? 'configured' : 'not_configured' },
        // SMS = promesse client (« planning par SMS ») : sans Twilio, l'envoi
        // est un no-op silencieux (lib/sms.ts) — le statut doit être visible.
        sms: {
          status:
            process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
              ? 'configured'
              : 'not_configured',
        },
      },
    },
    {
      status: dbStatus === 'ok' ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
