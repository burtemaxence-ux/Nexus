import * as Sentry from '@sentry/nextjs'

// Receives CSP violation reports while the policy runs in report-only mode.
// Two wire formats arrive here:
//   - legacy `report-uri`  → { "csp-report": { "violated-directive", "blocked-uri", ... } }
//   - modern `report-to`   → [ { "type": "csp-violation", "body": { "effectiveDirective", "blockedURL", ... } } ]
// No auth: browsers POST these without credentials. We just log a concise line
// (visible in Vercel logs) and forward to Sentry so violations can be reviewed
// before switching the header to enforcing mode.
export async function POST(req: Request) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return new Response(null, { status: 204 })
  }

  type Violation = { directive?: string; blocked?: string; documentUri?: string }
  const violations: Violation[] = []

  if (Array.isArray(payload)) {
    for (const r of payload as Array<{ type?: string; body?: Record<string, unknown> }>) {
      if (r?.type === 'csp-violation' && r.body) {
        violations.push({
          directive: String(r.body['effectiveDirective'] ?? ''),
          blocked: String(r.body['blockedURL'] ?? ''),
          documentUri: String(r.body['documentURL'] ?? ''),
        })
      }
    }
  } else if (payload && typeof payload === 'object' && 'csp-report' in payload) {
    const r = (payload as { 'csp-report': Record<string, unknown> })['csp-report']
    violations.push({
      directive: String(r['violated-directive'] ?? ''),
      blocked: String(r['blocked-uri'] ?? ''),
      documentUri: String(r['document-uri'] ?? ''),
    })
  }

  for (const v of violations) {
    console.warn(`[CSP] ${v.directive} blocked ${v.blocked} on ${v.documentUri}`)
    Sentry.captureMessage(`CSP violation: ${v.directive} blocked ${v.blocked}`, {
      level: 'warning',
      extra: v as Record<string, unknown>,
    })
  }

  return new Response(null, { status: 204 })
}
