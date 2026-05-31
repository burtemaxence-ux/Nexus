'use client'

import { Loader2, Download, Save, Check } from 'lucide-react'
import type { DocumentType } from '@/app/api/compliance/generate-document/route'

const DOCTYPE_LABEL: Record<DocumentType, string> = {
  avenant_heures:            'Avenant — modification durée de travail',
  avenant_cdd:               'Avenant — renouvellement CDD',
  lettre_confirmation_essai: 'Lettre de confirmation de fin d\'essai',
  lettre_rupture_essai:      'Lettre de rupture de période d\'essai',
}

interface AvenantProps {
  generating: boolean
  documentText: string
  documentType: DocumentType
  employeeName: string
  establishmentName: string
  savingDoc: boolean
  savedDoc: boolean
  PDFComponents: {
    PDFDownloadLink: typeof import('@react-pdf/renderer').PDFDownloadLink
    AvenantDocument: typeof import('@/components/compliance/avenant-pdf').AvenantDocument
  } | null
  onChangeText: (text: string) => void
  onSave: () => void
}

export function ComplianceAvenantView({ generating, documentText, documentType, employeeName, establishmentName, savingDoc, savedDoc, PDFComponents, onChangeText, onSave }: AvenantProps) {
  if (generating) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      <p className="text-[13px] text-[var(--text-secondary)]">Génération en cours avec Claude…</p>
    </div>
  )

  const fileName = `${DOCTYPE_LABEL[documentType].replace(/\s+/g, '_')}_${employeeName.replace(/\s+/g, '_')}.pdf`

  return (
    <div className="p-5 space-y-4">
      <div>
        <p className="text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
          {DOCTYPE_LABEL[documentType]}
        </p>
        <textarea
          value={documentText}
          onChange={e => onChangeText(e.target.value)}
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
            fileName={fileName}
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
          onClick={onSave}
          disabled={savingDoc || savedDoc}
          className="flex items-center justify-center gap-2 h-10 rounded-xl border border-[var(--border)] text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-light)] disabled:opacity-60"
        >
          {savingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : savedDoc ? <Check className="h-4 w-4 text-green-600" /> : <Save className="h-4 w-4" />}
          {savingDoc ? 'Enregistrement…' : savedDoc ? `Enregistré dans les documents de ${employeeName.split(' ')[0]}` : `Enregistrer dans les documents de ${employeeName.split(' ')[0]}`}
        </button>
      </div>

      <p className="text-[11px] text-[var(--text-tertiary)] italic text-center">
        💡 Ce document est généré à titre indicatif. Validez avec votre expert-comptable ou avocat RH.
      </p>
    </div>
  )
}

interface TrialChoiceProps {
  employeeName: string
  trialChoice: 'confirm' | 'rupture' | null
  trialMotif: string
  generating: boolean
  onConfirm: () => void
  onSelectRupture: () => void
  onChangeMotif: (motif: string) => void
  onGenerateRupture: () => void
}

export function ComplianceTrialChoiceView({ employeeName, trialChoice, trialMotif, generating, onConfirm, onSelectRupture, onChangeMotif, onGenerateRupture }: TrialChoiceProps) {
  return (
    <div className="p-5 space-y-4">
      <p className="text-[13px] text-[var(--text-secondary)]">
        Quelle décision prenez-vous concernant la période d&apos;essai de <strong>{employeeName.split(' ')[0]}</strong> ?
      </p>
      <div className="space-y-2">
        <button
          onClick={onConfirm}
          className="w-full p-4 rounded-xl border-2 border-green-500 bg-green-50 text-left hover:bg-green-100 transition-colors"
        >
          <p className="text-[13px] font-medium text-green-800">Confirmer l&apos;embauche</p>
          <p className="text-[12px] text-green-600 mt-0.5">Générer une lettre de confirmation de fin de période d&apos;essai</p>
        </button>
        <button
          onClick={onSelectRupture}
          className="w-full p-4 rounded-xl border-2 border-[#DC2626] bg-[#FEF2F2] text-left hover:bg-[#FEE2E2] transition-colors"
        >
          <p className="text-[13px] font-medium text-[#DC2626]">Rompre la période d&apos;essai</p>
          <p className="text-[12px] text-[#DC2626]/70 mt-0.5">Générer une lettre de rupture avec motif</p>
        </button>
      </div>

      {trialChoice === 'rupture' && (
        <div className="space-y-3 pt-2 border-t border-[var(--border)]">
          <label className="text-[12px] font-medium text-[var(--text-secondary)]">
            Motif de rupture (facultatif mais recommandé pour le dossier interne)
          </label>
          <textarea
            value={trialMotif}
            onChange={e => onChangeMotif(e.target.value)}
            placeholder="Ex : Insuffisance de résultats, difficultés d'adaptation au poste…"
            rows={3}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[13px] text-[var(--text-primary)] px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
          />
          <button
            onClick={onGenerateRupture}
            disabled={generating}
            className="w-full h-10 rounded-xl text-[13px] font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: '#DC2626' }}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Générer la lettre de rupture
          </button>
        </div>
      )}
    </div>
  )
}
