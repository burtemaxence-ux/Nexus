// Étiquettes et couleurs partagées par le back-office (serveur + client).
// Pas de 'server-only' ici : importable depuis les composants client.

export const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuit', essential: 'Essentiel', essentiel: 'Essentiel',
  pro: 'Pro', multi: 'Multi-site', multisite: 'Multi-site',
}

export const STATUS_LABELS: Record<string, string> = {
  active: 'Actif', trialing: 'Essai', past_due: 'Paiement en retard',
  canceled: 'Annulé', incomplete: 'Incomplet', expired: 'Essai expiré',
}

// Couleur (token CSS) associée à un statut normalisé.
export function statusColor(status: string): string {
  switch (status) {
    case 'active': return 'var(--success)'
    case 'trialing': return 'var(--accent)'
    case 'past_due': return 'var(--warning)'
    case 'canceled':
    case 'expired': return 'var(--danger)'
    default: return 'var(--text-tertiary)'
  }
}

export function planLabel(plan: string | null | undefined): string {
  return plan ? (PLAN_LABELS[plan] ?? plan) : '—'
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}
