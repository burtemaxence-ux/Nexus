'use client'

import { useState, memo } from 'react'
import { Plus } from 'lucide-react'
import type { Shift, Poste, LeaveType } from '@/types'
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

export const GridCell = memo(function GridCell({ droppableId, shifts, leaveType, postes, weekLocked, onAdd, onClickShift, onContextMenu, onSos, isToday: isTodayCol }: {
  droppableId: string
  shifts: Shift[]
  leaveType: LeaveType | undefined
  postes: Map<string, Poste>
  weekLocked: boolean
  onAdd: () => void
  onClickShift: (s: Shift) => void
  onContextMenu: (e: React.MouseEvent, s: Shift) => void
  onSos: (s: Shift) => void
  isToday: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  const [hov, setHov] = useState(false)
  const isEmpty = shifts.length === 0 && !leaveType

  return (
    <td
      ref={setNodeRef}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)',
        padding: '8px', verticalAlign: 'top',
        backgroundColor: isOver && !weekLocked ? 'var(--accent-light)' : isTodayCol ? 'rgba(45,58,140,0.04)' : 'transparent',
        transition: 'background-color 120ms ease', minWidth: '120px',
      }}
    >
      {leaveType && <AbsenceBadge type={leaveType} />}

      {shifts.map(shift => (
        <ShiftCard
          key={shift.id}
          shift={shift}
          poste={shift.poste_id ? postes.get(shift.poste_id) : null}
          onClick={() => onClickShift(shift)}
          onContextMenu={(e) => onContextMenu(e, shift)}
          onSos={() => onSos(shift)}
          disabled={weekLocked}
          hasConflict={!!leaveType && shifts.length > 0}
        />
      ))}

      {isEmpty && !weekLocked && (
        <div
          onClick={onAdd}
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
          onClick={onAdd}
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
