'use client'

import { AlertTriangle, Check, ExternalLink, Loader2, Star } from 'lucide-react'

export type ScoredCandidate = {
  employee_id: string
  full_name: string
  position: string | null
  contract_type: string | null
  score_final: number
  weekly_hours_planned: number
  compliance_warning: boolean
  availability_mismatch?: boolean
  explanation: string
}

export interface WeekShift {
  id: string
  date: string
  start_time: string
  end_time: string
}

interface SosProps {
  employeeName: string
  weekShifts: WeekShift[]
  weekShiftsLoading: boolean
  onTrigger: (shiftId: string) => void
}

export function ComplianceSosView({ employeeName, weekShifts, weekShiftsLoading, onTrigger }: SosProps) {
  return (
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
              onClick={() => onTrigger(shift.id)}
              className="w-full text-left p-3.5 rounded-xl border border-[var(--border)] hover:bg-[#FEF2F2] hover:border-[#DC2626] transition-colors group"
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
                <span className="text-[12px] text-[#DC2626] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  Déclencher SOS →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface SosResultsProps {
  sosLoading: boolean
  sosError: string | null
  sosCandidates: ScoredCandidate[]
  sosNotifyLoading: boolean
  onNotify: () => void
  onRetry: () => void
}

export function ComplianceSosResultsView({ sosLoading, sosError, sosCandidates, sosNotifyLoading, onNotify, onRetry }: SosResultsProps) {
  if (sosLoading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      <p className="text-[13px] text-[var(--text-secondary)]">Recherche des candidats disponibles…</p>
    </div>
  )

  if (sosError) return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <p className="text-[13px] text-[#DC2626] text-center">{sosError}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg border border-[var(--border)] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-colors"
      >
        ← Réessayer
      </button>
    </div>
  )

  const avatarColors = ['#4F46E5', '#059669', '#DC2626']

  return (
    <div className="p-5 space-y-3 pb-4">
      <p className="text-[13px] text-[var(--text-secondary)] pb-1">
        {sosCandidates.length === 0
          ? 'Aucun candidat disponible pour ce shift.'
          : `${sosCandidates.length} candidat${sosCandidates.length > 1 ? 's' : ''} disponible${sosCandidates.length > 1 ? 's' : ''} trouvé${sosCandidates.length > 1 ? 's' : ''}`}
      </p>
      <div className="space-y-3">
        {sosCandidates.map((c, i) => {
          const initials = c.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: avatarBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: 500, padding: '2px 7px', borderRadius: '6px', border: '0.5px solid #F59E0B' }}>
                    <AlertTriangle size={10} />
                    {c.weekly_hours_planned > 0 ? `${c.weekly_hours_planned}h cette sem.` : 'Alerte compliance'}
                  </span>
                )}
                {c.availability_mismatch && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '11px', fontWeight: 500, padding: '2px 7px', borderRadius: '6px', border: '0.5px solid #EF4444' }}>
                    <AlertTriangle size={10} />
                    Hors dispos déclarées
                  </span>
                )}
                {c.contract_type === 'Extra' && (
                  <span style={{ backgroundColor: '#F3F4F6', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 500, padding: '2px 7px', borderRadius: '6px', border: '0.5px solid var(--border)' }}>
                    Extra
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="pt-2 flex flex-col gap-2 sticky bottom-0 bg-[var(--bg-card)] pb-2">
        <button
          onClick={onNotify}
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
    </div>
  )
}

interface SosNotifiedProps {
  sosNotifiedCandidates: ScoredCandidate[]
  onGoToPlanning: () => void
  onClose: () => void
}

export function ComplianceSosNotifiedView({ sosNotifiedCandidates, onGoToPlanning, onClose }: SosNotifiedProps) {
  return (
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
          onClick={onGoToPlanning}
          className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-[13px] font-medium text-white"
          style={{ backgroundColor: '#2D3A8C' }}
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
  )
}
