import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

/**
 * Non-blocking banner shown to managers while the subscription is `past_due`.
 * Access is preserved during Stripe's dunning retries (see isEntitledStatus);
 * this nudges the manager to fix the payment method before it lapses.
 */
export function PastDueBanner() {
  return (
    <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Votre dernier paiement a échoué. Mettez à jour votre moyen de paiement pour conserver l’accès à Quartzbase.
      </span>
      <Link
        href="/manager/settings/billing"
        className="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1 font-medium text-red-700 transition-colors hover:bg-red-100"
      >
        Mettre à jour
      </Link>
    </div>
  )
}
