'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar, Users, Clock, Zap, ArrowLeftRight, Scale,
  LineChart, BookOpen, ChevronRight, ChevronLeft, X,
  CheckCircle2, Sparkles, ShieldCheck, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'nexus-onboarding-v1'

// ── Steps definition ──────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: Sparkles,
    color: '#2D3A8C',
    colorLight: '#EEF0FA',
    title: 'Bienvenue sur Nexus',
    subtitle: 'Votre outil de gestion RH & planning',
    description:
      'Nexus centralise tout ce dont vous avez besoin pour gérer votre établissement : planning, employés, congés, présences, conformité légale et bien plus.',
    tips: [
      'La navigation principale est en haut de l\'écran',
      'Vous pouvez basculer d\'un établissement à l\'autre depuis le switcher en haut à droite',
      'L\'assistant IA est disponible en bas à droite à tout moment',
    ],
  },
  {
    icon: Calendar,
    color: '#2563EB',
    colorLight: '#EFF6FF',
    title: 'Planning & Shifts',
    subtitle: 'Créez et publiez vos plannings en quelques clics',
    description:
      'Le planning semaine vous permet de créer des shifts par employé, de les modifier par drag & drop, et de publier la semaine d\'un clic pour notifier toute l\'équipe.',
    tips: [
      'Cliquez sur une cellule vide pour créer un shift instantanément',
      'Les shifts en gris sont en mode "brouillon" — publiez pour notifier',
      'Le bouton IA ✨ génère automatiquement une proposition de planning',
    ],
    link: { label: 'Ouvrir le planning', href: '/manager/planning' },
  },
  {
    icon: Users,
    color: '#7C3AED',
    colorLight: '#EDE9FE',
    title: 'Employés & Congés',
    subtitle: 'Gérez votre équipe et les demandes d\'absence',
    description:
      'Ajoutez vos employés avec leur contrat, type de poste et taux horaire. Gérez les demandes de congés avec une approbation en un clic et un solde mis à jour automatiquement.',
    tips: [
      'Le badge orange sur "Congés" indique les demandes en attente',
      'Chaque refus peut inclure un motif visible par l\'employé',
      'Le calendrier des absences est visible dans la vue planning',
    ],
    link: { label: 'Voir les employés', href: '/manager/employees' },
  },
  {
    icon: Clock,
    color: '#D97706',
    colorLight: '#FEF3C7',
    title: 'Présences & Badgeuse',
    subtitle: 'Suivez les heures réelles de votre équipe',
    description:
      'Les employés pointent depuis leur téléphone (clock-in / clock-out). Vous visualisez en temps réel qui est présent, et générez les rapports de paie à partir des heures effectives.',
    tips: [
      'Un shift sans pointage apparaît comme "absent" dans le rapport',
      'Le rapport compare heures planifiées vs heures réelles',
      'Exportez en CSV ou PDF pour votre comptable',
    ],
    link: { label: 'Voir les présences', href: '/manager/presences' },
  },
  {
    icon: Zap,
    color: '#059669',
    colorLight: '#D1FAE5',
    title: 'IA & Auto-planning',
    subtitle: 'Laissez l\'IA générer votre planning de la semaine',
    description:
      'Cliquez sur le bouton ✨ dans le planning, choisissez la semaine, et l\'IA propose des shifts cohérents en tenant compte des contrats, postes et historique de présence.',
    tips: [
      'L\'IA respecte les contrats (CDI 35h, CDI 28h, Extra…)',
      'Vous validez ou ajustez chaque shift avant d\'appliquer',
      'Limité à 10 générations par heure pour éviter les abus',
    ],
  },
  {
    icon: ArrowLeftRight,
    color: '#0891B2',
    colorLight: '#E0F2FE',
    title: 'Échanges & Marketplace',
    subtitle: 'Gérez les remplacements de dernière minute',
    description:
      'Un employé peut proposer un échange de shift à un collègue — vous validez ou refusez. La Marketplace va plus loin : publiez un shift vacant et les employés disponibles postulent en temps réel.',
    tips: [
      'Les échanges vous sont soumis pour validation avant tout transfert',
      'La Marketplace notifie automatiquement les employés sans conflit ce jour-là',
      'Vous confirmez le remplaçant d\'un clic — le shift est réassigné',
    ],
    link: { label: 'Voir la Marketplace', href: '/manager/marketplace' },
  },
  {
    icon: Scale,
    color: '#DC2626',
    colorLight: '#FEF2F2',
    title: 'Conformité légale',
    subtitle: 'Détectez les infractions au Code du travail',
    description:
      'Nexus analyse automatiquement votre planning et signale les anomalies : repos quotidien insuffisant, durée max dépassée, pause manquante, jours consécutifs, travail de nuit…',
    tips: [
      'Le score de conformité va de 0 (non conforme) à 100 (parfait)',
      'Chaque violation affiche la référence légale exacte (Article L…)',
      'Une correction suggérée est proposée pour chaque anomalie',
    ],
    link: { label: 'Vérifier la conformité', href: '/manager/compliance' },
  },
  {
    icon: BarChart3,
    color: '#2D3A8C',
    colorLight: '#EEF0FA',
    title: 'Analytiques RH',
    subtitle: 'Pilotez vos coûts et votre absentéisme',
    description:
      'Le tableau de bord analytique agrège masse salariale, taux de présence, absences par type et turnover sur 4 semaines à 12 mois. Les employés à risque (absences fréquentes, retards chroniques) sont signalés.',
    tips: [
      'Définissez un objectif CA pour afficher le ratio masse salariale / CA',
      'Les badges "Maladie fréq.", "Retards chron." identifient les situations à surveiller',
      'Changez la période (4 sem → 12 mois) pour une vue long terme',
    ],
    link: { label: 'Voir les analytiques', href: '/manager/analytics' },
  },
  {
    icon: BookOpen,
    color: '#16A34A',
    colorLight: '#DCFCE7',
    title: 'Vous êtes prêt 🎉',
    subtitle: 'Le centre d\'aide est là si vous en avez besoin',
    description:
      'Ces 8 points couvrent l\'essentiel. Retrouvez des guides détaillés, conseils et astuces dans le Centre d\'aide accessible à tout moment depuis la navigation.',
    tips: [
      'Le centre d\'aide est accessible via "Aide" dans la barre de navigation',
      'L\'assistant IA (bulle en bas à droite) répond à vos questions sur Nexus',
      'En cas de problème, contactez le support depuis les Paramètres',
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  role: 'manager' | 'employee' | 'supervisor'
}

export function OnboardingWizard({ role }: OnboardingWizardProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [step, setStep]       = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (role !== 'manager' && role !== 'supervisor') return
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) setVisible(true)
  }, [role])

  function finish() {
    setExiting(true)
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1')
      setVisible(false)
    }, 300)
  }

  function handleSkip() { finish() }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      finish()
    }
  }

  function handlePrev() {
    if (step > 0) setStep(s => s - 1)
  }

  function handleHelp() {
    finish()
    setTimeout(() => router.push('/manager/help'), 350)
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1
  const Icon    = current.icon

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300',
        exiting ? 'opacity-0' : 'opacity-100'
      )}
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className={cn(
          'relative bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl transition-all duration-300',
          exiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        )}
      >
        {/* Progress bar */}
        <div className="h-1 rounded-t-2xl overflow-hidden bg-[var(--border)]">
          <div
            className="h-full transition-all duration-500 rounded-t-2xl"
            style={{
              width: `${((step + 1) / STEPS.length) * 100}%`,
              background: current.color,
            }}
          />
        </div>

        {/* Header */}
        <div className="px-6 pt-5 pb-0 flex items-center justify-between">
          <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.08em]">
            Étape {step + 1} / {STEPS.length}
          </span>
          <button
            onClick={handleSkip}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-page)] transition-colors"
            title="Passer le tutoriel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: current.colorLight }}
          >
            <Icon className="h-7 w-7" style={{ color: current.color }} />
          </div>

          {/* Title */}
          <h2 className="text-[20px] font-bold text-[var(--text-primary)] tracking-[-0.02em] leading-tight">
            {current.title}
          </h2>
          <p className="text-[13px] font-medium mt-0.5" style={{ color: current.color }}>
            {current.subtitle}
          </p>

          {/* Description */}
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mt-3">
            {current.description}
          </p>

          {/* Tips */}
          <div className="mt-4 space-y-2">
            {current.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2
                  className="h-3.5 w-3.5 mt-0.5 flex-shrink-0"
                  style={{ color: current.color }}
                />
                <p className="text-[12px] text-[var(--text-secondary)]">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step dots */}
        <div className="px-6 flex items-center justify-center gap-1.5 pb-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                'rounded-full transition-all duration-200',
                i === step ? 'w-5 h-1.5' : 'w-1.5 h-1.5 bg-[var(--border)] hover:bg-[var(--text-tertiary)]'
              )}
              style={i === step ? { background: current.color } : {}}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 flex items-center gap-3">
          {step > 0 ? (
            <button
              onClick={handlePrev}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border)] text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="px-4 py-2 rounded-xl text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Passer
            </button>
          )}

          <div className="flex-1" />

          {isLast ? (
            <div className="flex gap-2">
              <button
                onClick={handleHelp}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <BookOpen className="h-4 w-4" /> Centre d&apos;aide
              </button>
              <button
                onClick={finish}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-[13px] font-medium transition-opacity hover:opacity-90"
                style={{ background: current.color }}
              >
                Commencer <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-[13px] font-medium transition-opacity hover:opacity-90"
              style={{ background: current.color }}
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick link */}
        {current.link && (
          <div
            className="mx-6 mb-5 -mt-1 px-4 py-2.5 rounded-xl border text-center"
            style={{ borderColor: `${current.color}30`, background: current.colorLight }}
          >
            <button
              onClick={() => { finish(); setTimeout(() => router.push(current.link!.href), 350) }}
              className="text-[12px] font-medium transition-opacity hover:opacity-80"
              style={{ color: current.color }}
            >
              → {current.link.label}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
