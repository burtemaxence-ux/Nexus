'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Reveal } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

const FAQS = [
  { q: 'Combien de temps avant de voir un résultat ?', a: "Dès la première semaine. Votre premier planning est prêt en 10 minutes, et vous récupérez vos dimanches soir immédiatement. La plupart des patrons ne reviennent jamais à Excel." },
  { q: "Est-ce compliqué pour quelqu'un qui n'est pas à l'aise avec l'informatique ?", a: "Non. Si vous savez utiliser WhatsApp, vous saurez utiliser Quartzbase. La configuration prend 10 minutes et on vous guide pas à pas, en français." },
  { q: 'Le prix est-il vraiment justifié pour ma petite équipe ?', a: "À partir de 49€/mois, soit moins de 2€ par jour. C'est l'équivalent d'un café : pour ne plus jamais refaire un planning à la main et éviter une seule amende, c'est vite rentabilisé." },
  { q: 'Et si je suis déjà sur Excel ou un autre logiciel ?', a: "On récupère vos plannings et votre équipe sans tout ressaisir. Le changement se fait en douceur, on vous accompagne pour l'import." },
  { q: 'Mes salariés doivent-ils installer une application ?', a: "Non, c'est optionnel. Ils reçoivent leur planning par SMS ou via un simple lien. Fini les photos floues dans le groupe WhatsApp." },
  { q: "Que se passe-t-il après les 14 jours d'essai ?", a: "Rien d'automatique. Aucune carte bancaire n'est demandée à l'inscription : vous choisissez librement de continuer, ou pas. Zéro mauvaise surprise." },
  { q: 'Puis-je arrêter quand je veux ?', a: "Oui, en 1 clic depuis votre compte. Sans engagement, sans préavis, sans frais de résiliation. Vous restez parce que ça marche, pas parce que vous êtes coincé." },
  { q: 'Est-ce vraiment conforme à la loi française ?', a: "Oui. Repos de 11h, durées maximales, pauses, dimanches : 7 règles du Code du travail vérifiées à chaque planning, mises à jour avec la législation. Vos données sont hébergées en Europe et conformes au RGPD." },
]

function FaqCheck() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx={12} cy={12} r={11} fill="rgba(0,212,170,0.18)" />
      <path d="M7 12.5l3 3 7-7" stroke="#00D4AA" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Accordéon FAQ réutilisable (utilisé par le centre d'aide du dashboard).
   Conservé tel quel — ne pas confondre avec la FaqSection de la landing.
   ────────────────────────────────────────────────────────────────────────── */

const FAQ_ITEMS = [
  {
    question: `Est-ce vraiment conforme au Code du Travail ?`,
    answer: `Oui. Quartzbase vérifie automatiquement 7 règles légales : repos quotidien minimum (11h), durée journalière, durée hebdomadaire, pauses obligatoires, jours consécutifs, travail du dimanche et travail de nuit. Vous recevez une alerte immédiate si une anomalie est détectée dans votre planning.`,
  },
  {
    question: `Mes employés ont besoin d'un ordinateur ?`,
    answer: `Non. Tout se passe sur smartphone, sans rien installer. Pointage, planning, demandes de congés : ils font tout depuis leur iPhone ou Android, directement dans le navigateur. Vous n'avez rien à régler pour eux.`,
  },
  {
    question: `En quoi Quartzbase est différent des logiciels de planning traditionnels ?`,
    answer: `Quartzbase démarre à 49€/mois, quand beaucoup de solutions classiques tournent plutôt entre 150 et 200€/mois. En prime, une IA génère le planning pour vous et les règles légales sont vérifiées toutes seules : deux choses que la plupart des logiciels traditionnels ne font pas. Du coup vous payez moins cher pour un outil qui en fait plus.`,
  },
  {
    question: `Puis-je annuler à tout moment ?`,
    answer: `Oui, sans engagement. Un clic dans vos paramètres, sans pénalité, sans formulaire à remplir. Vos données restent accessibles en lecture seule jusqu'à la fin de la période payée.`,
  },
  {
    question: `Comment fonctionne la période d'essai ?`,
    answer: `30 jours complets, toutes les fonctions débloquées : planning, badgeuse, congés, conformité, IA. Aucune carte bancaire demandée. Si vous ne continuez pas, votre compte passe en lecture seule, sans frais.`,
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
    answer: `Oui. L'IA regarde vos contrats, les disponibilités, les congés validés et les règles légales, puis sort un planning complet en quelques secondes. Vous voyez le résultat avant de l'appliquer : rien ne part sans votre feu vert. Plan Essentiel : 3 générations/mois. Pro et Multi-site : illimité.`,
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

export function FaqSection() {
  const [open, setOpen] = useState(0)

  return (
    <section id="faq" style={{ position: 'relative', zIndex: 2, maxWidth: 1080, margin: '110px auto 0', padding: '0 32px', fontFamily: FONT }}>
      <div className="qb-faq-grid" style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 56, alignItems: 'start' }}>

        {/* Colonne gauche sticky */}
        <Reveal className="qb-faq-left" style={{ position: 'sticky', top: 110 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#9090a8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Questions fréquentes</div>
          <h2 style={{ fontWeight: 700, fontSize: 40, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 18px' }}>On répond à vos doutes</h2>
          <p style={{ fontSize: 16, color: '#a6a8b8', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 320 }}>Les questions que se posent la plupart des patrons avant de se lancer.</p>

          {/* Illustration Q→A */}
          <div style={{ background: '#0f0f15', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 22, maxWidth: 320 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div className="qb-bubble-q" style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px 14px 14px 4px', padding: '10px 14px' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#9090a8' }}>?</span>
                <span style={{ fontSize: 13, color: '#cfcfe0' }}>Une question…</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div className="qb-bubble-a" style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(108,99,255,0.14)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: '14px 14px 4px 14px', padding: '10px 14px' }}>
                <span className="qb-ans-check" style={{ display: 'inline-flex' }}><FaqCheck /></span>
                <span style={{ fontSize: 13, color: '#e6e4ff', fontWeight: 500 }}>Une réponse claire.</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 24, maxWidth: 320 }}>
            <span style={{ fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', color: '#fff' }}>9/10</span>
            <span style={{ fontSize: 13.5, color: '#9090a8', lineHeight: 1.5 }}>patrons trouvent leur réponse ici, sans avoir à nous écrire.</span>
          </div>
        </Reveal>

        {/* Colonne droite : accordéon */}
        <Reveal style={{ display: 'flex', flexDirection: 'column' }}>
          {FAQS.map((faq, i) => {
            const isOpen = open === i
            return (
              <button
                key={i}
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '22px 4px', cursor: 'pointer', background: 'none', textAlign: 'left', fontFamily: FONT, border: 'none', borderTopColor: 'rgba(255,255,255,0.08)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: isOpen ? '#ffffff' : '#dcdce6', lineHeight: 1.4, transition: 'color .2s ease' }}>{faq.q}</span>
                  <span style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .3s ease', transform: `rotate(${isOpen ? 45 : 0}deg)` }}>
                    <Plus size={14} color={isOpen ? '#6C63FF' : '#79828f'} strokeWidth={2.2} />
                  </span>
                </div>
                <div style={{ overflow: 'hidden', transition: 'max-height .35s ease, opacity .3s ease, margin-top .3s ease', maxHeight: isOpen ? 240 : 0, opacity: isOpen ? 1 : 0, marginTop: isOpen ? 14 : 0 }}>
                  <span style={{ fontSize: 14.5, color: '#a6a8b8', lineHeight: 1.65, display: 'block', maxWidth: '90%' }}>{faq.a}</span>
                </div>
              </button>
            )
          })}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
        </Reveal>
      </div>

      <style>{`
        @keyframes qbBubbleQ { 0%,8%{opacity:0;transform:translateY(8px)} 18%,46%{opacity:1;transform:none} 56%,100%{opacity:0.25;transform:none} }
        @keyframes qbBubbleA { 0%,30%{opacity:0;transform:translateY(8px)} 44%,92%{opacity:1;transform:none} 100%{opacity:0;transform:translateY(8px)} }
        @keyframes qbAnsCheck { 0%,32%{opacity:0;transform:scale(.4)} 46%,100%{opacity:1;transform:scale(1)} }
        .qb-bubble-q  { animation: qbBubbleQ 6s ease-in-out infinite; }
        .qb-bubble-a  { animation: qbBubbleA 6s ease-in-out infinite; }
        .qb-ans-check { animation: qbAnsCheck 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .qb-bubble-q, .qb-bubble-a, .qb-ans-check { animation: none; opacity: 1; }
        }
        @media (max-width: 880px) {
          .qb-faq-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .qb-faq-left { position: static !important; }
        }
      `}</style>
    </section>
  )
}
