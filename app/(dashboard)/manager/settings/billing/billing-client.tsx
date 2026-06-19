'use client'

import { useState } from 'react'
import { CreditCard, Check, Zap, Building2, Loader2, AlertTriangle } from 'lucide-react'
import { isEntitledStatus, type SubscriptionRow } from '@/lib/subscription'
import { type BillingInterval, type PlanId, PLAN_META } from '@/lib/stripe'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { AiQuotaBadge } from '@/components/ui/ai-quota-badge'

interface Props {
  subscription: SubscriptionRow | null
  trialDaysLeft: number
}

const PLAN_FEATURES: Record<PlanId, string[]> = {
  essential: [
    'Jusqu\'à 10 employés',
    'Planning hebdomadaire',
    'Suivi des présences',
    'Gestion des congés',
    'Exports PDF/CSV',
    '3 générations IA/mois',
  ],
  pro: [
    'Jusqu\'à 25 employés',
    'Planning intelligent',
    'Suivi des présences',
    'Gestion des congés',
    'Conformité automatique',
    'Assistant IA illimité',
    'Exports PDF/CSV',
    'Support prioritaire',
  ],
  multisite: [
    'Employés illimités',
    'Multi-établissements',
    'Planning intelligent',
    'Suivi des présences',
    'Gestion des congés',
    'Conformité automatique',
    'Assistant IA illimité',
    'Exports PDF/CSV',
    'Support dédié',
  ],
}

const PLAN_LABELS: Record<string, string> = {
  essential: 'Essentiel',
  pro: 'Pro',
  multisite: 'Multi-site',
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

const PLANS: PlanId[] = ['essential', 'pro', 'multisite']

export function BillingClient({ subscription, trialDaysLeft }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [interval, setInterval] = useState<BillingInterval>('monthly')

  const isActive = isEntitledStatus(subscription?.status)
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  async function handleCheckout(planId: PlanId) {
    const key = `${planId}_${interval}`
    setLoading(key)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval }),
      })
      const data = await res.json()
      if (!data.url) {
        toast.error('Une erreur est survenue. Veuillez réessayer.')
        return
      }
      window.location.href = data.url
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
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-[20px] font-medium text-[var(--text-primary)] tracking-tight">Abonnement</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1">
          Gérez votre plan et vos informations de facturation.
        </p>
      </div>

      {!isActive && trialDaysLeft > 0 && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-blue-50 border border-blue-200">
          <Zap className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-blue-700">
              {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} d&apos;essai restant{trialDaysLeft > 1 ? 's' : ''}
            </p>
            <p className="text-[12px] text-blue-600 mt-0.5">
              Souscrivez avant la fin pour continuer à utiliser Quartzbase sans interruption.
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
                  Plan {PLAN_LABELS[subscription.plan] ?? subscription.plan}
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

          {isActive && (
            <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
              <AiQuotaBadge />
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

      {!isActive && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-[var(--text-primary)]">Choisir un plan</h2>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)]">
              <button
                onClick={() => setInterval('monthly')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-[12px] font-medium transition-all',
                  interval === 'monthly'
                    ? 'bg-white shadow-sm text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                Mensuel
              </button>
              <button
                onClick={() => setInterval('yearly')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all',
                  interval === 'yearly'
                    ? 'bg-white shadow-sm text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                Annuel
                <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                  -17%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((planId) => {
              const meta = PLAN_META[planId]
              const price = interval === 'monthly' ? meta.monthly : meta.yearly
              const monthlyEquiv = interval === 'yearly' ? (meta.yearly / 12).toFixed(0) : null
              const loadingKey = `${planId}_${interval}`
              const isPopular = planId === 'pro'

              return (
                <div
                  key={planId}
                  className={cn(
                    'rounded-xl border bg-[var(--bg-card)] p-5 flex flex-col gap-4 relative',
                    isPopular ? 'border-2 border-[var(--accent)]' : 'border-[var(--border)]'
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-2.5 py-1 rounded-full bg-[var(--accent)] text-white text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
                        Populaire
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">{meta.label}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight">{price}€</span>
                      <span className="text-[13px] text-[var(--text-secondary)]">
                        /{interval === 'monthly' ? 'mois' : 'an'}
                      </span>
                    </div>
                    {monthlyEquiv && (
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                        soit {monthlyEquiv}€/mois — 2 mois offerts
                      </p>
                    )}
                  </div>
                  <ul className="space-y-2 flex-1">
                    {PLAN_FEATURES[planId].map(f => (
                      <li key={f} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
                        <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleCheckout(planId)}
                    disabled={loading !== null}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium transition-opacity disabled:opacity-60',
                      isPopular
                        ? 'bg-[var(--accent)] text-white hover:opacity-90'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-hover)]'
                    )}
                  >
                    {loading === loadingKey && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Choisir ce plan
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
