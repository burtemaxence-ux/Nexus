'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, ExternalLink, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ComplianceAlert } from '@/types'
import type { DocumentType } from '@/app/api/compliance/generate-document/route'
import { ComplianceMenuView } from './compliance-menu'
import { ComplianceAvenantView, ComplianceTrialChoiceView } from './compliance-avenant'
import { ComplianceEmailView } from './compliance-email'
import { ComplianceSosView, ComplianceSosResultsView, ComplianceSosNotifiedView } from './compliance-sos'
import type { ScoredCandidate, WeekShift } from './compliance-sos'

// ── Types ─────────────────────────────────────────────────────────────────────

type ComplianceAlertWithProfile = ComplianceAlert & {
  profiles?: { id: string; full_name: string | null; position: string | null } | null
}

type View = 'menu' | 'avenant' | 'planning' | 'email' | 'sos' | 'sos_results' | 'sos_notified' | 'trial_choice' | 'trial_doc'

const LEVEL_STYLES = {
  CRITICAL: { border: '#DC2626', bg: '#FEF2F2', badge: '#FEE2E2', badgeText: '#DC2626', label: 'CRITIQUE' },
  WARNING:  { border: '#D97706', bg: '#FFFBEB', badge: '#FEF3C7', badgeText: '#D97706', label: 'AVERTISSEMENT' },
  INFO:     { border: '#2D3A8C', bg: '#EEF0FA', badge: '#E0E7FF', badgeText: '#2D3A8C', label: 'INFO' },
} as const

const LEGAL_LINKS: Record<string, { url: string; label: string }> = {
  hours_exceeded:       { url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006901116', label: 'Art. L3123-10 — Durée contractuelle temps partiel' },
  trial_ending:         { url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006900875', label: 'Art. L1221-19 — Période d\'essai' },
  cdd_ending:           { url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006901188', label: 'Art. L1242-1 — Contrat à durée déterminée' },
  requalification_risk: { url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006900991', label: 'Art. L1245-1 — Requalification en CDI' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  alert: ComplianceAlertWithProfile
  role: 'manager' | 'supervisor'
  onClose: () => void
  onAlertUpdated: (id: string) => void
}

// ── Panel ─────────────────────────────────────────────────────────────────────

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
      const DOCTYPE_LABEL: Record<DocumentType, string> = {
        avenant_heures:            'Avenant — modification durée de travail',
        avenant_cdd:               'Avenant — renouvellement CDD',
        lettre_confirmation_essai: 'Lettre de confirmation de fin d\'essai',
        lettre_rupture_essai:      'Lettre de rupture de période d\'essai',
      }
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

  function handleBack() {
    if (view === 'menu') onClose()
    else if (view === 'sos_results') setView('sos')
    else if (view === 'sos_notified') onClose()
    else setView('menu')
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      <div className={panelClass} style={{ borderTop: isMobile ? '0.5px solid var(--border)' : undefined }}>

        {isMobile && (
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
          </div>
        )}

        {/* Header */}
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
          <button onClick={handleBack} className="flex-shrink-0 p-2 rounded-lg hover:bg-[var(--accent-light)] transition-colors">
            {view === 'menu'
              ? <X className="h-4 w-4 text-[var(--text-tertiary)]" />
              : <span className="text-[12px] text-[var(--text-secondary)]">← Retour</span>
            }
          </button>
        </div>

        {/* Legal message — menu only */}
        {view === 'menu' && (
          <div className="px-5 py-3 border-b border-[var(--border)] flex-shrink-0" style={{ backgroundColor: styles.bg }}>
            <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{alert.message}</p>
            {legal && (
              <a href={legal.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-[11px] text-[var(--accent)] underline">
                <ExternalLink className="h-3 w-3" />
                Legifrance — {legal.label}
              </a>
            )}
            <p className="mt-2 text-[11px] text-[var(--text-tertiary)] italic">
              💡 À valider avec votre expert-comptable ou avocat RH
            </p>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {view === 'menu' && (
            <ComplianceMenuView
              alert={alert}
              role={role}
              generating={generating}
              onGenerateDocument={generateDocument}
              onGenerateEmail={generateEmail}
              onGoToPlanning={goToPlanning}
              onSos={() => setView('sos')}
              onTrialChoice={() => setView('trial_choice')}
            />
          )}
          {view === 'avenant' && (
            <ComplianceAvenantView
              generating={generating}
              documentText={documentText}
              documentType={documentType}
              employeeName={employeeName}
              establishmentName={establishmentName}
              savingDoc={savingDoc}
              savedDoc={savedDoc}
              PDFComponents={PDFComponents}
              onChangeText={setDocumentText}
              onSave={saveDocument}
            />
          )}
          {view === 'trial_choice' && (
            <ComplianceTrialChoiceView
              employeeName={employeeName}
              trialChoice={trialChoice}
              trialMotif={trialMotif}
              generating={generating}
              onConfirm={() => { setTrialChoice('confirm'); generateDocument('lettre_confirmation_essai') }}
              onSelectRupture={() => setTrialChoice('rupture')}
              onChangeMotif={setTrialMotif}
              onGenerateRupture={() => generateDocument('lettre_rupture_essai', trialMotif || undefined)}
            />
          )}
          {view === 'email' && (
            <ComplianceEmailView
              generating={generating}
              emailSubject={emailSubject}
              emailBody={emailBody}
              onChangeSubject={setEmailSubject}
              onChangeBody={setEmailBody}
              onOpenMailto={openMailto}
              onShare={shareEmail}
            />
          )}
          {view === 'sos' && (
            <ComplianceSosView
              employeeName={employeeName}
              weekShifts={weekShifts}
              weekShiftsLoading={weekShiftsLoading}
              onTrigger={triggerSOS}
            />
          )}
          {view === 'sos_results' && (
            <ComplianceSosResultsView
              sosLoading={sosLoading}
              sosError={sosError}
              sosCandidates={sosCandidates}
              sosNotifyLoading={sosNotifyLoading}
              onNotify={notifySosCandidates}
              onRetry={() => setView('sos')}
            />
          )}
          {view === 'sos_notified' && (
            <ComplianceSosNotifiedView
              sosNotifiedCandidates={sosNotifiedCandidates}
              onGoToPlanning={() => router.push('/manager/planning')}
              onClose={onClose}
            />
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
