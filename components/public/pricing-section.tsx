'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    id: 'essentiel',
    name: 'Essentiel',
    monthlyPrice: 49,
    annualPrice: 490,
    description: 'Pour démarrer sans se prendre la tête.',
    features: [
      "Jusqu'à 10 employés",
      'Planning IA (3 générations/mois)',
      'Gestion des congés',
      'Badgeuse mobile',
      'Support email',
    ],
    cta: "Démarrer l'essai gratuit",
    popular: false,
    accentColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 89,
    annualPrice: 890,
    description: 'Le choix de la plupart des patrons.',
    features: [
      "Jusqu'à 25 employés",
      'IA illimitée',
      'Conformité automatique',
      'Remplacement IA en 1 clic',
      'Analytics & rapports',
    ],
    cta: "Démarrer l'essai gratuit",
    popular: true,
    accentColor: 'rgba(108,99,255,0.08)',
    borderColor: '#6C63FF',
  },
  {
    id: 'multisite',
    name: 'Multi-site',
    monthlyPrice: 149,
    annualPrice: 1490,
    description: "Pour gérer plusieurs établissements.",
    features: [
      '3 établissements',
      'Employés illimités',
      'Dashboard consolidé',
      'Support prioritaire sous 4h',
      'Accès API',
    ],
    cta: "Démarrer l'essai gratuit",
    popular: false,
    accentColor: 'rgba(0,212,170,0.05)',
    borderColor: 'rgba(0,212,170,0.2)',
  },
]

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="7.5" fill={color} fillOpacity="0.12" />
      <path d="M5 8l2.2 2.2L11 5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PricingSection() {
  const [annual, setAnnual] = useState(false)

  return (
    <section
      id="tarifs"
      style={{
        background: 'linear-gradient(180deg, #0c0b18 0%, #0a0a0f 100%)',
        padding: '96px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6C63FF',
            marginBottom: 16,
          }}>
            Tarifs
          </p>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            marginBottom: 12,
          }}>
            Moins de 2 € par jour
          </h2>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            color: 'rgba(255,255,255,0.45)',
          }}>
            {`Jusqu'à 4 fois moins cher. Sans engagement.`}
          </p>
        </div>

        {/* Toggle mensuel / annuel */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          marginBottom: 48,
        }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: annual ? 'rgba(255,255,255,0.4)' : '#ffffff',
            transition: 'color 200ms ease',
          }}>
            Mensuel
          </span>

          {/* Pill switch */}
          <button
            role="switch"
            aria-checked={annual}
            aria-label="Facturation annuelle"
            onClick={() => setAnnual(v => !v)}
            style={{
              width: 48,
              height: 26,
              borderRadius: 13,
              background: annual ? '#6C63FF' : 'rgba(255,255,255,0.12)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 250ms ease',
              padding: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: 3,
              left: annual ? 25 : 3,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#ffffff',
              transition: 'left 250ms ease',
              display: 'block',
            }} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: annual ? '#ffffff' : 'rgba(255,255,255,0.4)',
              transition: 'color 200ms ease',
            }}>
              Annuel
            </span>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              color: '#00D4AA',
              background: 'rgba(0,212,170,0.1)',
              border: '1px solid rgba(0,212,170,0.25)',
              borderRadius: 100,
              padding: '2px 8px',
              whiteSpace: 'nowrap',
            }}>
              2 mois offerts
            </span>
          </div>
        </div>

        {/* Plans */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          alignItems: 'start',
        }} className="pricing-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: plan.popular ? '#0f0e1e' : '#111118',
                border: `1px solid ${plan.borderColor}`,
                borderRadius: 16,
                padding: plan.popular ? '36px 32px' : '32px 28px',
                position: 'relative',
                transition: 'transform 200ms ease',
              }}
              onMouseEnter={e => { if (!plan.popular) e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={e => { if (!plan.popular) e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {/* Badge "Le plus populaire" */}
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: -14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#6C63FF',
                  color: '#fff',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 16px',
                  borderRadius: 100,
                  whiteSpace: 'nowrap',
                }}>
                  Le plus populaire
                </div>
              )}

              {/* Nom + description */}
              <h3 style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: '#ffffff',
                marginBottom: 6,
              }}>
                {plan.name}
              </h3>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: 'rgba(255,255,255,0.4)',
                marginBottom: 24,
              }}>
                {plan.description}
              </p>

              {/* Prix */}
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 4,
                }}>
                  <span style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: 42,
                    color: plan.popular ? '#6C63FF' : '#ffffff',
                    letterSpacing: '-0.03em',
                    transition: 'color 300ms ease',
                  }}>
                    {annual
                      ? Math.round(plan.annualPrice / 12)
                      : plan.monthlyPrice}
                    €
                  </span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.35)',
                  }}>
                    /mois
                  </span>
                </div>
                {annual && (
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.3)',
                    marginTop: 4,
                  }}>
                    {`soit ${plan.annualPrice}€ facturés annuellement`}
                  </p>
                )}
              </div>

              {/* CTA */}
              <Link
                href="/register"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  color: plan.popular ? '#fff' : 'rgba(255,255,255,0.85)',
                  textDecoration: 'none',
                  padding: '12px 20px',
                  background: plan.popular ? '#6C63FF' : 'rgba(255,255,255,0.06)',
                  borderRadius: 10,
                  marginBottom: 28,
                  border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  transition: 'background 200ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = plan.popular
                    ? '#5a52e0'
                    : 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = plan.popular
                    ? '#6C63FF'
                    : 'rgba(255,255,255,0.06)'
                }}
              >
                {`Démarrer l'essai gratuit`}
              </Link>

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {plan.features.map((feature, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckIcon color={plan.popular ? '#6C63FF' : '#00D4AA'} />
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.6)',
                    }}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Note de réassurance */}
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: 'rgba(255,255,255,0.3)',
          textAlign: 'center',
          marginTop: 36,
          letterSpacing: '0.01em',
        }}>
          {`14 jours gratuits · Sans carte bleue · Annulation en 1 clic`}
        </p>

      </div>

      <style>{`
        @media (max-width: 900px) {
          .pricing-grid {
            grid-template-columns: 1fr !important;
            max-width: 480px;
            margin: 0 auto;
          }
        }
      `}</style>
    </section>
  )
}
