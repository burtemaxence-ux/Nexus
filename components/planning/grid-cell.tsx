'use client'

import { useState, memo } from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import type { Shift, Poste, LeaveType, Profile } from '@/types'
import { LEAVE_STYLES } from '@/lib/planning-utils'
import { useDroppable } from '@dnd-kit/core'
import { ShiftCard } from './shift-card'

export const AbsenceBadge = memo(function AbsenceBadge({ type }: { type: LeaveType }) {
  const s = LEAVE_STYLES[type]
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      backgroundColor: s.bg, color: s.color, border: `0.5px solid ${s.color}`,
      borderRadius: '6px', fontSize: '11px', fontWeight: 500,
      padding: '2px 7px', marginBottom: '6px',
    }}>
      {s.label}
    </div>
  )
})

// `contextual` = drapeau inhérent aux horaires/jours d'ouverture (travail de
// nuit, dimanche) que l'ordonnancement ne peut pas éviter → affiché en info
// ambre, PAS compté comme une infraction rouge bloquante.
export type CellViolation = { name: string; reason: string; legalRef: string; fix: string | null; contextual: boolean }

export const GridCell = memo(function GridCell({ droppableId, shifts, leaveType, postes, weekLocked, employee, date, onAdd, onClickShift, onContextMenu, onSos, isToday: isTodayCol, violations }: {
  droppableId: string
  shifts: Shift[]
  leaveType: LeaveType | undefined
  postes: Map<string, Poste>
  weekLocked: boolean
  employee: Profile
  date: Date
  onAdd: (employee: Profile, date: Date) => void
  onClickShift: (s: Shift, employee: Profile, date: Date) => void
  onContextMenu: (e: React.MouseEvent, s: Shift, employee: Profile, date: Date) => void
  onSos: (s: Shift, employee: Profile) => void
  isToday: boolean
  violations?: CellViolation[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  const [hov, setHov] = useState(false)
  const [showViol, setShowViol] = useState(false)
  const isEmpty = shifts.length === 0 && !leaveType

  const infractions = (violations ?? []).filter(v => !v.contextual)
  const infos = (violations ?? []).filter(v => v.contextual)
  const hasInfraction = infractions.length > 0
  const hasInfo = infos.length > 0

  return (
    <td
      ref={setNodeRef}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)',
        padding: '8px', verticalAlign: 'top',
        backgroundColor: hasInfraction
          ? 'rgba(255,107,107,0.08)'
          : isOver && !weekLocked ? 'var(--accent-light)' : isTodayCol ? 'rgba(45,58,140,0.04)' : 'transparent',
        boxShadow: hasInfraction ? 'inset 0 0 0 1.5px var(--danger)' : undefined,
        transition: 'background-color 120ms ease', minWidth: '120px',
      }}
    >
      {(hasInfraction || hasInfo) && (
        <>
          <button
            type="button"
            onClick={() => setShowViol(v => !v)}
            className="flex items-center gap-1.5 mb-1.5 flex-wrap"
            style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
            title="Voir le détail"
          >
            {hasInfraction && (
              <span className="flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                <AlertTriangle size={11} />
                <span style={{ fontSize: '10px', fontWeight: 600 }}>
                  {infractions.length} infraction{infractions.length > 1 ? 's' : ''}
                </span>
              </span>
            )}
            {hasInfo && (
              <span className="flex items-center gap-1" style={{ color: 'var(--warning)' }}>
                <AlertTriangle size={11} />
                <span style={{ fontSize: '10px', fontWeight: 600 }}>
                  {infos.length} à vérifier
                </span>
              </span>
            )}
            <span style={{ fontSize: '9px', textDecoration: 'underline', opacity: 0.7, color: 'var(--text-tertiary)' }}>
              {showViol ? 'masquer' : 'détail'}
            </span>
          </button>
          {showViol && (
            <div
              className="mb-2"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: `0.5px solid ${hasInfraction ? 'var(--danger)' : 'var(--warning)'}`,
                borderRadius: '8px', padding: '8px', fontSize: '11px', lineHeight: 1.35,
              }}
            >
              {[...infractions, ...infos].map((v, i, arr) => (
                <div key={i} style={{ marginBottom: i < arr.length - 1 ? '8px' : 0 }}>
                  <p style={{ fontWeight: 600, color: v.contextual ? 'var(--warning)' : 'var(--danger)' }}>
                    {v.contextual ? 'À vérifier — ' : ''}{v.name}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{v.reason}</p>
                  {v.fix && (
                    <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>À corriger : </span>{v.fix}
                    </p>
                  )}
                  {v.legalRef && (
                    <p style={{ color: 'var(--text-tertiary)', marginTop: '2px', fontSize: '10px' }}>{v.legalRef}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {leaveType && <AbsenceBadge type={leaveType} />}

      {shifts.map(shift => (
        <ShiftCard
          key={shift.id}
          shift={shift}
          poste={shift.poste_id ? postes.get(shift.poste_id) : null}
          onClick={() => onClickShift(shift, employee, date)}
          onContextMenu={(e) => onContextMenu(e, shift, employee, date)}
          onSos={() => onSos(shift, employee)}
          disabled={weekLocked}
          hasConflict={!!leaveType && shifts.length > 0}
        />
      ))}

      {isEmpty && !weekLocked && (
        <div
          onClick={() => onAdd(employee, date)}
          style={{
            minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', borderRadius: '6px',
            border: hov ? '0.5px dashed var(--accent)' : '0.5px solid transparent',
            backgroundColor: hov ? 'var(--accent-light)' : 'transparent', transition: 'all 120ms ease',
          }}
        >
          {hov
            ? <Plus size={14} style={{ color: 'var(--accent)', opacity: 0.7 }} />
            : <span style={{ color: 'var(--border)', fontSize: '16px', fontWeight: 300 }}>—</span>
          }
        </div>
      )}

      {isEmpty && weekLocked && (
        <div style={{ minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--border)', fontSize: '16px', fontWeight: 300 }}>—</span>
        </div>
      )}

      {shifts.length > 0 && !weekLocked && (
        <div
          onClick={() => onAdd(employee, date)}
          style={{
            marginTop: '2px', height: '22px', borderRadius: '5px',
            border: '0.5px dashed var(--border)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 120ms ease',
          }}
          className="hover:border-[var(--accent)] hover:bg-[var(--accent-light)]"
        >
          <Plus size={10} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      )}
    </td>
  )
})
