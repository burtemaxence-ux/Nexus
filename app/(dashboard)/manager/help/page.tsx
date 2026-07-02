'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FAQ } from '@/components/public/faq'
import {
  Calendar, Users, Clock, Zap, ArrowLeftRight, Scale,
  LineChart, BookOpen, ChevronDown, ChevronUp, ExternalLink,
  CheckCircle2, Webhook, Key, Building2, BarChart3, Palmtree,
  AlertTriangle, ShieldCheck, Sparkles, FileText, TrendingUp, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface HelpSection {
  id: string
  icon: React.ElementType
  color: string
  colorLight: string
  title: string
  description: string
  href?: string
  hrefLabel?: string
  blocks: {
    title: string
    items: string[]
  }[]
  tips?: string[]
}

// ── Content ───────────────────────────────────────────────────────────────────

const SECTIONS: HelpSection[] = [
  {
    id: 'planning',
    icon: Calendar,
    color: '#2563EB',
    colorLight: '#EFF6FF',
    title: 'Planning & Shifts',
    description: 'Créez et gérez les shifts de votre équipe semaine par semaine.',
    href: '/manager/planning',
    hrefLabel: 'Ouvrir le planning',
    blocks: [
      {
        title: 'Créer un shift',
        items: [
          'Cliquez sur n\'importe quelle cellule vide dans la vue semaine',
          'Renseignez l\'employé, l\'horaire de début/fin, le poste et la pause',
          'Validez — le shift apparaît en mode brouillon (grisé)',
          'Cliquez sur "Publier" pour notifier l\'équipe',
        ],
      },
      {
        title: 'Modifier ou supprimer',
        items: [
          'Cliquez sur un shift existant pour l\'éditer',
          'La corbeille supprime définitivement (soft delete côté base)',
          'Les shifts supprimés n\'apparaissent plus dans les rapports',
        ],
      },
      {
        title: 'Statuts des shifts',
        items: [
          '"Brouillon" → shift créé, non visible par l\'employé',
          '"Publié" → employé notifié, visible dans son planning',
          '"Terminé" → passé la date du shift',
        ],
      },
    ],
    tips: [
      'Créez un shift type "template" le lundi et copiez-le sur la semaine',
      'Le code couleur par poste vous donne une vue rapide de la couverture',
      'L\'IA peut générer une première ébauche de planning en quelques secondes',
    ],
  },
  {
    id: 'ai',
    icon: Sparkles,
    color: '#7C3AED',
    colorLight: '#EDE9FE',
    title: 'IA Auto-planning',
    description: 'Générez un planning complet automatiquement grâce à l\'intelligence artificielle.',
    href: '/manager/planning',
    hrefLabel: 'Ouvrir le planning',
    blocks: [
      {
        title: 'Lancer une génération',
        items: [
          'Depuis le planning, cliquez sur "Générer" (✨) en haut à droite',
          'Décrivez vos besoins en une phrase (ex : "3 serveurs le soir, fermé lundi")',
          'L\'IA construit le planning en 15 à 30 secondes',
        ],
      },
      {
        title: 'Application automatique',
        items: [
          'Les shifts sont créés directement en brouillon — plus besoin de cocher chaque case',
          'Un récapitulatif s\'affiche (nombre de shifts + résumé de la logique de l\'IA)',
          'Ajustez sur le planning, puis cliquez "Publier" pour notifier l\'équipe',
        ],
      },
      {
        title: 'Copilote de productivité (Pro)',
        items: [
          'Si vous avez saisi votre CA (Rapport), l\'IA prévoit l\'activité de la semaine',
          'Vous fixez une cible coût/CA, auto-calibrée sur votre historique',
          'Le planning est dimensionné au CA prévu, au moindre coût',
          'Le récap affiche le coût/CA estimé du planning généré',
        ],
      },
      {
        title: 'Limites & bonnes pratiques',
        items: [
          'Maximum 10 générations par heure (rate limit)',
          'Plan Essentiel : 3 générations IA/mois ; Pro & Multi-site : illimité',
          'Congés approuvés et contrats hebdomadaires respectés automatiquement',
        ],
      },
    ],
    tips: [
      'Après génération, utilisez le bouton "Vérifier" du planning pour contrôler la conformité',
      'Le copilote coût/CA nécessite un plan Pro et d\'avoir saisi votre CA dans le Rapport',
      'Décrivez votre contexte (service du soir, jours de fermeture…) pour un meilleur résultat',
    ],
  },
  {
    id: 'employees',
    icon: Users,
    color: '#D97706',
    colorLight: '#FEF3C7',
    title: 'Employés & Congés',
    description: 'Gérez vos employés et traitez les demandes d\'absence.',
    href: '/manager/employees',
    hrefLabel: 'Voir les employés',
    blocks: [
      {
        title: 'Ajouter un employé',
        items: [
          'Menu Employés → "Nouvel employé"',
          'Renseignez : prénom/nom, email, poste, type de contrat, heures hebdo',
          'Le taux horaire sert au calcul de la masse salariale dans les analytiques',
          'L\'employé reçoit un email d\'invitation à créer son compte',
        ],
      },
      {
        title: 'Gérer les congés',
        items: [
          'Le badge orange sur "Congés" indique les demandes en attente',
          'Cliquez sur une demande pour approuver ou refuser avec un motif',
          'Un refus envoie une notification à l\'employé avec votre motif',
          'Les congés approuvés bloquent automatiquement la planification ce jour-là',
        ],
      },
      {
        title: 'Archiver un employé',
        items: [
          'Un employé archivé n\'apparaît plus dans le planning ni les congés',
          'Ses données historiques restent accessibles dans les rapports',
          'Le turnover est calculé à partir des archivages (Analytiques)',
        ],
      },
    ],
    tips: [
      'Complétez le taux horaire pour que les analytiques soient précis',
      'Le solde de congés se met à jour automatiquement à chaque approbation',
    ],
  },
  {
    id: 'hr-file',
    icon: FileText,
    color: '#0D9488',
    colorLight: '#CCFBF1',
    title: 'Dossier RH / Fiche employé',
    description: 'Centralisez état civil, contrat et documents de chaque employé.',
    href: '/manager/employees',
    hrefLabel: 'Voir les employés',
    blocks: [
      {
        title: 'Informations & photo',
        items: [
          'Ouvrez une fiche employé → onglet "Infos"',
          'Ajoutez une photo de profil (PNG/JPG, max 2 Mo)',
          'État civil : date de naissance, nationalité, adresse postale',
          'Données paie : n° de sécurité sociale, IBAN, matricule',
          'Contact d\'urgence et expiration du titre de séjour (si hors UE)',
        ],
      },
      {
        title: 'Données contractuelles',
        items: [
          'Onglet "Contrat" → "Nouveau contrat"',
          'Type, dates, volume horaire, taux horaire et salaire brut mensuel',
          'Classification / coefficient de votre convention collective',
          'Avantages : mutuelle, tickets restaurant, transport 50 %',
          'Période d\'essai et préavis calculés automatiquement selon le type',
        ],
      },
      {
        title: 'Documents & PIN badgeuse',
        items: [
          'Onglet "Documents" : stockez contrats signés, justificatifs, attestations',
          'Le code PIN de la badgeuse se réinitialise depuis l\'onglet Infos',
          'Archiver l\'employé conserve son historique pour les rapports',
        ],
      },
    ],
    tips: [
      'Renseignez le taux horaire (ou le brut) pour des analytiques et un coût/CA précis',
      'La photo de profil apparaît dans l\'en-tête de la fiche et le service du jour',
    ],
  },
  {
    id: 'presences',
    icon: Clock,
    color: '#059669',
    colorLight: '#D1FAE5',
    title: 'Présences & Badgeuse',
    description: 'Suivez les heures réelles pointées par votre équipe.',
    href: '/manager/presences',
    hrefLabel: 'Voir les présences',
    blocks: [
      {
        title: 'Comment fonctionne le pointage',
        items: [
          'L\'employé ouvre l\'app sur son téléphone → "Badgeuse"',
          'Il clique "Pointer l\'arrivée" au début du shift',
          'Il clique "Pointer le départ" à la fin',
          'Les heures sont automatiquement comparées aux shifts planifiés',
        ],
      },
      {
        title: 'Lecture du tableau de présences',
        items: [
          'Vert = présent et à l\'heure',
          'Orange = retard enregistré (heure réelle > heure planifiée)',
          'Rouge = absent (shift planifié sans pointage)',
          'Le rapport détaille heures planifiées vs heures effectives',
        ],
      },
      {
        title: 'Exporter les données',
        items: [
          'Menu Paramètres → Exports',
          'Choisissez la période et le format (CSV ou PDF)',
          'Le CSV est compatible Excel pour le traitement de paie',
        ],
      },
    ],
    tips: [
      'Activez les notifications pour être alerté des absences non justifiées',
      'Le rapport de paie est accessible depuis Rapport → onglet "Paie"',
    ],
  },
  {
    id: 'exchanges',
    icon: ArrowLeftRight,
    color: '#0891B2',
    colorLight: '#E0F2FE',
    title: 'Échanges de shifts',
    description: 'Permettez à vos employés d\'échanger des shifts entre eux, avec votre validation.',
    href: '/manager/echanges',
    hrefLabel: 'Voir les échanges',
    blocks: [
      {
        title: 'Flow complet d\'un échange',
        items: [
          '① L\'employé A propose son shift à l\'employé B',
          '② B reçoit une notification et accepte ou refuse',
          '③ Si B accepte → vous êtes notifié pour validation finale',
          '④ Vous approuvez → le shift est transféré automatiquement',
        ],
      },
      {
        title: 'Votre rôle de manager',
        items: [
          'Vous voyez tous les échanges en attente de validation dans "Échanges"',
          'Vous pouvez refuser avec un motif visible des deux parties',
          'Aucun transfert n\'a lieu sans votre accord explicite',
        ],
      },
    ],
    tips: [
      'Les échanges n\'affectent pas les heures globales de la semaine',
      'Un refus ne clôture pas la demande — l\'employé peut proposer à quelqu\'un d\'autre',
    ],
  },
  {
    id: 'marketplace',
    icon: Zap,
    color: '#DC2626',
    colorLight: '#FEF2F2',
    title: 'Marketplace remplaçants',
    description: 'Trouvez un remplaçant en quelques minutes pour un shift non couvert.',
    href: '/manager/marketplace',
    hrefLabel: 'Ouvrir la Marketplace',
    blocks: [
      {
        title: 'Publier un shift',
        items: [
          'Marketplace → "Publier un shift"',
          'Sélectionnez le shift à pourvoir et la raison (maladie, renfort…)',
          'Choisissez l\'expiry : 2h, 4h, 8h ou 24h',
          'Les employés disponibles ce jour-là reçoivent une push notification',
        ],
      },
      {
        title: 'Gérer les candidatures',
        items: [
          'Chaque candidature apparaît dans la carte du slot',
          'Cliquez "Confirmer" sur le candidat retenu',
          'Le shift est réassigné instantanément',
          'Les autres candidats reçoivent un message "Shift pourvu"',
        ],
      },
      {
        title: 'Vérifications automatiques',
        items: [
          'L\'app vérifie que l\'employé n\'a pas de conflit ce jour-là',
          'Les congés approuvés bloquent la candidature automatiquement',
          'Un slot expiré ne peut plus recevoir de candidatures',
        ],
      },
    ],
    tips: [
      'Publiez dès que possible — plus tôt = plus de candidats',
      'L\'expiry 24h est recommandé pour les shifts du lendemain ou après-demain',
    ],
  },
  {
    id: 'compliance',
    icon: Scale,
    color: '#7C3AED',
    colorLight: '#EDE9FE',
    title: 'Conformité légale',
    description: 'Détectez automatiquement les infractions au Code du travail dans votre planning.',
    href: '/manager/compliance',
    hrefLabel: 'Vérifier la conformité',
    blocks: [
      {
        title: 'Règles vérifiées (17 au total)',
        items: [
          'Repos quotidien < 11h entre deux shifts (Art. L3131-1)',
          'Repos hebdomadaire < 35h consécutives (Art. L3132-2)',
          'Durée quotidienne > 10h (Art. L3121-18)',
          'Durée hebdomadaire > 48h (Art. L3121-20)',
          'Moyenne > 44h sur 12 semaines glissantes (Art. L3121-22)',
          'Amplitude journalière > 13h (Art. L3121-1)',
          'Pause insuffisante : < 20 min pour un shift > 6h (Art. L3121-16)',
          'Plus de 6 jours consécutifs sans repos (Art. L3132-1)',
          'Travail du dimanche sans dérogation (Art. L3132-3)',
          'Travail de nuit : plus d\'1h entre 21h et 6h (Art. L3122-2)',
          'Apprenti mineur : > 8h/jour ou > 35h/semaine (Art. L3162-1)',
          'Apprenti mineur : travail de nuit interdit 22h–6h / 20h–6h (Art. L3163-1)',
          'Apprenti mineur : repos quotidien < 12h (14h avant 16 ans) (Art. L3164-1)',
          'Apprenti mineur : pause < 30 min dès 4h30 (Art. L3162-3)',
          'Temps partiel : plus d\'une coupure par jour (Art. L3123-23 + CCN HCR)',
          'Dépassement des heures contractuelles planifiées',
        ],
      },
      {
        title: 'Lire le score de conformité',
        items: [
          '100 = aucune anomalie (vert)',
          '70–99 = points d\'attention (orange)',
          '< 70 = non conforme (rouge)',
          'Chaque violation "critique" coûte −5 points, "avertissement" −2',
        ],
      },
      {
        title: 'Agir sur les violations',
        items: [
          'Dépliez une violation pour voir la description exacte et la référence légale',
          'Une "Correction suggérée" indique quoi modifier',
          'Modifiez le shift dans le planning — rechargez pour voir le nouveau score',
        ],
      },
      {
        title: 'Vérifier depuis le planning',
        items: [
          'Sur le planning, cliquez le bouton "Vérifier" dans la barre d\'outils',
          'Les créneaux en infraction passent en rouge directement sur la grille',
          'Survolez une case rouge pour voir la règle et la référence légale',
          'Le bouton indique le nombre d\'infractions, ou "Conforme" en vert',
        ],
      },
    ],
    tips: [
      'Vérifiez la conformité après chaque génération IA ou semaine publiée',
      'Filtrez par "Critique" pour traiter les infractions les plus graves en premier',
      'Le travail du dimanche est en mode "info" — à vérifier selon votre convention',
    ],
  },
  {
    id: 'analytics',
    icon: BarChart3,
    color: '#2D3A8C',
    colorLight: '#EEF0FA',
    title: 'Analytiques RH',
    description: 'Pilotez vos coûts salariaux, la présence et l\'absentéisme sur la durée.',
    href: '/manager/analytics',
    hrefLabel: 'Voir les analytiques',
    blocks: [
      {
        title: 'Les 6 KPIs principaux',
        items: [
          'Masse salariale = heures × taux horaire sur la période',
          'Heures réelles = heures effectivement pointées (vs planifiées)',
          'Taux de présence = % de shifts avec un pointage',
          'Jours d\'absence = total congés approuvés sur la période',
          'Turnover = nombre de départs (archivages)',
          'Employés à risque = détection automatique des patterns anormaux',
        ],
      },
      {
        title: 'Absentéisme chronique',
        items: [
          '"Maladie fréq." = ≥ 3 arrêts maladie sur la période',
          '"Retards chron." = ≥ 5 retards non justifiés',
          '"Abs. élevée" = taux d\'absence ≥ 20%',
          'Ces employés sont remontés en tête du tableau et signalés par badges',
        ],
      },
      {
        title: 'Objectif CA',
        items: [
          'Cliquez sur "Définir objectif CA" dans le graphique masse salariale',
          'Une ligne de référence à 33% de votre CA apparaît',
          'Le ratio masse salariale / CA s\'affiche sur la carte KPI',
          'La valeur est sauvegardée localement dans votre navigateur',
        ],
      },
    ],
    tips: [
      'Commencez par "12 mois" pour identifier les tendances long terme',
      'La vue "4 semaines" est idéale pour le suivi opérationnel quotidien',
    ],
  },
  {
    id: 'rapport',
    icon: TrendingUp,
    color: '#9333EA',
    colorLight: '#F3E8FF',
    title: 'Rapport & Productivité',
    description: 'Heures, retards, paie — et pilotage de votre rentabilité (Pro).',
    href: '/manager/rapport',
    hrefLabel: 'Ouvrir le rapport',
    blocks: [
      {
        title: 'Trois rapports',
        items: [
          'Onglet "Heures" : heures planifiées vs réelles, écart au contrat, coût estimé',
          'Onglet "Retards" : tous les retards pointés, à marquer justifiés ou non',
          'Onglet "Paie" : variables de paie, export CSV (PayFit, Silae, ADP) + PDF',
          'Filtrez par Jour / Semaine / Mois, par poste ou par employé',
        ],
      },
      {
        title: 'Pilotage de la productivité (Pro)',
        items: [
          'Cliquez "Saisir le CA" pour entrer votre chiffre d\'affaires jour par jour',
          'La carte affiche le ratio coût main d\'œuvre / CA (cible ~30 %)',
          'Plus le taux d\'absentéisme et le turnover sur la période',
          'Fonctionnalité réservée aux plans Pro et Multi-site',
        ],
      },
      {
        title: 'Exports',
        items: [
          'Onglet Heures : export PDF du rapport complet',
          'Onglet Paie : export CSV au format de votre logiciel de paie + PDF récapitulatif',
        ],
      },
    ],
    tips: [
      'Saisissez le CA chaque semaine : ça affine la prévision du copilote IA',
      'Coût/CA ≤ 30 % = sain · 30–35 % à surveiller · > 35 % élevé',
    ],
  },
  {
    id: 'integrations',
    icon: Webhook,
    color: '#6B7280',
    colorLight: '#F3F4F6',
    title: 'Intégrations & API',
    description: 'Connectez Quartzbase à vos outils externes via webhooks ou l\'API REST.',
    href: '/manager/settings/integrations',
    hrefLabel: 'Gérer les intégrations',
    blocks: [
      {
        title: 'Webhooks sortants',
        items: [
          'Paramètres → Intégrations → Webhooks',
          'Renseignez l\'URL de votre endpoint (Zapier, Make, votre serveur…)',
          '7 événements disponibles : shift créé/supprimé, échange approuvé, congé approuvé/refusé…',
          'Chaque appel est signé avec un secret HMAC-SHA256',
        ],
      },
      {
        title: 'API REST publique',
        items: [
          'Générez un token Bearer depuis Paramètres → Intégrations → API',
          '3 endpoints : GET /api/v1/shifts, /employees, /leaves',
          'Toutes les données sont filtrées par établissement automatiquement',
          'Le token ne s\'affiche qu\'une fois à la création — conservez-le',
        ],
      },
      {
        title: 'Logs de livraison',
        items: [
          'Chaque webhook est journalisé avec statut HTTP et durée',
          'Les échecs sont visibles pour debug',
          'Les logs sont conservés 30 jours',
        ],
      },
    ],
    tips: [
      'Utilisez Make (ex-Integromat) ou Zapier pour connecter Quartzbase à votre SIRH',
      'L\'API v1 est idéale pour alimenter un tableau de bord BI externe',
    ],
  },
  {
    id: 'multi-site',
    icon: Building2,
    color: '#D97706',
    colorLight: '#FEF3C7',
    title: 'Multi-établissements',
    description: 'Gérez plusieurs sites depuis un seul compte manager.',
    href: '/manager/settings/establishments',
    hrefLabel: 'Gérer les établissements',
    blocks: [
      {
        title: 'Créer un établissement',
        items: [
          'Paramètres → Établissements → "Nouvel établissement"',
          'Chaque site a ses propres employés, shifts et paramètres',
          'Les données sont strictement isolées entre sites',
        ],
      },
      {
        title: 'Changer d\'établissement actif',
        items: [
          'Cliquez sur le nom de l\'établissement en haut à droite',
          'Sélectionnez le site dans le menu déroulant',
          'Toute la navigation (planning, congés, analytiques…) bascule sur ce site',
        ],
      },
      {
        title: 'Inviter un manager ou superviseur',
        items: [
          'Paramètres → Établissements → ouvrez un site → "Inviter"',
          'Renseignez l\'email et le rôle (Manager ou Superviseur)',
          'Le superviseur voit tout mais ne peut pas modifier les paramètres',
        ],
      },
    ],
    tips: [
      'Les analytiques sont par établissement — agrégez manuellement pour la vue groupe',
      'Un même utilisateur peut être manager sur plusieurs établissements',
    ],
  },
  {
    id: 'billing',
    icon: CreditCard,
    color: '#0EA5E9',
    colorLight: '#E0F2FE',
    title: 'Abonnement & fonctionnalités premium',
    description: 'Comprenez les plans et ce que débloquent Pro et Multi-site.',
    href: '/manager/settings/billing',
    hrefLabel: 'Voir les plans',
    blocks: [
      {
        title: 'Les 3 plans',
        items: [
          'Essentiel : jusqu\'à 10 employés, planning + IA (3/mois), présences, congés, conformité, dossier RH',
          'Pro : jusqu\'à 25 employés, IA illimitée, pilotage productivité, copilote IA coût/CA',
          'Multi-site : employés illimités, plusieurs établissements, support dédié',
        ],
      },
      {
        title: 'Fonctionnalités premium (Pro & Multi-site)',
        items: [
          'Pilotage de la productivité : CA, coût/CA, masse salariale',
          'Taux d\'absentéisme & turnover',
          'Copilote IA : planning optimisé coût/CA',
          'Génération de documents de conformité (avertissements, avenants…)',
          'Assistant IA illimité',
        ],
      },
      {
        title: 'Gérer son abonnement',
        items: [
          'Paramètres → Abonnement pour choisir ou changer de plan',
          'Facturation mensuelle ou annuelle (2 mois offerts à l\'année)',
          'Gestion et annulation en 1 clic depuis le portail de facturation',
        ],
      },
    ],
    tips: [
      'Les fonctions premium affichent un badge "Pro" et un bouton "Passer en Pro"',
      '30 jours d\'essai gratuits, sans carte bleue',
    ],
  },
]

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ section }: { section: HelpSection }) {
  const [open, setOpen] = useState(false)
  const Icon = section.icon

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-[var(--bg-page)] transition-colors"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: section.colorLight }}
        >
          <Icon className="h-5 w-5" style={{ color: section.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[var(--text-primary)]">{section.title}</p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{section.description}</p>
        </div>
        <div className="flex-shrink-0 mt-1">
          {open
            ? <ChevronUp   className="h-4 w-4 text-[var(--text-tertiary)]" />
            : <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
          }
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-[var(--border)] px-5 py-5 space-y-5">
          {/* Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.blocks.map((block, i) => (
              <div key={i} className="bg-[var(--bg-page)] rounded-xl p-4">
                <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.06em] mb-2.5">
                  {block.title}
                </p>
                <ol className="space-y-1.5">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span
                        className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white mt-0.5"
                        style={{ background: section.color }}
                      >
                        {j + 1}
                      </span>
                      <p className="text-[12px] text-[var(--text-secondary)] leading-snug">{item}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          {/* Tips */}
          {section.tips && section.tips.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ background: section.colorLight }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-2.5" style={{ color: section.color }}>
                💡 Conseils
              </p>
              <ul className="space-y-1.5">
                {section.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: section.color }} />
                    <p className="text-[12px] leading-snug" style={{ color: section.color, opacity: 0.85 }}>{tip}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Link */}
          {section.href && (
            <Link
              href={section.href}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: section.color }}
            >
              {section.hrefLabel} <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? SECTIONS.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.blocks.some(b =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          b.items.some(i => i.toLowerCase().includes(search.toLowerCase()))
        )
      )
    : SECTIONS

  return (
    <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-[20px] font-medium text-[var(--text-primary)] tracking-[-0.02em]">
              Centre d&apos;aide
            </h1>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Guides et tutoriels pour maîtriser Quartzbase.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans l'aide…"
            className="w-full h-10 pl-4 pr-4 text-[13px] border border-[var(--border)] rounded-xl bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </div>

      {/* Quick links */}
      {!search && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Planning',     href: '/manager/planning',    color: '#2563EB', bg: '#EFF6FF',  Icon: Calendar },
            { label: 'Conformité',   href: '/manager/compliance',  color: '#7C3AED', bg: '#EDE9FE',  Icon: Scale },
            { label: 'Analytiques',  href: '/manager/analytics',   color: '#2D3A8C', bg: '#EEF0FA',  Icon: BarChart3 },
            { label: 'Marketplace',  href: '/manager/marketplace', color: '#DC2626', bg: '#FEF2F2',  Icon: Zap },
          ].map(q => (
            <Link
              key={q.href}
              href={q.href}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-current transition-all duration-150 group"
              style={{ color: q.color }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: q.bg }}>
                <q.Icon className="h-3.5 w-3.5" style={{ color: q.color }} />
              </div>
              <span className="text-[13px] font-medium text-[var(--text-primary)] group-hover:text-current transition-colors">
                {q.label}
              </span>
              <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-tertiary)] text-[13px]">
            Aucun résultat pour « {search} »
          </div>
        ) : (
          filtered.map(section => (
            <SectionCard key={section.id} section={section} />
          ))
        )}
      </div>

      {/* FAQ Quartzbase */}
      <div className="mt-8">
        <h2 className="text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.01em] mb-4">
          Questions fréquentes
        </h2>
        <FAQ accentColor="var(--accent)" />
      </div>

      {/* Footer */}
      <div className="mt-8 px-5 py-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-[var(--accent)] flex-shrink-0" />
        <div>
          <p className="text-[13px] font-medium text-[var(--text-primary)]">Besoin d&apos;aide supplémentaire ?</p>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Utilisez l&apos;assistant IA (bulle en bas à droite) ou écrivez-nous à{' '}
            <a href="mailto:assistance.quartzbase@mail.fr" className="text-[var(--accent)] underline underline-offset-2">
              assistance.quartzbase@mail.fr
            </a>.
          </p>
        </div>
      </div>
    </div>
  )
}
