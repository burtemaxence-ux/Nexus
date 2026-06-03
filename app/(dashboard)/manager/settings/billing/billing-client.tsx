'use client'

import { useState } from 'react'
import { CreditCard, Check, Zap, Building2, Loader2, AlertTriangle } from 'lucide-react'
import type { SubscriptionRow } from '@/lib/subscription'
import { cn } from '@/lib/utils'

interface Props {
  subscription: SubscriptionRow | null
  trialDaysLeft: number
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:     { label: 'Actif',                color: 'text-green-600 bg-green-50 border-green-200' },
  trialing:   { label: 'Essai gratuit',        color: 'text-blue-600 bg-blue-50 border-blue-200' },
  past_due:   { label: 'Paiement en retard',   color: 'text-red-600 bg-red-50 border-red-200' },
  canceled:   { label: 'Annulé',               color: 'text-gray-600 bg-gray-50 border-gray-200' },
  incomplete: { label: 'Incomplet',            color: 'text-orange-600 bg-orange-50 border-orange-200' },
}

function StatusBadge({ status }: { status: string }) {
  const { label, color } = STATUS_LABELS[status] ?? { label: status, color: 'text-gray-600 bg-gray-50 border-gray-200' }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border', color)}>
      {label}
    </span>
  )
}

export function BillingClient({ subscription, trialDaysLeft }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  const isPro = subscription?.status === 'active' || subscription?.status === 'trialing'
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  async function handleCheckout(planKey: string) {
    setLoading(planKey)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(null)
    }
  }

  async function handlePortal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">Abonnement</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1">
          Gérez votre plan et vos informations de facturation.
        </p>
      </div>

      {!isPro && trialDaysLeft > 0 && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-blue-50 border border-blue-200">
          <Zap className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-blue-700">
              {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} d&apos;essai restant{trialDaysLeft > 1 ? 's' : ''}
            </p>
            <p className="text-[12px] text-blue-600 mt-0.5">
              Souscrivez avant la fin pour continuer à utiliser Nexus sans interruption.
            </p>
          </div>
        </div>
      )}

      {subscription && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[var(--text-primary)]">
                  Plan {subscription.plan === 'pro' ? 'Pro' : 'Gratuit'}
                </p>
                {periodEnd && (
                  <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                    {subscription.cancel_at_period_end ? 'Annulation le' : 'Renouvellement le'} {periodEnd}
                  </p>
                )}
              </div>
            </div>
            <StatusBadge status={subscription.status} />
          </div>

          {subscription.cancel_at_period_end && (
            <div className="mt-4 flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-orange-50 border border-orange-200">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-orange-700">
                Votre abonnement sera annulé à la fin de la période. Réactivez-le depuis le portail de facturation.
              </p>
            </div>
          )}

          {isPro && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <button
                onClick={handlePortal}
                disabled={loading === 'portal'}
                className="flex items-center gap-2 text-[13px] font-medium text-[var(--accent)] hover:underline disabled:opacity-60"
              >
                {loading === 'portal'
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <CreditCard className="h-3.5 w-3.5" />
                }
                Gérer l&apos;abonnement et la facturation
              </button>
            </div>
          )}
        </div>
      )}

      {!isPro && (
        <div className="space-y-3">
          <h2 className="text-[15px] font-medium text-[var(--text-primary)]">Passer à Pro</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 flex flex-col gap-4">
              <div>
                <p className="text-[13px] font-medium text-[var(--text-primary)]">Pro Mensuel</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight">49€</span>
                  <span className="text-[13px] text-[var(--text-secondary)]">/mois</span>
                </div>
              </div>
              <ul className="space-y-2 flex-1">
                {FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
                    <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout('pro_monthly')}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--accent)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading === 'pro_monthly' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Choisir ce plan
              </button>
            </div>

            <div className="rounded-xl border-2 border-[var(--accent)] bg-[var(--bg-card)] p-5 flex flex-col gap-4 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-2.5 py-1 rounded-full bg-[var(--accent)] text-white text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
                  Économisez 17%
                </span>
              </div>
              <div>
                <p className="text-[13px] font-medium text-[var(--text-primary)]">Pro Annuel</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight">490€</span>
                  <span className="text-[13px] text-[var(--text-secondary)]">/an</span>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">soit 40,83€/mois</p>
              </div>
              <ul className="space-y-2 flex-1">
                {FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
                    <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout('pro_yearly')}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--accent)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading === 'pro_yearly' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Choisir ce plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const FEATURES = [
  'Employés illimités',
  'Planning intelligent',
  'Suivi des présences',
  'Gestion des congés',
  'Conformité automatique',
  'Assistant IA',
  'Exports PDF/CSV',
  'Support prioritaire',
]
