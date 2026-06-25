'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { Reveal, useReveal } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

const ESSENTIEL_BASE = [
  "Jusqu'à 10 employés",
  'Planning IA (3 générations/mois)',
  'Badgeuse mobile & présences',
  'Congés & conformité légale',
  'Dossier RH complet',
  'Support email',
]
const PRO_EXTRAS = [
  '★ Pilotage productivité (coût/CA)',
  '★ Absentéisme & turnover',
  '★ Copilote IA optimisé coût/CA',
  'IA illimitée + remplacement 1 clic',
  "Jusqu'à 25 employés",
]
const MULTI_EXTRAS = [
  'Employés illimités · 3 sites',
  '★ Pilotage multi-sites',
  'Dashboard consolidé',
  'Support prioritaire 4h · API',
]

type FeatRow =
  | { kind: 'header'; text: string }
  | { kind: 'item'; text: string; premium: boolean }

function buildFeatrows(features: string[]): FeatRow[] {
  return features.map((f) => {
    if (f.endsWith(':')) return { kind: 'header', text: f }
    const premium = f.startsWith('★')
    return { kind: 'item', text: premium ? f.replace(/^★\s*/, '') : f, premium }
  })
}

const PLANS = [
  { name: 'Essentiel',  description: 'Pour démarrer sans se prendre la tête.', monthly: 49,  annual: 490,  featured: false, bg: '#111118', border: 'rgba(255,255,255,0.08)', pad: '32px 28px', priceColor: '#ffffff', btnBg: 'rgba(255,255,255,0.06)', btnColor: 'rgba(255,255,255,0.85)', featrows: buildFeatrows(ESSENTIEL_BASE) },
  { name: 'Pro',        description: 'Le choix de la plupart des patrons.',    monthly: 89,  annual: 890,  featured: true,  bg: '#0f0e1e', border: '#6C63FF',               pad: '36px 32px', priceColor: '#6C63FF', btnBg: '#6C63FF',               btnColor: '#fff',                 featrows: buildFeatrows(['Tout le plan Essentiel, et en plus :', ...PRO_EXTRAS]) },
  { name: 'Multi-site', description: 'Pour gérer plusieurs établissements.',   monthly: 149, annual: 1490, featured: false, bg: '#111118', border: 'rgba(0,212,170,0.2)',   pad: '32px 28px', priceColor: '#ffffff', btnBg: 'rgba(255,255,255,0.06)', btnColor: 'rgba(255,255,255,0.85)', featrows: buildFeatrows(['Tout le plan Pro, et en plus :', ...MULTI_EXTRAS]) },
]

function QuartzIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="qz" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#00D4AA" />
        </linearGradient>
      </defs>
      <path d="M12 2l5 5-5 15-5-15 5-5z" fill="url(#qz)" stroke="rgba(255,255,255,0.5)" strokeWidth={0.6} strokeLinejoin="round" />
      <path d="M7 7h10M12 2v20" stroke="rgba(255,255,255,0.4)" strokeWidth={0.6} />
    </svg>
  )
}

function TealCheck() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
      <circle cx={8} cy={8} r={7.5} fill="#00D4AA" fillOpacity={0.12} />
      <path d="M5 8l2.2 2.2L11 5.5" stroke="#00D4AA" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlanCard({ plan, annual }: { plan: (typeof PLANS)[number]; annual: boolean }) {
  const { ref, shown } = useReveal()
  const [hovered, setHovered] = useState(false)
  const displayPrice = annual ? Math.round(plan.annual / 12) : plan.monthly

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: plan.bg,
        border: `1px solid ${plan.border}`,
        borderRadius: 16,
        padding: plan.pad,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        opacity: shown ? 1 : 0,
        transform: hovered ? 'translateY(-8px) scale(1.015)' : (shown ? 'none' : 'translateY(26px)'),
        boxShadow: hovered ? '0 26px 60px rgba(0,0,0,0.55)' : 'none',
        transition: 'opacity .6s cubic-bezier(.2,.7,.2,1), transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease',
      }}
    >
      {plan.featured && (
        <span className="qb-badge-in" style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#6C63FF', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 16px', borderRadius: 100, whiteSpace: 'nowrap' }}>
          Le plus populaire
        </span>
      )}

      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>{plan.name}</div>
      <div style={{ fontSize: 13, color: '#9090a8', marginBottom: 24, lineHeight: 1.4 }}>{plan.description}</div>

      <div key={annual ? 'annual' : 'monthly'} className="qb-price-in" style={{ marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          {annual && (
            <span style={{ fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,0.25)', textDecoration: 'line-through', letterSpacing: '-0.02em' }}>{plan.monthly}€</span>
          )}
          <span style={{ fontWeight: 700, fontSize: 42, letterSpacing: '-0.03em', color: plan.priceColor }}>{displayPrice}€</span>
          <span style={{ fontSize: 14, color: '#9090a8' }}>/mois</span>
        </div>
        {annual && (
          <div style={{ fontSize: 12, color: '#00D4AA', marginTop: 5 }}>Facturé {plan.annual}€/an, soit 2 mois offerts</div>
        )}
      </div>

      <Link
        href="/register"
        style={{ width: '100%', border: 'none', borderRadius: 10, padding: 13, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 26, background: plan.btnBg, color: plan.btnColor, textAlign: 'center', textDecoration: 'none' }}
      >
        Démarrer l&apos;essai gratuit
      </Link>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
        {plan.featrows.map((f, i) =>
          f.kind === 'header' ? (
            <div key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#79828f' }}>{f.text}</div>
          ) : (
            <div key={i} className="qb-feat" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 4px', margin: '-2px -4px', borderRadius: 6 }}>
              <TealCheck />
              <span style={{ fontSize: 13, fontWeight: f.premium ? 600 : 400, color: f.premium ? '#ffffff' : 'rgba(255,255,255,0.62)' }}>{f.text}</span>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

export function PricingSection() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="tarifs" style={{ position: 'relative', zIndex: 2, maxWidth: 1080, margin: '110px auto 0', padding: '0 32px', fontFamily: FONT }}>
      <Reveal style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 30px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#6C63FF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Tarifs</div>
        <h2 style={{ fontWeight: 700, fontSize: 40, letterSpacing: '-0.025em', lineHeight: 1.12, margin: '0 0 14px' }}>Moins de 2 € par jour</h2>
        <p style={{ fontSize: 17, color: '#a6a8b8', lineHeight: 1.6, margin: 0 }}>À partir de 49€/mois, sans engagement.</p>
      </Reveal>

      {/* Toggle Mensuel / Annuel */}
      <Reveal style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 44 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: annual ? 'rgba(255,255,255,0.4)' : '#ffffff', transition: 'color .2s ease' }}>Mensuel</span>
        <button
          onClick={() => setAnnual((v) => !v)}
          aria-label="Basculer entre tarif mensuel et annuel"
          aria-pressed={annual}
          style={{ width: 58, height: 28, borderRadius: 14, border: `1px solid ${annual ? 'rgba(108,99,255,0.5)' : 'rgba(255,255,255,0.14)'}`, cursor: 'pointer', position: 'relative', padding: 0, background: annual ? 'rgba(108,99,255,0.25)' : 'rgba(255,255,255,0.08)', transition: 'background .3s ease, border-color .3s ease' }}
        >
          <span className="qb-quartz" style={{ position: 'absolute', top: 2, left: annual ? 32 : 3, transform: `rotate(${annual ? 180 : 0}deg)`, transition: 'left .4s cubic-bezier(.34,1.56,.64,1), transform .4s cubic-bezier(.34,1.56,.64,1)', display: 'flex' }}>
            <QuartzIcon />
          </span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: annual ? '#ffffff' : 'rgba(255,255,255,0.4)', transition: 'color .2s ease' }}>Annuel</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#00D4AA', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 100, padding: '2px 8px', whiteSpace: 'nowrap' }}>2 mois offerts</span>
        </div>
      </Reveal>

      <div className="qb-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'start' }}>
        {PLANS.map((plan) => <PlanCard key={plan.name} plan={plan} annual={annual} />)}
      </div>

      {/* Bandeau garantie */}
      <Reveal style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 13, marginTop: 38, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: '12px 24px', width: 'fit-content', marginLeft: 'auto', marginRight: 'auto' }}>
        <span style={{ display: 'flex' }}><RefreshCw size={21} color="#9090a8" strokeWidth={1.9} /></span>
        <span style={{ fontSize: 14, color: '#cfcfe0', lineHeight: 1.4 }}>
          <strong style={{ color: '#fff', fontWeight: 700 }}>Votre équipe grandit&nbsp;?</strong> Changez de formule en cours de route, votre tarif s&apos;ajuste automatiquement.
        </span>
      </Reveal>

      <style>{`
        @keyframes qbBadgeIn { 0%{opacity:0;transform:translateX(-50%) translateY(-8px) scale(.8)} 60%{transform:translateX(-50%) translateY(2px) scale(1.05)} 100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }
        @keyframes qbPriceIn { from{opacity:0;transform:translateY(8px) scale(.96)} to{opacity:1;transform:none} }
        @keyframes qbQuartzShimmer { 0%,100%{filter:drop-shadow(0 0 3px rgba(108,99,255,0.5))} 50%{filter:drop-shadow(0 0 7px rgba(0,212,170,0.7))} }
        .qb-badge-in { animation: qbBadgeIn .5s cubic-bezier(.2,.8,.2,1) both; }
        .qb-price-in { animation: qbPriceIn .25s ease-out; }
        .qb-quartz   { animation: qbQuartzShimmer 3s ease-in-out infinite; }
        .qb-feat:hover { background: rgba(255,255,255,0.03); }
        @media (prefers-reduced-motion: reduce) {
          .qb-badge-in, .qb-price-in, .qb-quartz { animation: none; }
        }
        @media (max-width: 880px) {
          .qb-pricing-grid { grid-template-columns: 1fr !important; max-width: 420px; margin-left: auto; margin-right: auto; }
        }
      `}</style>
    </section>
  )
}
