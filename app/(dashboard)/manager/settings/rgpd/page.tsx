'use client'

import { useState, useEffect } from 'react'
import {
  ShieldCheck, Download, Trash2, Loader2, Check, AlertTriangle, FileText, Users,
  Calendar, Activity, History, Lock, MapPin, BadgeCheck, Plus, Pencil, CheckCircle2,
} from 'lucide-react'

type AuditEntry = {
  id: string
  table_name: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  performed_by: string | null
  created_at: string
}

const DPO_EMAIL = 'assistance.quartzbase@mail.fr'

const ACTION_LABELS: Record<string, string> = { INSERT: 'Création', UPDATE: 'Modification', DELETE: 'Suppression' }
const TABLE_LABELS: Record<string, string> = {
  profiles: 'Profil employé', shifts: 'Planning', leave_requests: 'Demande de congé',
  presences: 'Pointage', contracts: 'Contrat', lateness_records: 'Retard', audit_log: 'Journal',
}
const ACTION_COLORS: Record<string, string> = { INSERT: '#059669', UPDATE: '#D97706', DELETE: '#DC2626' }
const ACTION_ICONS = { INSERT: Plus, UPDATE: Pencil, DELETE: Trash2 } as const

const DATA_TYPES = [
  { icon: Users,    label: 'Employés & profils' },
  { icon: Calendar, label: 'Planning (12 mois)' },
  { icon: FileText, label: 'Congés & absences' },
  { icon: Activity, label: 'Présences & pointages' },
]

function formatDt(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function RgpdPage() {
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(true)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'requested'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/rgpd/audit-log')
      .then(r => r.ok ? r.json() : [])
      .then((data: AuditEntry[]) => setAuditLog(data))
      .catch(() => setAuditLog([]))
      .finally(() => setAuditLoading(false))
  }, [])

  // Reflète une demande de suppression déjà enregistrée côté serveur.
  useEffect(() => {
    fetch('/api/rgpd/deletion-request')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.request) setDeleteStep('requested') })
      .catch(() => {})
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

  // Enregistre la demande côté serveur (table deletion_requests) et alerte l'ops.
  async function confirmDeletion() {
    setSubmitting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/rgpd/deletion-request', { method: 'POST' })
      if (!res.ok) throw new Error()
      setDeleteStep('requested')
    } catch {
      setDeleteError("La demande n'a pas pu être enregistrée. Réessayez ou contactez le DPO.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="nx-planpage" style={{ maxWidth: 672, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Trust hero */}
      <div className="nx-rgpd-hero">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(0,212,170,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ShieldCheck className="ic20" style={{ color: '#8AF5DC' }} /></div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", letterSpacing: '-.01em' }}>Vos données vous appartiennent</p>
            <p style={{ fontSize: 12.5, opacity: .82, marginTop: 4, lineHeight: 1.5, maxWidth: 440 }}>Hébergées en France, chiffrées de bout en bout et conformes au RGPD. Exportez-les ou effacez-les quand vous le souhaitez — sans conditions.</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {[{ icon: Lock, label: 'Chiffrement TLS' }, { icon: MapPin, label: 'Serveurs en France' }, { icon: BadgeCheck, label: 'Conforme RGPD' }].map(({ icon: Icon, label }) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: 'rgba(255,255,255,.1)' }}><Icon className="ic12" style={{ color: '#8AF5DC' }} />{label}</span>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="nx-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div className="nx-ico" style={{ background: 'var(--accent-light)' }}><Download className="ic16" style={{ color: 'var(--accent)' }} /></div>
          <div><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Exporter vos données</p><p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Tout votre établissement, au format CSV</p></div>
        </div>
        <div className="nx-datagrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {DATA_TYPES.map(({ icon: Icon, label }) => (
            <div key={label} className="nx-datatile">
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon className="ic16" style={{ color: 'var(--accent)' }} /></div>
              <div style={{ minWidth: 0 }}><p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p></div>
            </div>
          ))}
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-primary" style={exported ? { background: 'var(--emerald)' } : undefined}>
          {exporting ? <Loader2 className="ic14 nx-spin" /> : exported ? <Check className="ic14" /> : <Download className="ic14" />}
          {exporting ? 'Export en cours…' : exported ? 'Téléchargement prêt' : 'Télécharger mes données (CSV)'}
        </button>
        <p style={{ fontSize: 11, marginTop: 10, color: 'var(--text-tertiary)' }}>Droit à la portabilité — Art. 20 RGPD · chiffré en transit (TLS)</p>
      </div>

      {/* Danger zone */}
      <div className="nx-card" style={{ padding: 0, overflow: 'hidden', borderColor: 'rgba(220,38,38,.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', background: 'rgba(220,38,38,.06)', borderBottom: '0.5px solid rgba(220,38,38,.2)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(220,38,38,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Trash2 className="ic16" style={{ color: '#DC2626' }} /></div>
          <div><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Supprimer mon établissement</p><p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Action définitive · droit à l’effacement (Art. 17)</p></div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {deleteStep === 'idle' && (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', borderRadius: 10, padding: '12px 14px', fontSize: 12, background: 'rgba(240,140,0,.09)', border: '0.5px solid rgba(240,140,0,.28)' }}>
                <AlertTriangle className="ic14" style={{ marginTop: 1, flexShrink: 0, color: 'var(--warning)' }} />
                <p style={{ lineHeight: 1.5, color: 'var(--text-secondary)' }}>Toutes les données de votre établissement (employés, plannings, présences, documents) seront <strong style={{ color: 'var(--text-primary)' }}>définitivement supprimées</strong>. Un délai de traitement de 30 jours s’applique.</p>
              </div>
              <button onClick={() => setDeleteStep('confirm')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content', padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '0.5px solid #FCA5A5', background: 'rgba(220,38,38,.06)', color: '#DC2626' }}>
                <Trash2 className="ic14" />Demander la suppression
              </button>
            </>
          )}
          {deleteStep === 'confirm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Confirmez-vous la suppression définitive de toutes vos données ?</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Votre demande sera enregistrée et traitée sous 30 jours. Vous recevrez une confirmation par email.</p>
              {deleteError && <p style={{ fontSize: 12, color: 'var(--danger)' }}>{deleteError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmDeletion} disabled={submitting} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#fff', background: '#DC2626', border: 'none', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>{submitting && <Loader2 className="ic14 nx-spin" />}Oui, confirmer</button>
                <button onClick={() => { setDeleteStep('idle'); setDeleteError(null) }} disabled={submitting} style={{ padding: '9px 16px', borderRadius: 9, fontSize: 13, border: '0.5px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer' }}>Annuler</button>
              </div>
            </div>
          )}
          {deleteStep === 'requested' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', borderRadius: 10, padding: '12px 14px', fontSize: 13, background: 'rgba(16,185,129,.1)', border: '0.5px solid rgba(16,185,129,.3)' }}>
              <CheckCircle2 className="ic16" style={{ flexShrink: 0, color: 'var(--emerald)' }} />
              <div><p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Demande enregistrée</p><p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-secondary)' }}>Elle a été transmise à notre équipe · traitement sous 30 jours. Une question ? <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a></p></div>
            </div>
          )}
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Droit à l’effacement — Art. 17 RGPD · Contact DPO : <a href={`mailto:${DPO_EMAIL}`} style={{ color: 'var(--accent)' }}>{DPO_EMAIL}</a></p>
        </div>
      </div>

      {/* Audit log */}
      <div className="nx-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
          <div className="nx-ico" style={{ background: 'var(--accent-light)' }}><History className="ic16" style={{ color: 'var(--accent)' }} /></div>
          <div><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Journal d’audit</p><p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>50 dernières actions · conservé 12 mois</p></div>
        </div>
        {auditLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="ic20 nx-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
        ) : auditLog.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <ShieldCheck className="ic28" style={{ margin: '0 auto 12px', opacity: .3, color: 'var(--text-tertiary)' }} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Aucune entrée dans le journal pour le moment.</p>
          </div>
        ) : (
          <div className="nx-divide">
            {auditLog.map(entry => {
              const Icon = ACTION_ICONS[entry.action] ?? Activity
              const color = ACTION_COLORS[entry.action] ?? 'var(--text-tertiary)'
              return (
                <div key={entry.id} className="nx-audit">
                  <div className="nx-audit-ico" style={{ background: `${color}18` }}><Icon className="ic14" style={{ color }} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{TABLE_LABELS[entry.table_name] ?? entry.table_name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ACTION_LABELS[entry.action] ?? entry.action}</p>
                  </div>
                  <span style={{ fontSize: 11, flexShrink: 0, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{formatDt(entry.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
