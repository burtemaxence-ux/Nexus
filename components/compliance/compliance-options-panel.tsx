'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  X, FileText, Calendar, Mail, Users, AlertTriangle,
  Loader2, Download, Save, Copy, ExternalLink, Check, ChevronRight, Star,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ComplianceAlert } from '@/types'
import type { DocumentType } from '@/app/api/compliance/generate-document/route'

// ── Types ───────────────────────────────────────────────────────────────────────

type ComplianceAlertWithProfile = ComplianceAlert & {
  profiles?: { id: string; full_name: string | null; position: string | null } | null
}

interface WeekShift {
  id: string
  date: string
  start_time: string
  end_time: string
}

// ── Constants ────────────────────────────────────────────────────────────────────

const LEVEL_STYLES = {
  CRITICAL: { border: 'var(--color-critical-text)', bg: 'var(--color-critical-bg)', badge: 'var(--color-critical-bg)', badgeText: 'var(--color-critical-text)', label: 'CRITIQUE' },
  WARNING:  { border: 'var(--color-warning-text)',  bg: 'var(--color-warning-bg)',  badge: 'var(--color-warning-bg)',  badgeText: 'var(--color-warning-text)',  label: 'AVERTISSEMENT' },
  INFO:     { border: 'var(--color-info-text)',     bg: 'var(--color-info-bg)',     badge: 'var(--color-info-bg)',     badgeText: 'var(--color-info-text)',     label: 'INFO' },
} as const

const LEGAL_LINKS: Record<string, { url: string; label: string }> = {
  hours_exceeded:       { url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006901116', label: 'Art. L3123-10 — Durée contractuelle temps partiel' },
  trial_ending:         { url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006900875', label: 'Art. L1221-19 — Période d\'essai' },
  cdd_ending:           { url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006901188', label: 'Art. L1242-1 — Contrat à durée déterminée' },
  requalification_risk: { url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006900991', label: 'Art. L1245-1 — Requalification en CDI' },
}

const DOCTYPE_LABEL: Record<DocumentType, string> = {
  avenant_heures:          'Avenant — modification durée de travail',
  avenant_cdd:             'Avenant — renouvellement CDD',
  lettre_confirmation_essai: 'Lettre de confirmation de fin d\'essai',
  lettre_rupture_essai:    'Lettre de rupture de période d\'essai',
}

// ── Small utilities ───────────────────────────────────────────────────────────────

function OptionCard({ icon: Icon, title, description, onClick, disabled, accent }: {
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copié !' : 'Copier'}
    </button>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────────

interface Props {
  alert: ComplianceAlertWithProfile
  role: 'manager' | 'supervisor'
  onClose: () => void
  onAlertUpdated: (id: string) => void
}

type ScoredCandidate = {
  employee_id: string
  full_name: string
  position: string | null
  contract_type: string | null
  score_final: number
  weekly_hours_planned: number
  compliance_warning: boolean
  explanation: string
}

type View =
  | 'menu'
  | 'avenant'
  | 'planning'
  | 'email'
  | 'sos'
  | 'sos_results'
  | 'sos_notified'
  | 'trial_choice'
  | 'trial_doc'

export function ComplianceOptionsPanel({ alert, role, onClose, onAlertUpdated }: Props) {
  const router = useRouter()
  const [view, setView] = useState<View>('menu')
  const [generating, setGenerating] = useState(false)
  const [documentText, setDocumentText] = useState('')
  const [documentType, setDocumentType] = useState<DocumentType>('avenant_heures')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [trialChoice, setTrialChoice] = useState<'confirm' | 'rupture' | null>(null)
  const [trialMotif, setTrialMotif] = useState('')
  const [weekShifts, setWeekShifts] = useState<WeekShift[]>([])
  const [weekShiftsLoading, setWeekShiftsLoading] = useState(false)
  const [savingDoc, setSavingDoc] = useState(false)
  const [savedDoc, setSavedDoc] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [sosCandidates, setSosCandidates] = useState<ScoredCandidate[]>([])
  const [sosRequestId, setSosRequestId] = useState<string | null>(null)
  const [sosLoading, setSosLoading] = useState(false)
  const [sosNotifyLoading, setSosNotifyLoading] = useState(false)
  const [sosError, setSosError] = useState<string | null>(null)
  const [sosNotifiedCandidates, setSosNotifiedCandidates] = useState<ScoredCandidate[]>([])
  const [PDFComponents, setPDFComponents] = useState<{
    PDFDownloadLink: typeof import('@react-pdf/renderer').PDFDownloadLink
    AvenantDocument: typeof import('@/components/compliance/avenant-pdf').AvenantDocument
  } | null>(null)
  const [establishmentName, setEstablishmentName] = useState('')

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    createClient()
      .from('settings')
      .select('value')
      .eq('key', 'establishment_name')
      .maybeSingle()
      .then(({ data }) => { if (data?.value) setEstablishmentName(data.value as string) })
  }, [])

  useEffect(() => {
    Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/compliance/avenant-pdf'),
    ]).then(([pdf, avenant]) => {
      setPDFComponents({ PDFDownloadLink: pdf.PDFDownloadLink, AvenantDocument: avenant.AvenantDocument })
    }).catch(() => {})
  }, [])

  const employeeName = alert.profiles?.full_name ?? 'Employé'
  const employeeId = alert.employee_id
  const styles = LEVEL_STYLES[alert.level] ?? LEVEL_STYLES.INFO
  const legal = LEGAL_LINKS[alert.type]

  async function generateDocument(dtype: DocumentType, motif?: string) {
    setGenerating(true)
    setDocumentType(dtype)
    try {
      const res = await fetch('/api/compliance/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alert.id, document_type: dtype, employee_id: employeeId, motif }),
      })
      const data = await res.json()
      if (data.text) {
        setDocumentText(data.text)
        setView('avenant')
        onAlertUpdated(alert.id)
      }
    } finally {
      setGenerating(false)
    }
  }

  async function generateEmail() {
    setGenerating(true)
    try {
      const res = await fetch('/api/compliance/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alert.id, employee_id: employeeId }),
      })
      const data = await res.json()
      if (data.subject) {
        setEmailSubject(data.subject)
        setEmailBody(data.body)
        setView('email')
      }
    } finally {
      setGenerating(false)
    }
  }

  const loadWeekShifts = useCallback(async () => {
    setWeekShiftsLoading(true)
    try {
      const today = new Date()
      const monday = new Date(today)
      const day = today.getDay() === 0 ? 7 : today.getDay()
      monday.setDate(today.getDate() - day + 1)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const from = monday.toISOString().slice(0, 10)
      const to = sunday.toISOString().slice(0, 10)

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase
        .from('shifts')
        .select('id, date, start_time, end_time')
        .eq('employee_id', employeeId)
        .gte('date', from)
        .lte('date', to)
        .eq('status', 'published')
        .order('date')

      setWeekShifts((data ?? []) as WeekShift[])
    } finally {
      setWeekShiftsLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    if (view === 'sos') loadWeekShifts()
  }, [view, loadWeekShifts])

  async function triggerSOS(shiftId: string) {
    setSosLoading(true)
    setSosError(null)
    setView('sos_results')
    try {
      const res = await fetch('/api/ai/replacement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: shiftId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      setSosCandidates(data.candidates ?? [])
      setSosRequestId(data.replacement_request_id ?? null)
    } catch (e) {
      setSosError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setSosLoading(false)
    }
  }

  async function notifySosCandidates() {
    if (!sosRequestId) return
    setSosNotifyLoading(true)
    setSosError(null)
    try {
      const res = await fetch('/api/replacement/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replacement_request_id: sosRequestId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      setSosNotifiedCandidates(sosCandidates)
      setView('sos_notified')
    } catch (e) {
      setSosError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setSosNotifyLoading(false)
    }
  }

  async function goToPlanning() {
    const opts = alert.options as Record<string, unknown>
    const targetHours = opts?.contract_hours ?? ''
    await fetch('/api/compliance/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: alert.id, status: 'in_progress' }),
    })
    onAlertUpdated(alert.id)
    onClose()
    router.push(`/manager/planning?highlight_employee=${employeeId}&target_hours=${targetHours}`)
  }

  async function saveDocument() {
    if (!PDFComponents || !documentText) return
    setSavingDoc(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const blob = await pdf(
        PDFComponents.AvenantDocument({
          documentText,
          employeeName,
          establishmentName,
          documentType,
          generatedDate: new Date().toLocaleDateString('fr-FR'),
        })
      ).toBlob()

      const formData = new FormData()
      formData.append('file', blob, `${DOCTYPE_LABEL[documentType].replace(/\s+/g, '_')}_${employeeName.replace(/\s+/g, '_')}.pdf`)
      formData.append('document_type', 'contrat')
      formData.append('name', `${DOCTYPE_LABEL[documentType]} — ${employeeName}`)

      await fetch(`/api/employees/${employeeId}/documents`, { method: 'POST', body: formData })
      setSavedDoc(true)
    } finally {
      setSavingDoc(false)
    }
  }

  function openMailto() {
    const subject = encodeURIComponent(emailSubject)
    const body = encodeURIComponent(emailBody)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  async function shareEmail() {
    if (navigator.share) {
      await navigator.share({ title: emailSubject, text: `${emailSubject}\n\n${emailBody}` })
    } else {
      openMailto()
    }
  }

  const panelClass = isMobile
    ? 'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-[var(--bg-card)] flex flex-col max-h-[92vh]'
    : 'fixed top-0 right-0 bottom-0 z-50 w-[480px] bg-[var(--bg-card)] flex flex-col shadow-2xl border-l border-[var(--border)]'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      <div className={panelClass} style={{ borderTop: isMobile ? '0.5px solid var(--border)' : undefined }}>

        {isMobile && (
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
          </div>
        )}

        <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                style={{ backgroundColor: styles.badge, color: styles.badgeText }}>
                {styles.label}
              </span>
              <span className="text-[13px] font-medium text-[var(--text-primary)]">{employeeName}</span>
            </div>
            <p className="text-[12px] text-[var(--text-tertiary)]">{alert.title}</p>
          </div>
          <button
            onClick={() => {
              if (view === 'menu') onClose()
              else if (view === 'sos_results') setView('sos')
              else if (view === 'sos_notified') onClose()
              else setView('menu')
            }}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-[var(--accent-light)] transition-colors"
          >
            {view === 'menu'
              ? <X className="h-4 w-4 text-[var(--text-tertiary)]" />
              : <span className="text-[12px] text-[var(--text-secondary)]">← Retour</span>
            }
          </button>
        </div>

        {view === 'menu' && (
          <div className="px-5 py-3 border-b border-[var(--border)] flex-shrink-0"
            style={{ backgroundColor: styles.bg }}>
            <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{alert.message}</p>
            {legal && (
              <a
                href={legal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-[11px] text-[var(--accent)] underline"
              >
                <ExternalLink className="h-3 w-3" />
                Legifrance — {legal.label}
              </a>
            )}
            <p className="mt-2 text-[11px] text-[var(--text-tertiary)] italic">
              💡 À valider avec votre expert-comptable ou avocat RH
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">

          {view === 'menu' && (
            <div className="p-5 space-y-3">

              {role === 'manager' && (alert.type === 'hours_exceeded' || alert.type === 'requalification_risk') && (
                <OptionCard
                  icon={FileText}
                  title="Créer un avenant de contrat"
                  description="Générer un avenant pour régulariser les heures de travail"
                  accent="#2563EB"
                  onClick={() => generateDocument('avenant_heures')}
                />
              )}
              {role === 'manager' && alert.type === 'cdd_ending' && (
                <OptionCard
                  icon={FileText}
                  title="Créer un avenant de renouvellement"
                  description="Générer un avenant de renouvellement ou de transformation en CDI"
                  accent="#2563EB"
                  onClick={() => generateDocument('avenant_cdd')}
                />
              )}

              {(alert.type === 'hours_exceeded' || alert.type === 'requalification_risk') && (
                <OptionCard
                  icon={Calendar}
                  title="Réduire les heures planifiées"
                  description="Ouvrir le planning de la semaine prochaine avec un objectif d'heures"
                  accent="#16A34A"
                  onClick={goToPlanning}
                />
              )}

              <OptionCard
                icon={Mail}
                title="Envoyer un résumé à mon expert-comptable"
                description="Générer un email professionnel factuel à partager avec votre conseil"
                accent="#7C3AED"
                onClick={generateEmail}
              />

              {(alert.type === 'hours_exceeded' || alert.type === 'requalification_risk') && (
                <OptionCard
                  icon={Users}
                  title="Retirer un shift et chercher un remplaçant"
                  description="Sélectionner un shift cette semaine et déclencher le flow SOS Remplacement"
                  accent="#D97706"
                  onClick={() => setView('sos')}
                />
              )}

              {role === 'manager' && alert.type === 'trial_ending' && (
                <OptionCard
                  icon={AlertTriangle}
                  title="Générer la lettre de période d'essai"
                  description="Confirmer l'embauche ou rompre la période d'essai — génération du courrier"
                  accent="#DC2626"
                  onClick={() => setView('trial_choice')}
                />
              )}
            </div>
          )}

          {view === 'avenant' && (
            <div className="p-5 space-y-4">
              {generating ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
                  <p className="text-[13px] text-[var(--text-secondary)]">Génération en cours avec Claude…</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                      {DOCTYPE_LABEL[documentType]}
                    </p>
                    <textarea
                      value={documentText}
                      onChange={e => setDocumentText(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] text-[12px] text-[var(--text-primary)] font-mono p-3 leading-relaxed resize-y min-h-[280px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
                      spellCheck={false}
                    />
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-1 italic">
                      Modifiez les champs entre [crochets] avant de télécharger.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {PDFComponents ? (
                      <PDFComponents.PDFDownloadLink
                        document={
                          <PDFComponents.AvenantDocument
                            documentText={documentText}
                            employeeName={employeeName}
                            establishmentName={establishmentName}
                            documentType={documentType}
                            generatedDate={new Date().toLocaleDateString('fr-FR')}
                          />
                        }
                        fileName={`${DOCTYPE_LABEL[documentType].replace(/\s+/g, '_')}_${employeeName.replace(/\s+/g, '_')}.pdf`}
                      >
                        {({ loading }: { loading: boolean }) => (
                          <button
                            disabled={loading}
                            className="flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-medium text-white transition-colors disabled:opacity-60"
                            style={{ backgroundColor: '#2563EB' }}
                          >
                            <Download className="h-4 w-4" />
                            {loading ? 'Préparation PDF…' : 'Télécharger en PDF'}
                          </button>
                        )}
                      </PDFComponents.PDFDownloadLink>
                    ) : (
                      <button disabled className="flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-medium text-white opacity-60" style={{ backgroundColor: '#2563EB' }}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement PDF…
                      </button>
                    )}

                    <button
                      onClick={saveDocument}
                      disabled={savingDoc || savedDoc}
                      className="flex items-center justify-center gap-2 h-10 rounded-xl border border-[var(--border)] text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-light)] disabled:opacity-60"
                    >
                      {savingDoc
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : savedDoc
                        ? <Check className="h-4 w-4 text-green-600" />
                        : <Save className="h-4 w-4" />}
                      {savingDoc ? 'Enregistrement…' : savedDoc ? `Enregistré dans les documents de ${employeeName.split(' ')[0]}` : `Enregistrer dans les documents de ${employeeName.split(' ')[0]}`}
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--text-tertiary)] italic text-center">
                    💡 Ce document est généré à titre indicatif. Validez avec votre expert-comptable ou avocat RH.
                  </p>
                </>
              )}
            </div>
          )}

          {view === 'email' && (
            <div className="p-5 space-y-4">
              {generating ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
                  <p className="text-[13px] text-[var(--text-secondary)]">Génération de l&apos;email en cours…</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Objet</label>
                      <input
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[13px] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Corps</label>
                      <textarea
                        value={emailBody}
                        onChange={e => setEmailBody(e.target.value)}
                        rows={10}
                        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[13px] text-[var(--text-primary)] px-3 py-2 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <CopyButton text={`${emailSubject}\n\n${emailBody}`} />
                    <button
                      onClick={openMailto}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ouvrir dans ma messagerie
                    </button>
                    {'share' in navigator && (
                      <button
                        onClick={shareEmail}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Partager
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {view === 'sos' && (
            <div className="p-5 space-y-3">
              <p className="text-[13px] text-[var(--text-secondary)]">
                Sélectionnez le shift de <strong>{employeeName.split(' ')[0]}</strong> à retirer cette semaine.
                Le flow SOS Remplacement s&apos;ouvrira automatiquement.
              </p>
              {weekShiftsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
                </div>
              ) : weekShifts.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[var(--text-tertiary)]">
                  Aucun shift publié cette semaine pour {employeeName.split(' ')[0]}.
                </div>
              ) : (
                <div className="space-y-2">
                  {weekShifts.map(shift => (
                    <button
                      key={shift.id}
                      onClick={() => triggerSOS(shift.id)}
                      className="w-full text-left p-3.5 rounded-xl border border-[var(--border)] hover:bg-[var(--color-critical-bg)] hover:border-[var(--color-critical-text)] transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-medium text-[var(--text-primary)] capitalize">
                            {new Date(shift.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                            {shift.start_time.slice(0, 5)} → {shift.end_time.slice(0, 5)}
                          </p>
                        </div>
                        <span className="text-[12px] text-[var(--color-critical-text)] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                          Déclencher SOS →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'sos_results' && (
            <div className="p-5 space-y-3 pb-4">
              {sosLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
                  <p className="text-[13px] text-[var(--text-secondary)]">Recherche des candidats disponibles…</p>
                </div>
              ) : sosError ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <p className="text-[13px] text-[var(--color-critical-text)] text-center">{sosError}</p>
                  <button
                    onClick={() => setView('sos')}
                    className="px-4 py-2 rounded-lg border border-[var(--border)] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-colors"
                  >
                    ← Réessayer
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-[var(--text-secondary)] pb-1">
                    {sosCandidates.length === 0
                      ? 'Aucun candidat disponible pour ce shift.'
                      : `${sosCandidates.length} candidat${sosCandidates.length > 1 ? 's' : ''} disponible${sosCandidates.length > 1 ? 's' : ''} trouvé${sosCandidates.length > 1 ? 's' : ''}`}
                  </p>
                  <div className="space-y-3">
                    {sosCandidates.map((c, i) => {
                      const initials = c.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      const avatarColors = ['#4F46E5', '#059669', '#DC2626']
                      const avatarBg = avatarColors[i] ?? '#6B7280'
                      const filled = c.score_final >= 7 ? 3 : c.score_final >= 4 ? 2 : 1
                      return (
                        <div
                          key={c.employee_id}
                          style={{
                            backgroundColor: 'var(--bg-page)',
                            border: i === 0 ? '1px solid var(--accent)' : '0.5px solid var(--border)',
                            borderRadius: '12px',
                            padding: '14px',
                            position: 'relative',
                          }}
                        >
                          {i === 0 && (
                            <div style={{
                              position: 'absolute', top: '-1px', right: '12px',
                              backgroundColor: 'var(--accent)', color: '#fff',
                              fontSize: '9px', fontWeight: 700,
                              padding: '2px 8px', borderRadius: '0 0 6px 6px',
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                              Recommandé
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <div style={{
                              width: '38px', height: '38px', borderRadius: '50%',
                              backgroundColor: avatarBg, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{initials}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{c.full_name}</p>
                              {c.position && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' }}>{c.position}</p>}
                            </div>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {[1, 2, 3].map(j => (
                                <Star key={j} size={13} style={{ color: j <= filled ? '#F59E0B' : 'var(--border)', fill: j <= filled ? '#F59E0B' : 'transparent' }} />
                              ))}
                            </div>
                          </div>
                          {c.explanation && (
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '8px', lineHeight: 1.4 }}>
                              {c.explanation}
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {c.compliance_warning && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning-text)', fontSize: '11px', fontWeight: 500, padding: '2px 7px', borderRadius: '6px', border: '0.5px solid var(--color-warning-border)' }}>
                                <AlertTriangle size={10} />
                                {c.weekly_hours_planned > 0 ? `${c.weekly_hours_planned}h cette sem.` : 'Alerte compliance'}
                              </span>
                            )}
                            {c.contract_type === 'Extra' && (
                              <span style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 500, padding: '2px 7px', borderRadius: '6px', border: '0.5px solid var(--border)' }}>
                                Extra
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {sosError && <p className="text-[12px] text-[var(--color-critical-text)] text-center">{sosError}</p>}
                  <div className="pt-2 flex flex-col gap-2 sticky bottom-0 bg-[var(--bg-card)] pb-2">
                    <button
                      onClick={notifySosCandidates}
                      disabled={sosNotifyLoading || sosCandidates.length === 0}
                      className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-[13px] font-medium text-white transition-colors disabled:opacity-60"
                      style={{ backgroundColor: '#16A34A' }}
                    >
                      {sosNotifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {sosNotifyLoading ? 'Envoi…' : `📲 Notifier les ${sosCandidates.length} candidats`}
                    </button>
                    <button
                      onClick={() => window.open('/manager/planning', '_blank')}
                      className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-[var(--border)] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Voir le planning
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {view === 'sos_notified' && (
            <div className="p-5 space-y-4">
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-[15px] font-semibold text-[var(--text-primary)]">Les candidats ont été notifiés ✓</p>
              </div>
              <div className="space-y-2">
                {sosNotifiedCandidates.map(c => (
                  <div key={c.employee_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-page)] border border-[var(--border)]">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-[13px] text-[var(--text-primary)]">{c.full_name}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => router.push('/manager/planning')}
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-[13px] font-medium text-white"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Voir le planning
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center w-full h-10 rounded-xl border border-[var(--border)] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}

          {view === 'trial_choice' && (
            <div className="p-5 space-y-4">
              <p className="text-[13px] text-[var(--text-secondary)]">
                Quelle décision prenez-vous concernant la période d&apos;essai de <strong>{employeeName.split(' ')[0]}</strong> ?
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => { setTrialChoice('confirm'); generateDocument('lettre_confirmation_essai') }}
                  className="w-full p-4 rounded-xl border-2 border-green-500 bg-green-50 text-left hover:bg-green-100 transition-colors"
                >
                  <p className="text-[13px] font-medium text-green-800">Confirmer l&apos;embauche</p>
                  <p className="text-[12px] text-green-600 mt-0.5">Générer une lettre de confirmation de fin de période d&apos;essai</p>
                </button>
                <button
                  onClick={() => setTrialChoice('rupture')}
                  className="w-full p-4 rounded-xl text-left transition-colors"
                  style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--color-critical-text)', backgroundColor: 'var(--color-critical-bg)' }}
                >
                  <p className="text-[13px] font-medium" style={{ color: 'var(--color-critical-text)' }}>Rompre la période d&apos;essai</p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-critical-text)', opacity: 0.7 }}>Générer une lettre de rupture avec motif</p>
                </button>
              </div>

              {trialChoice === 'rupture' && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                    Motif de rupture (facultatif mais recommandé pour le dossier interne)
                  </label>
                  <textarea
                    value={trialMotif}
                    onChange={e => setTrialMotif(e.target.value)}
                    placeholder="Ex : Insuffisance de résultats, difficultés d'adaptation au poste…"
                    rows={3}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[13px] text-[var(--text-primary)] px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
                  />
                  <button
                    onClick={() => generateDocument('lettre_rupture_essai', trialMotif || undefined)}
                    disabled={generating}
                    className="w-full h-10 rounded-xl text-[13px] font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ backgroundColor: 'var(--color-critical-text)' }}
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Générer la lettre de rupture
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {generating && view === 'menu' && (
          <div className="absolute inset-0 bg-[var(--bg-card)]/80 flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--accent)]" />
            <p className="text-[13px] text-[var(--text-secondary)]">Génération en cours…</p>
          </div>
        )}
      </div>
    </>
  )
}
