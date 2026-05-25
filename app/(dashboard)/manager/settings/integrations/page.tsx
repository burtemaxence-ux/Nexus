import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plug, Lock } from 'lucide-react'

// ── Integration definitions ───────────────────────────────────────────────────

type Integration = {
  id: string
  name: string
  description: string
  category: string
  bg: string
  logo: React.ReactNode
}

function GoogleCalendarLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <rect width="24" height="24" rx="3" fill="#fff" />
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#fff" stroke="#DADCE0" strokeWidth="1.5" />
      <rect x="3" y="3" width="18" height="5" rx="2" fill="#4285F4" />
      <text x="12" y="18" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1A73E8">31</text>
    </svg>
  )
}

function OutlookLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <rect width="24" height="24" rx="3" fill="#0078D4" />
      <rect x="12" y="6" width="9" height="12" rx="1" fill="#50B0F0" />
      <rect x="3" y="8" width="11" height="10" rx="1.5" fill="#fff" />
      <text x="8.5" y="16" textAnchor="middle" fontSize="6" fontWeight="700" fill="#0078D4">O</text>
    </svg>
  )
}

function SlackLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <rect width="24" height="24" rx="3" fill="#4A154B" />
      <circle cx="8.5" cy="8.5" r="1.8" fill="#E01E5A" />
      <circle cx="15.5" cy="8.5" r="1.8" fill="#36C5F0" />
      <circle cx="8.5" cy="15.5" r="1.8" fill="#2EB67D" />
      <circle cx="15.5" cy="15.5" r="1.8" fill="#ECB22E" />
    </svg>
  )
}

function WhatsAppLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <rect width="24" height="24" rx="3" fill="#25D366" />
      <path
        d="M12 4C7.58 4 4 7.58 4 12c0 1.49.41 2.88 1.12 4.07L4 20l4.07-1.1A7.95 7.95 0 0012 20c4.42 0 8-3.58 8-8s-3.58-8-8-8z"
        fill="#fff"
      />
      <path
        d="M16.2 14.5c-.2-.1-1.2-.6-1.4-.67-.2-.07-.34-.1-.48.1-.14.2-.54.67-.66.8-.12.14-.24.15-.44.05-.2-.1-.86-.32-1.63-1.01-.6-.54-1-1.2-1.12-1.4-.12-.2-.01-.3.09-.4l.3-.35c.1-.12.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.48-1.16-.66-1.59-.17-.42-.35-.36-.48-.37H9.7c-.14 0-.36.05-.55.25-.19.2-.72.7-.72 1.71s.74 1.99.84 2.12c.1.14 1.45 2.22 3.52 3.11.49.21.87.34 1.17.43.49.16.94.13 1.29.08.39-.06 1.2-.49 1.37-.96.17-.47.17-.88.12-.97-.05-.09-.19-.14-.4-.24z"
        fill="#25D366"
      />
    </svg>
  )
}

function PayFitLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <rect width="24" height="24" rx="3" fill="#5046E4" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">P</text>
    </svg>
  )
}

function SageLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <rect width="24" height="24" rx="3" fill="#00B050" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">S</text>
    </svg>
  )
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Synchronisez automatiquement les plannings publiés avec les agendas Google des employés.',
    category: 'Calendrier',
    bg: 'bg-blue-50',
    logo: <GoogleCalendarLogo />,
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    description: 'Envoyez les shifts directement dans les boîtes Outlook de votre équipe.',
    category: 'Calendrier',
    bg: 'bg-sky-50',
    logo: <OutlookLogo />,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Recevez les alertes RH et les publications de planning dans vos canaux Slack.',
    category: 'Messagerie',
    bg: 'bg-purple-50',
    logo: <SlackLogo />,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Notifiez vos employés via WhatsApp pour les rappels de shift et les changements.',
    category: 'Messagerie',
    bg: 'bg-green-50',
    logo: <WhatsAppLogo />,
  },
  {
    id: 'payfit',
    name: 'PayFit',
    description: 'Exportez les heures validées vers PayFit pour automatiser la préparation de la paie.',
    category: 'Paie',
    bg: 'bg-violet-50',
    logo: <PayFitLogo />,
  },
  {
    id: 'sage',
    name: 'Sage Paie',
    description: 'Transmettez les récapitulatifs mensuels directement dans votre logiciel Sage.',
    category: 'Paie',
    bg: 'bg-emerald-50',
    logo: <SageLogo />,
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <div className="max-w-2xl mx-auto px-8 py-10 space-y-6">
      <div>
        <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Intégrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connectez D-pot à vos outils métier pour automatiser votre workflow.
        </p>
      </div>

      {/* ── Coming soon notice ───────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-xl px-4 py-3.5" style={{ border: '0.5px solid var(--accent)', backgroundColor: 'var(--accent-light)' }}>
        <Plug className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
        <div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--accent)' }}>Intégrations — bientôt disponibles</p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Ces connecteurs sont en cours de développement. Ils seront disponibles dans une prochaine mise à jour.
          </p>
        </div>
      </div>

      {/* ── Integration cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map(integration => (
          <Card
            key={integration.id}
            className="relative overflow-hidden border border-border bg-card opacity-80 transition-opacity hover:opacity-100"
          >
            {/* Coming soon badge */}
            <div className="absolute top-3 right-3">
              <span className="dp-badge-warning inline-flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                Bientôt
              </span>
            </div>

            <CardContent className="pt-5 pb-4 px-4">
              {/* Logo + name */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
                  {integration.logo}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{integration.name}</p>
                  <span className="inline-block mt-0.5 text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide">
                    {integration.category}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {integration.description}
              </p>

              {/* Action */}
              <Button
                size="sm"
                variant="outline"
                disabled
                className="w-full text-xs h-8 border-dashed text-muted-foreground cursor-not-allowed"
              >
                Connexion indisponible
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Enterprise note ───────────────────────────────────────────── */}
      <p className="text-center text-xs text-muted-foreground pt-2">
        Les intégrations seront disponibles sur tous les plans.{' '}
        <span className="text-foreground font-medium">Restez connectés pour les nouveautés.</span>
      </p>
    </div>
  )
}
