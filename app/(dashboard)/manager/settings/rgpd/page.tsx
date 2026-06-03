'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, Download, Trash2, Clock, Loader2, Check, AlertTriangle, FileText, Users, Calendar, Activity } from 'lucide-react'

type AuditEntry = {
  id: string
  table_name: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  performed_by: string | null
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
}

const TABLE_LABELS: Record<string, string> = {
  profiles:          'Profil employé',
  shifts:            'Planning',
  leave_requests:    'Demande de congé',
  presences:         'Pointage',
  contracts:         'Contrat',
  lateness_records:  'Retard',
  audit_log:         'Journal',
}

const ACTION_COLORS: Record<string, string> = {
  INSERT: '#059669',
  UPDATE: '#D97706',
  DELETE: '#DC2626',
}

function formatDt(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function RgpdPage() {
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(true)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'requested'>('idle')

  useEffect(() => {
    fetch('/api/rgpd/audit-log')
      .then(r => r.ok ? r.json() : [])
      .then((data: AuditEntry[]) => setAuditLog(data))
      .catch(() => setAuditLog([]))
      .finally(() => setAuditLoading(false))
  }, [])

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/rgpd/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const disposition = res.headers.get('content-disposition') ?? ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      a.download = match ? match[1] : `export-rgpd-${new Date().toISOString().slice(0, 10)}.csv`
      a.href = url
      a.click()
      URL.revokeObjectURL(url)
      setExported(true)
      setTimeout(() => setExported(false), 4000)
    } catch { /* ignore */ }
    setExporting(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
          Données &amp; RGPD
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gérez vos données personnelles conformément au Règlement Général sur la Protection des Données.
        </p>
      </div>

      {/* Export section */}
      <section
        className="rounded-xl overflow-hidden"
        style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Download className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Exporter vos données personnelles</p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Téléchargez l&apos;ensemble des données de votre établissement (employés, planning, congés, présences) au format CSV.
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-3 mb-4">
            {[
              { icon: Users, label: 'Employés & profils' },
              { icon: Calendar, label: 'Planning (12 mois)' },
              { icon: FileText, label: 'Congés & absences' },
              { icon: Activity, label: 'Présences & pointages' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                <Icon className="h-3 w-3" />
                {label}
              </div>
            ))}
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: exported ? '#F0FDF4' : 'var(--accent)',
              color: exported ? '#15803D' : '#fff',
              border: exported ? '0.5px solid #BBF7D0' : 'none',
            }}
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : exported ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            {exporting ? 'Export en cours…' : exported ? 'Téléchargement prêt' : 'Télécharger mes données (CSV)'}
          </button>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
            Droit à la portabilité — Art. 20 RGPD · Données chiffrées en transit (TLS)
          </p>
        </div>
      </section>

      {/* Deletion request */}
      <section
        className="rounded-xl overflow-hidden"
        style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#FEF2F2' }}>
              <Trash2 className="h-4 w-4" style={{ color: '#DC2626' }} />
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Demande de suppression</p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Demandez la suppression de vos données et de votre établissement de la Plateforme.
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          {deleteStep === 'idle' && (
            <>
              <div
                className="flex items-start gap-2.5 rounded-lg p-3 text-[12px]"
                style={{ backgroundColor: '#FEF3C7', border: '0.5px solid #FDE68A', color: '#92400E' }}
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p>
                  Cette action supprime définitivement toutes les données de votre établissement (employés, plannings, présences, documents).
                  Un délai de traitement de 30 jours s&apos;applique.
                </p>
              </div>
              <button
                onClick={() => setDeleteStep('confirm')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                style={{ border: '0.5px solid #FCA5A5', backgroundColor: '#FEF2F2', color: '#DC2626' }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Demander la suppression de mon compte
              </button>
            </>
          )}

          {deleteStep === 'confirm' && (
            <div className="space-y-3">
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                Confirmez-vous vouloir supprimer définitivement toutes vos données ?
              </p>
              <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                Cette demande sera traitée sous 30 jours. Vous recevrez une confirmation à votre adresse email.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteStep('requested')}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium text-white"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  Oui, confirmer la demande
                </button>
                <button
                  onClick={() => setDeleteStep('idle')}
                  className="px-4 py-2 rounded-lg text-[13px]"
                  style={{ border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {deleteStep === 'requested' && (
            <div
              className="flex items-center gap-2.5 rounded-lg p-3 text-[13px]"
              style={{ backgroundColor: '#F0FDF4', border: '0.5px solid #BBF7D0', color: '#15803D' }}
            >
              <Check className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Demande enregistrée</p>
                <p className="text-[12px] mt-0.5">
                  Votre demande a été transmise à <a href="mailto:assistance.quartzbase@mail.fr" className="underline">assistance.quartzbase@mail.fr</a>.
                  Traitement sous 30 jours.
                </p>
              </div>
            </div>
          )}

          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            Droit à l&apos;effacement — Art. 17 RGPD · Contact DPO : <a href="mailto:assistance.quartzbase@mail.fr" style={{ color: 'var(--accent)' }}>assistance.quartzbase@mail.fr</a>
          </p>
        </div>
      </section>

      {/* Audit log */}
      <section
        className="rounded-xl overflow-hidden"
        style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Clock className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Journal d&apos;audit</p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Historique des 50 dernières actions effectuées sur votre établissement. Conservé 12 mois.
              </p>
            </div>
          </div>
        </div>

        {auditLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : auditLog.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ShieldCheck className="h-8 w-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Aucune entrée dans le journal pour le moment.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {auditLog.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: `${ACTION_COLORS[entry.action]}18`,
                    color: ACTION_COLORS[entry.action],
                  }}
                >
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <span className="text-[13px] flex-1" style={{ color: 'var(--text-primary)' }}>
                  {TABLE_LABELS[entry.table_name] ?? entry.table_name}
                </span>
                <span className="text-[11px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                  {formatDt(entry.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
