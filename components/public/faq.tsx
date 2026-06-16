'use client'

import { useState } from 'react'

const FAQ_ITEMS = [
  {
    question: `Est-ce vraiment conforme au Code du Travail ?`,
    answer: `Oui. Quartzbase vérifie automatiquement 7 règles légales : repos quotidien minimum (11h), durée journalière, durée hebdomadaire, pauses obligatoires, jours consécutifs, travail du dimanche et travail de nuit. Vous recevez une alerte immédiate si une anomalie est détectée dans votre planning.`,
  },
  {
    question: `Mes employés ont besoin d'un ordinateur ?`,
    answer: `Non. Tout fonctionne sur smartphone, sans installation. Pointage, consultation du planning, demandes de congés — depuis leur iPhone ou Android, directement dans le navigateur. Vous n'avez rien à configurer pour eux.`,
  },
  {
    question: `En quoi Quartzbase est différent des logiciels de planning traditionnels ?`,
    answer: `Quartzbase démarre à 49€/mois, là où beaucoup de solutions classiques se situent souvent entre 150 et 200€/mois, et inclut une IA qui génère le planning automatiquement. La plupart des logiciels traditionnels n'ont ni génération IA ni vérification légale automatique. Vous payez moins, et l'outil fait plus.`,
  },
  {
    question: `Puis-je annuler à tout moment ?`,
    answer: `Oui, sans engagement. Un clic dans vos paramètres, sans pénalité, sans formulaire à remplir. Vos données restent accessibles en lecture seule jusqu'à la fin de la période payée.`,
  },
  {
    question: `Comment fonctionne la période d'essai ?`,
    answer: `30 jours complets avec toutes les fonctionnalités activées — planning, badgeuse, congés, conformité, IA. Aucune carte bancaire demandée. Si vous ne continuez pas, votre compte passe automatiquement en lecture seule sans frais.`,
  },
  {
    question: `Mes données sont-elles sécurisées ?`,
    answer: `Vos données sont hébergées en Europe (conformité RGPD), chiffrées en transit et au repos, et sauvegardées chaque jour. Vous pouvez les exporter ou les supprimer à tout moment depuis vos paramètres.`,
  },
  {
    question: `Puis-je gérer plusieurs établissements ?`,
    answer: `Oui, avec le plan Multi-site. Gérez plusieurs établissements depuis un seul compte avec des données strictement isolées par site et une vue d'ensemble consolidée.`,
  },
  {
    question: `L'IA fonctionne vraiment pour générer le planning ?`,
    answer: `Oui. L'IA analyse vos contrats, disponibilités, congés approuvés et contraintes légales pour générer un planning complet en quelques secondes. Vous prévisualisez le résultat avant de l'appliquer — l'IA propose, vous décidez. Plan Essentiel : 3 générations/mois. Plan Pro et Multi-site : illimité.`,
  },
  {
    question: `Comment ajouter mes employés ?`,
    answer: `Ajout manuel en renseignant nom, email, poste et type de contrat. L'employé reçoit automatiquement une invitation par email pour créer son compte et accéder à son planning depuis son téléphone. Aucun import de fichier requis.`,
  },
  {
    question: `Quel support est disponible ?`,
    answer: `Support en français par email, réponse sous 24h en semaine. Le plan Multi-site bénéficie d'un support prioritaire avec réponse garantie sous 4h.`,
  },
]

interface FAQProps {
  items?: typeof FAQ_ITEMS
  accentColor?: string
}

export function FAQ({ items = FAQ_ITEMS, accentColor = '#6C63FF' }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex(prev => (prev === i ? null : i))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div
            key={i}
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              overflow: 'hidden',
              transition: 'border-color 200ms ease',
              borderColor: isOpen ? `${accentColor}40` : 'rgba(255,255,255,0.06)',
            }}
          >
            {/* Bouton question */}
            <button
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '18px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 500,
                fontSize: 15,
                color: isOpen ? '#ffffff' : 'rgba(255,255,255,0.82)',
                lineHeight: 1.4,
                transition: 'color 200ms ease',
              }}>
                {item.question}
              </span>

              {/* Chevron */}
              <span style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: isOpen ? `${accentColor}20` : 'rgba(255,255,255,0.06)',
                transition: 'background 200ms ease, transform 250ms ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }} aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  style={{ color: isOpen ? accentColor : 'rgba(255,255,255,0.4)' }}>
                  <path d="M2 4.5l4 4 4-4" />
                </svg>
              </span>
            </button>

            {/* Réponse — max-height trick */}
            <div style={{
              maxHeight: isOpen ? 400 : 0,
              overflow: 'hidden',
              transition: 'max-height 300ms ease',
            }}>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                lineHeight: 1.7,
                color: 'rgba(255,255,255,0.55)',
                padding: '0 20px 20px',
                margin: 0,
              }}>
                {item.answer}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* Section wrapper pour la landing page */
export function FaqSection() {
  return (
    <section
      id="faq"
      style={{
        background: '#0a0a0f',
        padding: '96px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6C63FF',
            marginBottom: 16,
          }}>
            FAQ
          </p>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            Vos questions, nos réponses
          </h2>
        </div>

        <FAQ />
      </div>
    </section>
  )
}
