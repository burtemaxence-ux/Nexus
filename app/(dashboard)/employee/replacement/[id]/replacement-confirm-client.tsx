'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, MapPin, Zap, Loader2 } from 'lucide-react'

interface Props {
  replacementRequestId: string
  employeeId: string
  status: string
  myResponse: string | null
  expiresAt: string
  confirmedEmployeeId: string | null
  shift: {
    date: string
    startTime: string
    endTime: string
    breakMinutes: number
  } | null
  posteName: string | null
  posteColor: string | null
  establishmentName: string
  establishmentAddress: string | null
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatTime(t: string): string {
  return t.slice(0, 5)
}

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now())
  )

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = Math.max(0, new Date(expiresAt).getTime() - Date.now())
      setRemaining(ms)
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return { remaining, minutes, seconds }
}

export function ReplacementConfirmClient({
  replacementRequestId,
  employeeId,
  status,
  myResponse,
  expiresAt,
  shift,
  posteName,
  posteColor,
  establishmentName,
  establishmentAddress,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'confirmed' | 'declined' | null>(null)
  const [done, setDone] = useState<'confirmed' | 'declined' | null>(
    myResponse === 'confirmed' ? 'confirmed' : myResponse === 'declined' ? 'declined' : null
  )
  const [error, setError] = useState<string | null>(null)

  const { remaining, minutes, seconds } = useCountdown(expiresAt)
  const showCountdown = remaining > 0 && remaining < 10 * 60 * 1000 // < 10 min

  // Cas status terminal
  if (status === 'confirmed' && myResponse !== 'confirmed') {
    return <TerminalScreen icon="taken" message="Ce créneau a déjà été attribué. Merci !" />
  }
  if (status === 'expired' || (status === 'pending' && remaining === 0)) {
    return <TerminalScreen icon="expired" message="Cette demande a expiré." />
  }
  if (status === 'cancelled') {
    return <TerminalScreen icon="expired" message="Cette demande a été annulée." />
  }

  // Réponse déjà donnée
  if (done === 'confirmed') {
    return <TerminalScreen icon="confirmed" message="Tu as confirmé ta disponibilité ! Le planning a été mis à jour." />
  }
  if (done === 'declined') {
    return <TerminalScreen icon="declined" message="Ta réponse a été enregistrée. Merci !" />
  }

  async function handleResponse(response: 'confirmed' | 'declined') {
    setLoading(response)
    setError(null)
    try {
      const res = await fetch('/api/replacement/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replacement_request_id: replacementRequestId,
          employee_id: employeeId,
          response,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue.')
        return
      }
      setDone(response)
      if (response === 'confirmed') router.refresh()
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(null)
    }
  }

  const borderColor = posteColor ?? 'var(--accent)'
  const bgColor = posteColor ? `${posteColor}15` : 'var(--accent-light)'

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ backgroundColor: '#FEF3C7' }}
          >
            <Zap size={28} style={{ color: '#D97706' }} />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Shift disponible
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            {establishmentName}
          </p>
        </div>

        {/* Shift card */}
        {shift && (
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: bgColor,
              border: `1.5px solid ${borderColor}`,
            }}
          >
            {/* Date */}
            <p className="text-[13px] font-medium capitalize mb-3"
              style={{ color: borderColor, opacity: 0.8 }}
            >
              {formatDate(shift.date)}
            </p>

            {/* Horaire */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[36px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                {formatTime(shift.startTime)}
              </span>
              <span className="text-[20px]" style={{ color: 'var(--text-tertiary)' }}>→</span>
              <span className="text-[36px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                {formatTime(shift.endTime)}
              </span>
            </div>

            {/* Poste */}
            {posteName && (
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: posteColor ?? 'var(--accent)' }}
                />
                <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {posteName}
                </span>
              </div>
            )}

            {/* Lieu */}
            {establishmentAddress && (
              <div className="flex items-center gap-2 mt-2">
                <MapPin size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  {establishmentAddress}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Compte à rebours si < 10 min */}
        {showCountdown && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl"
            style={{ backgroundColor: '#FEE2E2', border: '0.5px solid var(--danger)' }}
          >
            <Clock size={14} style={{ color: 'var(--danger)' }} />
            <span className="text-[13px] font-medium" style={{ color: 'var(--danger)' }}>
              Expire dans {minutes}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="py-3 px-4 rounded-xl text-center"
            style={{ backgroundColor: '#FEE2E2', border: '0.5px solid var(--danger)' }}
          >
            <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}

        {/* CTA buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleResponse('confirmed')}
            disabled={!!loading}
            style={{
              width: '100%',
              height: '64px',
              backgroundColor: '#16A34A',
              color: '#fff',
              border: 'none',
              borderRadius: '16px',
              fontSize: '17px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              opacity: loading ? 0.7 : 1,
              boxShadow: loading ? 'none' : '0 4px 20px rgba(22,163,74,0.35)',
              transition: 'all 150ms ease',
            }}
          >
            {loading === 'confirmed'
              ? <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
              : <CheckCircle size={22} />
            }
            {loading === 'confirmed' ? 'Confirmation…' : '✅ Je suis disponible — Confirmer'}
          </button>

          <button
            onClick={() => handleResponse('declined')}
            disabled={!!loading}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '0.5px solid var(--border)',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading === 'declined'
              ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              : <XCircle size={16} />
            }
            Je ne suis pas disponible
          </button>
        </div>

        <p className="text-center text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          Le premier à confirmer sera automatiquement planifié
        </p>
      </div>
    </div>
  )
}

// ── Terminal screens ───────────────────────────────────────────────────────────

function TerminalScreen({ icon, message }: { icon: 'confirmed' | 'declined' | 'taken' | 'expired'; message: string }) {
  const configs = {
    confirmed: { bg: '#DCFCE7', color: '#16A34A', Icon: CheckCircle },
    declined: { bg: '#F3F4F6', color: 'var(--text-secondary)', Icon: XCircle },
    taken: { bg: '#EFF6FF', color: '#2563EB', Icon: CheckCircle },
    expired: { bg: '#FEF3C7', color: '#D97706', Icon: Clock },
  }
  const { bg, color, Icon } = configs[icon]

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{ backgroundColor: bg }}
      >
        <Icon size={32} style={{ color }} />
      </div>
      <p className="text-[18px] font-semibold leading-snug max-w-xs"
        style={{ color: 'var(--text-primary)' }}
      >
        {message}
      </p>
    </div>
  )
}
