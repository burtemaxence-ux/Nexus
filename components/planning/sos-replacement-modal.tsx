'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Zap, Loader2, Star, AlertTriangle, Users, Send, ChevronRight } from 'lucide-react'
import { type Shift, type Profile, type Poste } from '@/types'
import { formatTime } from '@/lib/planning-utils'

// ── Types ──────────────────────────────────────────────────────────────────────

type CandidateScore = {
  employee_id: string
  full_name: string
  position: string | null
  contract_type: string | null
  experience_score: number
  availability_score: number
  response_score: number
  score_final: number
  weekly_hours_planned: number
  contract_weekly_hours: number | null
  compliance_warning: boolean
  compliance_details: string[]
  explanation: string
}

type SosStep = 'confirm' | 'loading' | 'results' | 'notified'

interface SosReplacementModalProps {
  shift: Shift
  employee: Profile
  poste: Poste | null | undefined
  onClose: () => void
}

// ── Star rating ────────────────────────────────────────────────────────────────

function StarRating({ score }: { score: number }) {
  const filled = score >= 7 ? 3 : score >= 4 ? 2 : 1
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3].map(i => (
        <Star
          key={i}
          size={13}
          style={{
            color: i <= filled ? '#F59E0B' : 'var(--border)',
            fill: i <= filled ? '#F59E0B' : 'transparent',
          }}
        />
      ))}
    </div>
  )
}

// ── Candidate card ─────────────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  rank,
}: {
  candidate: CandidateScore
  rank: number
}) {
  const initials = candidate.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const avatarColors = ['#4F46E5', '#059669', '#DC2626']
  const avatarBg = avatarColors[rank - 1] ?? '#6B7280'

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-page)',
        border: rank === 1 ? '1px solid var(--accent)' : '0.5px solid var(--border)',
        borderRadius: '12px',
        padding: '14px',
        position: 'relative',
      }}
    >
      {rank === 1 && (
        <div
          style={{
            position: 'absolute',
            top: '-1px',
            right: '12px',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '0 0 6px 6px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Recommandé
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        {/* Avatar */}
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: avatarBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{initials}</span>
        </div>

        {/* Name + position */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {candidate.full_name}
          </p>
          {candidate.position && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' }}>
              {candidate.position}
            </p>
          )}
        </div>

        {/* Score stars */}
        <StarRating score={candidate.score_final} />
      </div>

      {/* Explanation */}
      {candidate.explanation && (
        <p style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          marginBottom: '8px',
          lineHeight: 1.4,
        }}>
          {candidate.explanation}
        </p>
      )}

      {/* Badges */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {candidate.compliance_warning && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            fontSize: '11px',
            fontWeight: 500,
            padding: '2px 7px',
            borderRadius: '6px',
            border: '0.5px solid #F59E0B',
          }}>
            <AlertTriangle size={10} />
            {candidate.weekly_hours_planned > 0
              ? `${candidate.weekly_hours_planned}h cette sem.`
              : 'Alerte compliance'}
          </span>
        )}
        {candidate.contract_type === 'Extra' && (
          <span style={{
            backgroundColor: '#F3F4F6',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 500,
            padding: '2px 7px',
            borderRadius: '6px',
            border: '0.5px solid var(--border)',
          }}>
            Extra
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export function SosReplacementModal({ shift, employee, poste, onClose }: SosReplacementModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<SosStep>('confirm')
  const [candidates, setCandidates] = useState<CandidateScore[]>([])
  const [replacementRequestId, setReplacementRequestId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notifyLoading, setNotifyLoading] = useState(false)

  const shiftDate = new Date(shift.date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const employeeFirstName = employee.full_name?.split(' ')[0] ?? employee.email

  // ── Lancer la recherche ────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    setStep('loading')
    setError(null)
    try {
      const res = await fetch('/api/ai/replacement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: shift.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la recherche')
        setStep('confirm')
        return
      }
      setCandidates(data.candidates)
      setReplacementRequestId(data.replacement_request_id)
      setStep('results')
    } catch {
      setError('Erreur réseau. Réessayez.')
      setStep('confirm')
    }
  }, [shift.id])

  // ── Notifier les candidats ─────────────────────────────────────────────────

  const handleNotify = useCallback(async () => {
    if (!replacementRequestId) return
    setNotifyLoading(true)
    try {
      const res = await fetch('/api/replacement/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replacement_request_id: replacementRequestId }),
      })
      if (res.ok) {
        setStep('notified')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Erreur lors de la notification')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setNotifyLoading(false)
    }
  }, [replacementRequestId, router])

  // ── Overlay ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.45)',
          zIndex: 9990,
          animation: 'dp-fade 150ms ease-out both',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9991,
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--bg-card)',
          border: '0.5px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          animation: 'dp-fade-up 180ms ease-out both',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '16px 20px',
          borderBottom: '0.5px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            backgroundColor: '#FEF3C7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Zap size={16} style={{ color: '#D97706' }} />
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
            {step === 'results' ? '3 candidats disponibles' : step === 'notified' ? 'Notifications envoyées' : 'Absence imprévue'}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '28px', height: '28px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
              color: 'var(--text-tertiary)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ── STEP: confirm ─────────────────────────────────────────────── */}
          {step === 'confirm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Shift info card */}
              <div style={{
                backgroundColor: 'var(--bg-page)',
                border: '0.5px solid var(--border)',
                borderRadius: '12px',
                padding: '14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    backgroundColor: 'var(--accent-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                      {(employee.full_name ?? employee.email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {employee.full_name ?? employee.email}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                      {employee.position ?? 'Employé'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Jour</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>{shiftDate}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Horaire</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {formatTime(shift.start_time)} → {formatTime(shift.end_time)}
                    </span>
                  </div>
                  {poste && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Poste</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          backgroundColor: poste.color, display: 'inline-block',
                        }} />
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{poste.name}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, textAlign: 'center' }}>
                Confirmer que <strong style={{ color: 'var(--text-primary)' }}>{employeeFirstName}</strong> est absent et rechercher un remplaçant disponible ?
              </p>

              {error && (
                <p style={{ fontSize: '13px', color: 'var(--danger)', textAlign: 'center', backgroundColor: '#FEE2E2', padding: '10px', borderRadius: '8px' }}>
                  {error}
                </p>
              )}
            </div>
          )}

          {/* ── STEP: loading ─────────────────────────────────────────────── */}
          {step === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 0' }}>
              <Loader2 size={36} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Analyse en cours…</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Calcul des disponibilités et scores IA
                </p>
              </div>
            </div>
          )}

          {/* ── STEP: results ─────────────────────────────────────────────── */}
          {step === 'results' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '4px' }}>
                Le premier à confirmer sera automatiquement planifié
              </p>

              {candidates.map((c, i) => (
                <CandidateCard key={c.employee_id} candidate={c} rank={i + 1} />
              ))}

              {error && (
                <p style={{ fontSize: '13px', color: 'var(--danger)', textAlign: 'center', backgroundColor: '#FEE2E2', padding: '10px', borderRadius: '8px' }}>
                  {error}
                </p>
              )}
            </div>
          )}

          {/* ── STEP: notified ────────────────────────────────────────────── */}
          {step === 'notified' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px 0' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Send size={24} style={{ color: '#16A34A' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Notifications envoyées !</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                  Les {candidates.length} candidats ont reçu une notification push et in-app.
                  Le premier à confirmer sera planifié automatiquement.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                {candidates.map(c => (
                  <div key={c.employee_id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    backgroundColor: 'var(--bg-page)',
                    border: '0.5px solid var(--border)',
                    borderRadius: '8px', padding: '10px 12px',
                  }}>
                    <Users size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>{c.full_name}</span>
                    <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 500 }}>Notifié ✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '0.5px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
        }}>
          {step === 'confirm' && (
            <>
              <button
                onClick={handleSearch}
                style={{
                  width: '100%', padding: '12px',
                  backgroundColor: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <Zap size={15} />
                Rechercher un remplaçant
              </button>
              <button
                onClick={onClose}
                style={{
                  width: '100%', padding: '10px',
                  backgroundColor: 'transparent', color: 'var(--text-secondary)',
                  border: '0.5px solid var(--border)', borderRadius: '10px',
                  fontSize: '14px', cursor: 'pointer',
                }}
              >
                Annuler
              </button>
            </>
          )}

          {step === 'results' && (
            <>
              <button
                onClick={handleNotify}
                disabled={notifyLoading}
                style={{
                  width: '100%', padding: '13px',
                  backgroundColor: '#16A34A', color: '#fff',
                  border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 600, cursor: notifyLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: notifyLoading ? 0.7 : 1,
                }}
              >
                {notifyLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
                {notifyLoading ? 'Envoi…' : `📲 Notifier les ${candidates.length} candidats`}
              </button>
              <button
                onClick={onClose}
                style={{
                  width: '100%', padding: '10px',
                  backgroundColor: 'transparent', color: 'var(--text-secondary)',
                  border: '0.5px solid var(--border)', borderRadius: '10px',
                  fontSize: '14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                Choisir manuellement <ChevronRight size={13} />
              </button>
            </>
          )}

          {step === 'notified' && (
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '12px',
                backgroundColor: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </>
  )
}
