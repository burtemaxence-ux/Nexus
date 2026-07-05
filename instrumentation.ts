import * as Sentry from '@sentry/nextjs'

// Initialise Sentry côté serveur (Node) et edge. Requis par @sentry/nextjs v8+ :
// sans ce hook `register`, sentry.server.config n'est jamais chargé et les
// erreurs serveur (routes API, crons, webhook Stripe, server components) ne
// remontent PAS à Sentry — même avec le DSN configuré.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Capture les erreurs de rendu serveur / route handlers (Next 15+ ; sans effet
// sur Next 14 mais prêt pour la montée de version).
export const onRequestError = Sentry.captureRequestError
