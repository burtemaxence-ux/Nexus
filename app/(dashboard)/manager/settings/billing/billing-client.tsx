'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Check, Zap, Loader2, AlertTriangle, Users, Sparkles, ArrowUpRight, Gem, RefreshCw, PackageCheck, Rocket, TrendingUp } from 'lucide-react'
import { isEntitledStatus, type SubscriptionRow } from '@/lib/subscription'
import { type BillingInterval, type PlanId, PLAN_META } from '@/lib/stripe'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  subscription: SubscriptionRow | null
  trialDaysLeft: number
  employeeCount: number
  employeeLimit: number | null
}

const PLAN_FEATURES: Record<PlanId, string[]> = {
  essential: [
    'Jusqu\'à 10 employés',
    'Planning hebdomadaire + IA (3 générations/mois)',
    'Suivi des présences & badgeuse',
    'Gestion des congés',
    'Conformité Code du Travail (alertes + vérification)',
    'Dossier RH : contrats, documents, photos',
    'Exports PDF / CSV',
  ],
  pro: [
    'Tout l\'Essentiel, et en plus :',
    '★ Pilotage de la productivité (CA, coût/CA, masse salariale)',
    '★ Absentéisme & turnover',
    '★ Copilote IA : planning optimisé coût/CA',
    'Assistant IA illimité',
    'Documents de conformité (avertissements, avenants…)',
    'Jusqu\'à 25 employés',
    'Support prioritaire',
  ],
  multisite: [
    'Tout le Pro, et en plus :',
    'Employés illimités',
    'Multi-établissements',
    '★ Pilotage productivité multi-sites',
    'Assistant IA illimité',
    'Support dédié',
  ],
}

const PLAN_LABELS: Record<string, string> = { essential: 'Essentiel', pro: 'Pro', multisite: 'Multi-site' }
const STATUS_LABELS: Record<string, string> = {
  active: 'Actif', trialing: 'Essai gratuit', past_due: 'Paiement en retard', canceled: 'Annulé', incomplete: 'Incomplet',
}

const PLANS: PlanId[] = ['essential', 'pro', 'multisite']

function FeatureItem({ feature }: { feature: string }) {
  if (feature.endsWith(':')) {
    return <p className="nx-eyebrow" style={{ gridColumn: '1/-1', paddingTop: 2 }}>{feature}</p>
  }
  const premium = feature.startsWith('★')
  return (
    <div className="nx-feat" style={premium ? { borderColor: 'var(--accent)' } : undefined}>
      {premium ? <Zap className="ic16" style={{ color: 'var(--accent)', flexShrink: 0 }} /> : <Check className="ic16" style={{ color: 'var(--emerald)', flexShrink: 0 }} />}
      <span style={{ fontSize: 12.5, fontWeight: premium ? 600 : 400, color: premium ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.4 }}>
        {premium ? feature.replace(/^★\s*/, '') : feature}
      </span>
    </div>
  )
}

function UsageTile({ icon: Icon, label, used, limit, loading }: { icon: typeof Users; label: string; used: number; limit: number | null; loading?: boolean }) {
  const unlimited = limit === null
  const pct = unlimited || limit === 0 ? 100 : Math.min((used / limit) * 100, 100)
  const near = !unlimited && pct >= 80
  const color = near ? 'var(--danger)' : 'var(--accent)'
  return (
    <div className="nx-usage">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
        <Icon className="ic14" /><span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 10 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{loading ? '—' : used}</span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{unlimited ? 'illimité' : `/ ${limit}`}</span>
      </div>
      <div className="nx-usage-bar"><div className="nx-usage-fill" style={{ width: `${loading ? 0 : pct}%`, background: unlimited ? 'var(--emerald)' : color }} /></div>
      <p style={{ fontSize: 11, marginTop: 9, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{unlimited ? 'Illimité avec votre plan' : near ? 'Vous approchez de la limite' : 'Compris dans votre plan'}</p>
    </div>
  )
}

export function BillingClient({ subscription, trialDaysLeft, employeeCount, employeeLimit }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null)

  const isActive = isEntitledStatus(subscription?.status)
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const currentPlanId = (subscription?.plan ?? '') as PlanId
  const planFeatures = PLAN_FEATURES[currentPlanId] ?? []
  const currentMeta = PLAN_META[currentPlanId]
  const nextPlanId = (() => {
    const i = PLANS.indexOf(currentPlanId)
    return i >= 0 && i < PLANS.length - 1 ? PLANS[i + 1] : null
  })()

  useEffect(() => {
    if (!isActive) return
    fetch('/api/ai/quota').then(r => (r.ok ? r.json() : null)).then(d => { if (d) setQuota(d) }).catch(() => {})
  }, [isActive])

  async function handleCheckout(planId: PlanId) {
    setLoading(`${planId}_${interval}`)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId, interval }) })
      const data = await res.json()
      if (!data.url) { toast.error('Une erreur est survenue. Veuillez réessayer.'); return }
      window.location.href = data.url
    } finally { setLoading(null) }
  }

  async function handlePortal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally { setLoading(null) }
  }

  return (
    <div className="nx-planpage" style={{ maxWidth: 768, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-.02em', color: 'var(--text-primary)' }}>Abonnement</h1>
        <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>Gérez votre plan et vos informations de facturation.</p>
      </div>

      {!isActive && trialDaysLeft > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'var(--sev-info-bg)', border: '0.5px solid var(--sev-info-border)' }}>
          <Zap className="ic16" style={{ color: 'var(--sev-info-fg)', marginTop: 1, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--sev-info-fg)' }}>{trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} d’essai restant{trialDaysLeft > 1 ? 's' : ''}</p>
            <p style={{ fontSize: 12, color: 'var(--sev-info-fg)', opacity: .85, marginTop: 2 }}>Souscrivez avant la fin pour continuer sans interruption.</p>
          </div>
        </div>
      )}

      {/* Current plan hero */}
      {subscription && (
        <div className="nx-bill-hero">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,.18)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8AF5DC', boxShadow: '0 0 0 3px rgba(138,245,220,.3)' }} />{STATUS_LABELS[subscription.status] ?? subscription.status}
                </span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, opacity: .85 }}>Votre formule</p>
              <h2 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: '-.02em', marginTop: 4 }}>Plan {PLAN_LABELS[subscription.plan] ?? subscription.plan}</h2>
              {currentMeta && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{currentMeta.monthly} €</span>
                  <span style={{ fontSize: 13, opacity: .8 }}>/ mois</span>
                </div>
              )}
            </div>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Gem className="ic28" style={{ color: '#fff' }} /></div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.18)' }}>
            {periodEnd && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, opacity: .92 }}><RefreshCw className="ic14" />{subscription.cancel_at_period_end ? 'Se termine le' : 'Se renouvelle le'} {periodEnd}</div>}
            {isActive && (
              <button className="qb-shine" onClick={handlePortal} disabled={loading === 'portal'} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#fff', color: '#5B52E8' }}>
                {loading === 'portal' ? <Loader2 className="ic14 nx-spin" /> : <CreditCard className="ic14" />}Gérer l’abonnement
              </button>
            )}
          </div>
          {subscription.cancel_at_period_end && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,.16)' }}>
              <AlertTriangle className="ic14" style={{ marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 12, opacity: .92 }}>Votre abonnement sera annulé à la fin de la période. Réactivez-le depuis le portail de facturation.</p>
            </div>
          )}
        </div>
      )}

      {isActive && (
        <>
          {/* Usage */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}><span className="nx-step"><TrendingUp className="ic12" /></span><p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Votre consommation ce mois-ci</p></div>
            <div className="nx-billgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
              <UsageTile icon={Users} label="Employés actifs" used={employeeCount} limit={employeeLimit} />
              <UsageTile icon={Sparkles} label="Générations IA" used={quota?.used ?? 0} limit={quota && quota.limit !== -1 ? quota.limit : null} loading={quota === null} />
            </div>
          </div>

          {/* Plan includes */}
          {planFeatures.length > 0 && (
            <div className="nx-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div className="nx-ico" style={{ background: 'var(--accent-light)' }}><PackageCheck className="ic16" style={{ color: 'var(--accent)' }} /></div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Tout ce que comprend votre Plan {PLAN_LABELS[subscription?.plan ?? ''] ?? ''}</p>
              </div>
              <div className="nx-featgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {planFeatures.map(f => <FeatureItem key={f} feature={f} />)}
              </div>
            </div>
          )}

          {/* Upsell */}
          {nextPlanId && (
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: 22, border: '1.5px solid var(--accent)', background: 'var(--accent-light)' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,#6C63FF,#00D4AA)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 20px rgba(108,99,255,.35)' }}><Rocket className="ic20" style={{ color: '#fff' }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Passez au {PLAN_LABELS[nextPlanId]}</p>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>dès {PLAN_META[nextPlanId].monthly} €/mois</span>
                  </div>
                  <p style={{ fontSize: 12.5, marginTop: 3, color: 'var(--text-secondary)' }}>Débloquez encore plus de fonctionnalités pour votre établissement.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                    {PLAN_FEATURES[nextPlanId].filter(f => !f.endsWith(':')).slice(0, 5).map(f => {
                      const premium = f.startsWith('★')
                      return (
                        <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: premium ? 600 : 500, background: 'var(--bg-card)', border: `0.5px solid ${premium ? 'var(--accent)' : 'var(--border)'}`, color: premium ? 'var(--accent)' : 'var(--text-secondary)' }}>
                          {premium ? <Zap className="ic12" /> : <Check className="ic12" style={{ color: 'var(--emerald)' }} />}{f.replace(/^★\s*/, '')}
                        </span>
                      )
                    })}
                  </div>
                  <button className="btn-primary qb-shine" style={{ marginTop: 16 }} onClick={handlePortal} disabled={loading === 'portal'}>
                    {loading === 'portal' ? <Loader2 className="ic14 nx-spin" /> : <ArrowUpRight className="ic14" />}Faire évoluer mon plan
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Checkout (no active plan) */}
      {!isActive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Choisir un plan</h2>
            <div className="nx-seg-wrap">
              <button className={`nx-seg ${interval === 'monthly' ? 'on' : ''}`} onClick={() => setInterval('monthly')}>Mensuel</button>
              <button className={`nx-seg ${interval === 'yearly' ? 'on' : ''}`} onClick={() => setInterval('yearly')}>Annuel −17%</button>
            </div>
          </div>
          <div className="nx-billgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {PLANS.map(planId => {
              const meta = PLAN_META[planId]
              const price = interval === 'monthly' ? meta.monthly : meta.yearly
              const monthlyEquiv = interval === 'yearly' ? (meta.yearly / 12).toFixed(0) : null
              const isPopular = planId === 'pro'
              return (
                <div key={planId} className="nx-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', border: isPopular ? '1.5px solid var(--accent)' : undefined }}>
                  {isPopular && <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)' }}><span style={{ padding: '3px 10px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>Populaire</span></div>}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{meta.label}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-.02em' }}>{price}€</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>/{interval === 'monthly' ? 'mois' : 'an'}</span>
                    </div>
                    {monthlyEquiv && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>soit {monthlyEquiv}€/mois — 2 mois offerts</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    {PLAN_FEATURES[planId].map(f => <FeatureItem key={f} feature={f} />)}
                  </div>
                  <button onClick={() => handleCheckout(planId)} disabled={loading !== null} className={isPopular ? 'btn-primary' : 'btn-secondary'} style={{ width: '100%', justifyContent: 'center' }}>
                    {loading === `${planId}_${interval}` && <Loader2 className="ic14 nx-spin" />}Choisir ce plan
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
