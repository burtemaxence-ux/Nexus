'use client'

import { ChevronRight, FileText, Calendar, Mail, Users, AlertTriangle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ComplianceAlert } from '@/types'
import type { DocumentType } from '@/app/api/compliance/generate-document/route'

type ComplianceAlertWithProfile = ComplianceAlert & {
  profiles?: { id: string; full_name: string | null; position: string | null } | null
}

export function OptionCard({ icon: Icon, title, description, onClick, disabled, accent }: {
  icon: React.ElementType; title: string; description: string; onClick: () => void; disabled?: boolean; accent?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left p-4 rounded-xl border border-[var(--border)] hover:bg-[var(--accent-light)] transition-colors flex items-start gap-3 group',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center mt-0.5"
        style={{ backgroundColor: accent ? `${accent}20` : 'var(--accent-light)' }}>
        <Icon className="h-4 w-4" style={{ color: accent ?? 'var(--accent)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5 leading-snug">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
    </button>
  )
}

interface Props {
  alert: ComplianceAlertWithProfile
  role: 'manager' | 'supervisor'
  generating: boolean
  isPro: boolean
  onGenerateDocument: (dtype: DocumentType) => void
  onGenerateEmail: () => void
  onGoToPlanning: () => void
  onSos: () => void
  onTrialChoice: () => void
}

export function ComplianceMenuView({ alert, role, generating, isPro, onGenerateDocument, onGenerateEmail, onGoToPlanning, onSos, onTrialChoice }: Props) {
  const hasDocAction =
    role === 'manager' &&
    (alert.type === 'hours_exceeded' || alert.type === 'requalification_risk' ||
     alert.type === 'cdd_ending' || alert.type === 'trial_ending')

  return (
    <div className="p-5 space-y-3">
      {(alert.type === 'hours_exceeded' || alert.type === 'requalification_risk') && (
        <OptionCard
          icon={Calendar}
          title="Réduire les heures planifiées"
          description="Ouvrir le planning de la semaine prochaine avec un objectif d'heures"
          accent="#16A34A"
          onClick={onGoToPlanning}
        />
      )}
      {(alert.type === 'hours_exceeded' || alert.type === 'requalification_risk') && (
        <OptionCard
          icon={Users}
          title="Retirer un shift et chercher un remplaçant"
          description="Sélectionner un shift cette semaine et déclencher le flow SOS Remplacement"
          accent="#D97706"
          onClick={onSos}
        />
      )}

      {isPro ? (
        <>
          {role === 'manager' && (alert.type === 'hours_exceeded' || alert.type === 'requalification_risk') && (
            <OptionCard
              icon={FileText}
              title="Créer un avenant de contrat"
              description="Générer un avenant pour régulariser les heures de travail"
              accent="#2563EB"
              disabled={generating}
              onClick={() => onGenerateDocument('avenant_heures')}
            />
          )}
          {role === 'manager' && alert.type === 'cdd_ending' && (
            <OptionCard
              icon={FileText}
              title="Créer un avenant de renouvellement"
              description="Générer un avenant de renouvellement ou de transformation en CDI"
              accent="#2563EB"
              disabled={generating}
              onClick={() => onGenerateDocument('avenant_cdd')}
            />
          )}
          <OptionCard
            icon={Mail}
            title="Envoyer un résumé à mon expert-comptable"
            description="Générer un email professionnel factuel à partager avec votre conseil"
            accent="#7C3AED"
            disabled={generating}
            onClick={onGenerateEmail}
          />
          {role === 'manager' && alert.type === 'trial_ending' && (
            <OptionCard
              icon={AlertTriangle}
              title="Générer la lettre de période d'essai"
              description="Confirmer l'embauche ou rompre la période d'essai — génération du courrier"
              accent="#DC2626"
              onClick={onTrialChoice}
            />
          )}
        </>
      ) : (hasDocAction || true) && (
        <div className="rounded-xl border border-[#6366F1]/30 bg-[#EEF2FF] p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#6366F1]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-[#6366F1]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#4338CA]">Disponible en Pro</p>
            <p className="text-[12px] text-[#6366F1] mt-0.5 leading-snug">
              La génération de documents juridiques et d&apos;emails pour expert-comptable est réservée au plan Pro ou Multi-site.
            </p>
            <Link
              href="/manager/settings/billing"
              className="inline-flex items-center gap-1 mt-2 text-[12px] font-medium text-[#4F46E5] hover:underline"
            >
              Passer au plan Pro →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
