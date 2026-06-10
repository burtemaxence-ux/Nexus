'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Zap, Building2, AlertCircle } from 'lucide-react'
import { type BillingInterval, type PlanId, PLAN_META } from '@/lib/stripe'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
    'Conformité automatique',
    'Assistant IA illimité',
    'Exports PDF/CSV',
    'Support dédié',
  ],
}

const PLANS: PlanId[] = ['essential', 'pro', 'multisite']

export default function BillingPage() {
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

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

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center font-bold text-white text-[15px] select-none">
              Q
            </div>
            <span className="text-[16px] font-semibold tracking-tight text-white">Quartzbase</span>
          </div>
          <Link
            href="/login"
            className="text-[13px] text-white/50 hover:text-white/80 transition-colors"
          >
            Se connecter avec un autre compte
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-5xl mx-auto space-y-10">

          {/* Alert */}
          <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20">
            <AlertCircle className="h-5 w-5 text-[#FF6B6B] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-semibold text-white">Votre période d&apos;essai est terminée</p>
              <p className="text-[13px] text-white/60 mt-0.5">
                Choisissez un plan pour continuer à utiliser Quartzbase et accéder à votre tableau de bord.
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-3">
            <h1 className="text-[32px] font-bold text-white tracking-tight">
              Choisissez votre plan
            </h1>
            <p className="text-[15px] text-white/50">
              Sans engagement. Annulation à tout moment.
            </p>
          </div>

          {/* Interval toggle */}
          <div className="flex justify-center">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              <button
                onClick={() => setInterval('monthly')}
                className={cn(
                  'px-5 py-2 rounded-lg text-[13px] font-medium transition-all',
                  interval === 'monthly'
                    ? 'bg-[#4F46E5] text-white shadow-sm'
                    : 'text-white/50 hover:text-white/80'
                )}
              >
                Mensuel
              </button>
              <button
                onClick={() => setInterval('yearly')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-medium transition-all',
                  interval === 'yearly'
                    ? 'bg-[#4F46E5] text-white shadow-sm'
                    : 'text-white/50 hover:text-white/80'
                )}
              >
                Annuel
                <span className="px-1.5 py-0.5 rounded-full bg-[#00D4AA]/20 text-[#00D4AA] text-[10px] font-semibold">
                  -17%
                </span>
              </button>
            </div>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map((planId) => {
              const meta = PLAN_META[planId]
              const price = interval === 'monthly' ? meta.monthly : meta.yearly
              const monthlyEquiv = interval === 'yearly' ? Math.round(meta.yearly / 12) : null
              const isPopular = planId === 'pro'
              const loadingKey = `${planId}_${interval}`

              return (
                <div
                  key={planId}
                  className={cn(
                    'relative rounded-2xl border p-6 flex flex-col gap-5',
                    isPopular
                      ? 'border-[#6C63FF] bg-[#6C63FF]/5'
                      : 'border-white/10 bg-white/[0.02]'
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full bg-[#6C63FF] text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                        Le plus populaire
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        isPopular ? 'bg-[#6C63FF]/20' : 'bg-white/5'
                      )}>
                        {planId === 'multisite'
                          ? <Building2 className="h-4 w-4 text-white/60" />
                          : <Zap className={cn('h-4 w-4', isPopular ? 'text-[#6C63FF]' : 'text-white/60')} />
                        }
                      </div>
                      <p className="text-[15px] font-semibold text-white">{meta.label}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-[36px] font-bold text-white tracking-tight">{price}€</span>
                      <span className="text-[14px] text-white/40">/{interval === 'monthly' ? 'mois' : 'an'}</span>
                    </div>
                    {monthlyEquiv && (
                      <p className="text-[12px] text-white/30 mt-0.5">
                        soit {monthlyEquiv}€/mois — 2 mois offerts
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2.5 flex-1">
                    {PLAN_FEATURES[planId].map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] text-white/60">
                        <Check className="h-3.5 w-3.5 text-[#00D4AA] mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleCheckout(planId)}
                    disabled={loading !== null}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all disabled:opacity-60',
                      isPopular
                        ? 'bg-[#6C63FF] text-white hover:bg-[#5B54E8]'
                        : 'bg-white/8 text-white border border-white/10 hover:bg-white/12'
                    )}
                  >
                    {loading === loadingKey && <Loader2 className="h-4 w-4 animate-spin" />}
                    Choisir ce plan
                  </button>
                </div>
              )
            })}
          </div>

          {/* Footer note */}
          <p className="text-center text-[12px] text-white/25">
            En choisissant un plan, vous acceptez les{' '}
            <Link href="/legal/cgu" className="underline hover:text-white/50 transition-colors">CGU</Link>
            {' '}de Quartzbase.
          </p>
        </div>
      </main>
    </div>
  )
}
