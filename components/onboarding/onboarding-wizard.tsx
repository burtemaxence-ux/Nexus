'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, Tags, Users, Calendar, Send,
  ShieldCheck, Clock, ArrowLeftRight, FileDown, Wallet,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, X, CheckCircle2,
} from 'lucide-react'

const STEPS = [
  {
    icon: Sparkles,
    color: '#2D3A8C',
    colorLight: '#EEF0FA',
    title: 'Bienvenue sur Quartzbase',
    description: 'Votre outil de gestion RH & planning. Suivez ces étapes pour configurer votre établissement et démarrer rapidement.',
    cta: 'Commencer',
    href: null,
  },
  {
    icon: Tags,
    color: '#7C3AED',
    colorLight: '#EDE9FE',
    title: 'Créez vos postes',
    description: 'Définissez les postes de votre établissement (serveur, cuisinier, barman…) pour organiser vos plannings.',
    cta: 'Configurer les postes',
    href: '/manager/settings',
  },
  {
    icon: Users,
    color: '#2563EB',
    colorLight: '#EFF6FF',
    title: 'Invitez votre équipe',
    description: 'Ajoutez vos employés en leur envoyant une invitation par email. Ils accèdent à leur espace dès réception.',
    cta: 'Inviter des employés',
    href: '/manager/employees',
  },
  {
    icon: Calendar,
    color: '#059669',
    colorLight: '#D1FAE5',
    title: 'Créez votre premier planning',
    description: "Cliquez sur une cellule vide dans le planning pour ajouter un shift. L'IA peut aussi générer un planning complet.",
    cta: 'Ouvrir le planning',
    href: '/manager/planning',
  },
  {
    icon: Send,
    color: '#D97706',
    colorLight: '#FEF3C7',
    title: 'Publiez votre planning',
    description: 'Une fois votre planning prêt, cliquez sur "Publier" pour notifier toute votre équipe par email automatiquement.',
    cta: 'Terminer',
    href: null,
  },
]

// ── Parcours de DÉMONSTRATION ─────────────────────────────────────────────────
// Distincts des étapes ci-dessus : l'onboarding réel guide la CONFIGURATION d'un
// compte vide (« créez vos postes », « invitez votre équipe »), ce qui n'a aucun
// sens sur une démo déjà peuplée. Ici on fait visiter ce qui est déjà là.

const DEMO_STEPS_MANAGER = [
  {
    icon: Sparkles, color: '#2D3A8C', colorLight: '#EEF0FA',
    title: 'Bienvenue dans la démo',
    description: "Vous êtes manager de « La Boulangerie du Soleil », 8 salariés. Tout est réel : c'est l'application elle-même, avec des données fictives. Modifiez ce que vous voulez, rien n'est en jeu.",
    cta: 'Faire le tour', href: null,
  },
  {
    icon: Calendar, color: '#059669', colorLight: '#D1FAE5',
    title: 'Le planning de la semaine',
    description: "Glissez un service d'un jour à l'autre, cliquez sur une case vide pour en ajouter un. L'IA peut aussi générer une semaine complète sous contraintes.",
    cta: 'Ouvrir le planning', href: '/manager/planning',
  },
  {
    icon: ShieldCheck, color: '#DC2626', colorLight: '#FEE2E2',
    title: 'Le contrôle de conformité',
    description: "Le cœur du produit : 17 règles du Code du travail vérifiées en continu — repos quotidien, durées maximales, coupures, travail des mineurs. Chaque alerte cite son article.",
    cta: 'Voir les alertes', href: '/manager/compliance',
  },
  {
    icon: Wallet, color: '#7C3AED', colorLight: '#EDE9FE',
    title: 'Ce que le planning coûte',
    description: "Heures planifiées converties en masse salariale estimée, comparée à la semaine précédente. C'est le chiffre que le gérant regarde en premier.",
    cta: 'Voir le tableau de bord', href: '/manager',
  },
  {
    icon: FileDown, color: '#D97706', colorLight: '#FEF3C7',
    title: 'Les exports',
    description: 'Planning en PDF, flux iCal pour les agendas, et une DSN mensuelle pré-remplie au format NEODeS pour le comptable.',
    cta: 'Terminer', href: '/manager/settings/exports',
  },
]

const DEMO_STEPS_EMPLOYEE = [
  {
    icon: Sparkles, color: '#2D3A8C', colorLight: '#EEF0FA',
    title: 'Bienvenue dans la démo',
    description: "Vous êtes salarié de « La Boulangerie du Soleil ». C'est exactement l'écran que voit un employé — même application, mêmes droits, données fictives.",
    cta: 'Faire le tour', href: null,
  },
  {
    icon: Calendar, color: '#059669', colorLight: '#D1FAE5',
    title: 'Vos services',
    description: 'Vos horaires de la semaine, dès que le manager publie le planning. Consultable hors ligne et installable sur le téléphone.',
    cta: 'Voir mon planning', href: '/employee/planning',
  },
  {
    icon: Clock, color: '#2563EB', colorLight: '#EFF6FF',
    title: 'Le pointage',
    description: "Arrivée et départ pointés depuis le téléphone avec un code PIN. Les oublis sont détectés automatiquement le soir même.",
    cta: 'Ouvrir la badgeuse', href: '/employee/badgeuse',
  },
  {
    icon: Send, color: '#7C3AED', colorLight: '#EDE9FE',
    title: 'Vos congés',
    description: 'Demande en deux clics, solde estimé, et réponse du manager notifiée. Plus de demandes perdues par SMS.',
    cta: 'Voir les congés', href: '/employee/conges',
  },
  {
    icon: ArrowLeftRight, color: '#D97706', colorLight: '#FEF3C7',
    title: 'Les échanges de services',
    description: "Proposez un service à l'équipe, ou reprenez celui d'un collègue. Le manager valide, le planning se met à jour tout seul.",
    cta: 'Terminer', href: '/employee/echanges',
  },
]

const DEMO_DONE_KEY = 'qb-demo-tour-done'

interface OnboardingWizardProps {
  role: 'manager' | 'employee' | 'supervisor'
  /** Compte de démonstration : joue le parcours de visite au lieu de la configuration. */
  demo?: boolean
}

export function OnboardingWizard({ role, demo = false }: OnboardingWizardProps) {
  const router = useRouter()
  const [visible, setVisible]       = useState(false)
  const [minimized, setMinimized]   = useState(false)
  const [step, setStep]             = useState(0)
  const [done, setDone]             = useState(false)
  const [exiting, setExiting]       = useState(false)

  const steps = demo
    ? (role === 'employee' ? DEMO_STEPS_EMPLOYEE : DEMO_STEPS_MANAGER)
    : STEPS

  useEffect(() => {
    // Démo : les DEUX rôles ont un parcours, et l'état ne vit qu'en local —
    // les comptes de démonstration sont réinitialisés chaque nuit, il n'y a
    // rien à persister côté serveur.
    if (demo) {
      if (localStorage.getItem(DEMO_DONE_KEY) === 'true') return
      const savedDemo = localStorage.getItem('nexus-onboarding-step')
      if (savedDemo) setStep(parseInt(savedDemo, 10))
      setVisible(true)
      return
    }
    if (role !== 'manager' && role !== 'supervisor') return
    const saved = localStorage.getItem('nexus-onboarding-step')
    if (saved) setStep(parseInt(saved, 10))
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        if (data.onboarding_completed !== 'true') setVisible(true)
      })
      .catch(() => setVisible(true))
  }, [role, demo])

  function saveStep(s: number) {
    setStep(s)
    localStorage.setItem('nexus-onboarding-step', String(s))
  }

  async function finish() {
    setDone(true)
    if (demo) {
      localStorage.setItem(DEMO_DONE_KEY, 'true')
    } else {
      try {
        await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ onboarding_completed: 'true' }),
        })
      } catch { /* best-effort */ }
    }
    localStorage.removeItem('nexus-onboarding-step')
    setTimeout(() => {
      setExiting(true)
      setTimeout(() => { setVisible(false); setExiting(false) }, 300)
    }, 2000)
  }

  function handleNext() {
    if (step < steps.length - 1) {
      saveStep(step + 1)
    } else {
      finish()
    }
  }

  function handlePrev() {
    if (step > 0) saveStep(step - 1)
  }

  function handleCtaClick() {
    const current = steps[step]
    if (current.href) router.push(current.href)
    handleNext()
  }

  if (!visible) return null

  const current = steps[step]
  const isFirst = step === 0
  const isLast  = step === steps.length - 1
  const Icon    = current.icon
  const progress = Math.round(((step + 1) / steps.length) * 100)

  return (
    <div
      className="fixed z-50"
      style={{ bottom: '88px', right: '24px' }}
    >
      {/* Minimized pill */}
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-lg transition-all"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '0.5px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <div
            className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: current.colorLight }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: current.color }} />
          </div>
          <span className="text-[12px] font-medium">Démarrage Quartzbase</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: current.colorLight, color: current.color }}
          >
            {step + 1}/{steps.length}
          </span>
          <ChevronUp className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
        </button>
      ) : (
        /* Expanded card */
        <div
          className="w-80 rounded-2xl shadow-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '0.5px solid var(--border)',
            opacity: exiting ? 0 : 1,
            transform: exiting ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 250ms ease, transform 250ms ease',
          }}
        >
          {/* Progress bar */}
          <div className="h-0.5 w-full" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="h-full transition-all duration-400"
              style={{ width: done ? '100%' : `${progress}%`, backgroundColor: done ? '#059669' : current.color }}
            />
          </div>

          {done ? (
            /* Congratulations state */
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center gap-3">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                <CheckCircle2 className="h-6 w-6" style={{ color: '#059669' }} />
              </div>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  🎉 Vous êtes prêt !
                </p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Votre établissement est configuré. Bon démarrage !
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-0">
                <span className="text-[10px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-tertiary)' }}>
                  Étape {step + 1} / {steps.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMinimized(true)}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Réduire"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={finish}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Passer le tutoriel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-4 pt-3 pb-4">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: current.colorLight }}
                >
                  <Icon className="h-5 w-5" style={{ color: current.color }} />
                </div>

                <h3 className="text-[15px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {current.title}
                </h3>
                <p className="text-[12px] leading-relaxed mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {current.description}
                </p>
              </div>

              {/* Step dots */}
              <div className="flex justify-center gap-1.5 pb-3">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => saveStep(i)}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: i === step ? '16px' : '6px',
                      height: '6px',
                      backgroundColor: i === step ? current.color : 'var(--border)',
                    }}
                  />
                ))}
              </div>

              {/* Footer */}
              <div
                className="flex items-center gap-2 px-4 pb-4"
                style={{ borderTop: '0.5px solid var(--border)', paddingTop: '12px' }}
              >
                {!isFirst && (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] transition-colors"
                    style={{ border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Préc.
                  </button>
                )}

                <div className="flex-1" />

                {isLast ? (
                  <button
                    onClick={finish}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: current.color }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Terminer
                  </button>
                ) : current.href ? (
                  <button
                    onClick={handleCtaClick}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: current.color }}
                  >
                    {current.cta}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: current.color }}
                  >
                    {current.cta}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
