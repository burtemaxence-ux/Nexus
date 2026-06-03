import Link from 'next/link'
import { Lock, Zap } from 'lucide-react'

export function PaywallGate({ trialDaysLeft }: { trialDaysLeft?: number }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-[var(--accent-light)] mx-auto">
          {trialDaysLeft === 0
            ? <Lock className="h-6 w-6 text-[var(--accent)]" />
            : <Zap className="h-6 w-6 text-[var(--accent)]" />
          }
        </div>

        <div className="space-y-2">
          <h2 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-tight">
            {trialDaysLeft === 0
              ? 'Période d\'essai expirée'
              : 'Abonnement requis'
            }
          </h2>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
            {trialDaysLeft === 0
              ? 'Votre essai gratuit de 14 jours est terminé. Souscrivez à un plan Pro pour continuer à utiliser Nexus.'
              : 'Votre abonnement est inactif. Réactivez-le pour accéder à votre tableau de bord.'
            }
          </p>
        </div>

        <Link
          href="/manager/settings/billing"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-[14px] font-medium hover:opacity-90 transition-opacity"
        >
          <Zap className="h-4 w-4" />
          Voir les plans
        </Link>
      </div>
    </div>
  )
}
