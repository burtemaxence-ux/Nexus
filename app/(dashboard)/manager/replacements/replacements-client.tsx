'use client'

import { useState } from 'react'
import { Clock, CheckCircle, XCircle, Timer, Zap, Users } from 'lucide-react'

type RequestRow = {
  id: string
  status: string
  shiftDate: string | null
  shiftStart: string | null
  shiftEnd: string | null
  shiftPosition: string | null
  absentName: string | null
  replacementName: string | null
  createdAt: string
  confirmedAt: string | null
  resolutionMinutes: number | null
  candidatesCount: number
}

type Filter = 'all' | 'confirmed' | 'expired' | 'pending' | 'cancelled'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function formatTime(t: string): string {
  return t.slice(0, 5)
}

function formatResolution(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: React.ComponentType<{ size: number }> }> = {
  confirmed: { label: 'Confirmé', color: '#16A34A', bg: '#DCFCE7', Icon: CheckCircle },
  expired:   { label: 'Expiré',   color: '#D97706', bg: '#FEF3C7', Icon: Timer },
  pending:   { label: 'En cours', color: 'var(--accent)', bg: 'var(--accent-light)', Icon: Clock },
  cancelled: { label: 'Annulé',   color: 'var(--text-secondary)', bg: '#F3F4F6', Icon: XCircle },
}

export function ReplacementsClient({
  requests,
  avgMinutes,
}: {
  requests: RequestRow[]
  avgMinutes: number | null
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  const confirmedCount = requests.filter(r => r.status === 'confirmed').length
  const expiredCount = requests.filter(r => r.status === 'expired').length
  const pendingCount = requests.filter(r => r.status === 'pending').length

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: 'Tout', count: requests.length },
    { key: 'confirmed', label: 'Confirmés', count: confirmedCount },
    { key: 'expired', label: 'Expirés', count: expiredCount },
    { key: 'pending', label: 'En cours', count: pendingCount },
  ]

  return (
    <div className="space-y-5 px-4 py-6 max-w-4xl mx-auto">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          backgroundColor: '#FEF3C7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Zap size={18} style={{ color: '#D97706' }} />
        </div>
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Remplacements SOS
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Historique des 30 derniers jours
          </p>
        </div>
      </div>

      {/* Stat card — temps moyen */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '0.5px solid var(--border)',
        borderRadius: '14px',
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          backgroundColor: '#DCFCE7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Timer size={20} style={{ color: '#16A34A' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Temps moyen de remplacement
          </p>
          <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, marginTop: '2px' }}>
            {avgMinutes !== null ? formatResolution(avgMinutes) : '—'}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
            {confirmedCount} remplacement{confirmedCount !== 1 ? 's' : ''} réussi{confirmedCount !== 1 ? 's' : ''} sur {requests.length}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#16A34A' }}>{confirmedCount}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Confirmés</p>
            </div>
            <div style={{ width: '0.5px', backgroundColor: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#D97706' }}>{expiredCount}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Expirés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              border: filter === f.key ? 'none' : '0.5px solid var(--border)',
              backgroundColor: filter === f.key ? 'var(--accent)' : 'var(--bg-card)',
              color: filter === f.key ? '#fff' : 'var(--text-secondary)',
              transition: 'all 120ms ease',
            }}
          >
            {f.label}
            {f.count !== undefined && (
              <span style={{
                marginLeft: '6px',
                fontSize: '11px',
                opacity: 0.75,
              }}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 16px',
          backgroundColor: 'var(--bg-card)',
          border: '0.5px dashed var(--border)',
          borderRadius: '14px',
        }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Aucun remplacement sur cette période
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '0.5px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}>
          {filtered.map((r, idx) => {
            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.expired
            const StatusIcon = cfg.Icon
            const isLast = idx === filtered.length - 1

            return (
              <div
                key={r.id}
                style={{
                  padding: '14px 16px',
                  borderBottom: isLast ? 'none' : '0.5px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                {/* Status icon */}
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  backgroundColor: cfg.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <StatusIcon size={16} />
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {r.shiftDate && (
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {formatDate(r.shiftDate)}
                      </span>
                    )}
                    {r.shiftStart && r.shiftEnd && (
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {formatTime(r.shiftStart)}→{formatTime(r.shiftEnd)}
                      </span>
                    )}
                    {r.shiftPosition && (
                      <span style={{
                        fontSize: '11px', padding: '1px 7px', borderRadius: '4px',
                        backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)',
                        color: 'var(--text-secondary)',
                      }}>
                        {r.shiftPosition}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {r.absentName && (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Absent : <strong style={{ color: 'var(--text-primary)' }}>{r.absentName}</strong>
                      </span>
                    )}
                    {r.replacementName && (
                      <span style={{ fontSize: '12px', color: '#16A34A' }}>
                        → <strong>{r.replacementName}</strong>
                      </span>
                    )}
                    {!r.replacementName && r.status !== 'pending' && (
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        Aucun remplaçant
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: resolution time + status badge */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {r.resolutionMinutes !== null && (
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#16A34A', marginBottom: '4px' }}>
                      ⚡ {formatResolution(r.resolutionMinutes)}
                    </p>
                  )}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 600,
                    padding: '3px 8px', borderRadius: '6px',
                    backgroundColor: cfg.bg, color: cfg.color,
                  }}>
                    {cfg.label}
                  </span>
                  {r.candidatesCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', marginTop: '4px' }}>
                      <Users size={10} style={{ color: 'var(--text-tertiary)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {r.candidatesCount} candidat{r.candidatesCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
