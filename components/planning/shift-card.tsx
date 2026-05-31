'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { Edit2, Trash2, CopyPlus, AlertTriangle, Zap } from 'lucide-react'
import type { Shift, Profile, Poste } from '@/types'
import { formatTime, formatHours, calcHours } from '@/lib/planning-utils'
import { toISODate } from '@/lib/utils/dates'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

export type CtxMenu = { x: number; y: number; shift: Shift; employee: Profile; date: Date }

export const CtxBtn = memo(function CtxBtn({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        width: '100%', padding: '6px 10px', borderRadius: '6px',
        fontSize: '13px', border: 'none', cursor: 'pointer',
        color: danger ? 'var(--danger)' : hov ? 'var(--text-primary)' : 'var(--text-secondary)',
        backgroundColor: hov ? (danger ? '#FEE2E2' : 'var(--accent-light)') : 'transparent',
        transition: 'all 100ms ease',
      }}
    >
      {icon}{label}
    </button>
  )
})

export const ContextMenu = memo(function ContextMenu({ menu, weekDates, onEdit, onDelete, onCopyTo, onClose }: {
  menu: CtxMenu
  weekDates: Date[]
  onEdit: () => void
  onDelete: () => void
  onCopyTo: (date: Date) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [onClose])

  const otherDays = weekDates.filter(d => toISODate(d) !== menu.shift.date)

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', top: menu.y, left: menu.x, zIndex: 9999,
        backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)',
        borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        minWidth: '190px', overflow: 'hidden', animation: 'dp-fade-up 120ms ease-out both',
      }}
    >
      <div style={{ padding: '8px 12px 7px', borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {formatTime(menu.shift.start_time)} → {formatTime(menu.shift.end_time)}
          <span style={{ marginLeft: 6, fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '11px' }}>
            {formatHours(calcHours(menu.shift.start_time, menu.shift.end_time, menu.shift.break_minutes))}
          </span>
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
          {menu.employee.full_name ?? menu.employee.email}
        </p>
      </div>
      <div style={{ padding: '4px' }}>
        <CtxBtn icon={<Edit2 size={13} />} label="Modifier" onClick={onEdit} />
        {otherDays.length > 0 && (
          <>
            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', padding: '5px 10px 2px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Copier vers
            </p>
            {otherDays.map(d => (
              <CtxBtn
                key={toISODate(d)}
                icon={<CopyPlus size={13} />}
                label={d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }).replace('.', '')}
                onClick={() => onCopyTo(d)}
              />
            ))}
          </>
        )}
        <div style={{ height: '0.5px', backgroundColor: 'var(--border)', margin: '4px 0' }} />
        <CtxBtn icon={<Trash2 size={13} />} label="Supprimer" onClick={onDelete} danger />
      </div>
    </div>
  )
})

export const ShiftCard = memo(function ShiftCard({ shift, poste, onClick, onContextMenu, onSos, disabled, hasConflict }: {
  shift: Shift
  poste: Poste | null | undefined
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onSos: () => void
  disabled: boolean
  hasConflict: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `shift-${shift.id}`, disabled })
  const [hovered, setHovered] = useState(false)

  const bg = poste ? `${poste.color}15` : 'var(--accent-light)'
  const borderColor = poste?.color ?? 'var(--accent)'
  const textColor = poste?.color ?? 'var(--accent)'

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : { ...listeners, ...attributes })}
      onClick={e => { e.stopPropagation(); onClick() }}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: bg, borderLeft: `3px solid ${borderColor}`, borderRadius: '8px',
        padding: '8px 10px', minHeight: '52px', cursor: disabled ? 'pointer' : 'grab',
        opacity: isDragging ? 0.35 : 1, transform: CSS.Translate.toString(transform),
        transition: 'opacity 150ms, filter 150ms', userSelect: 'none',
        marginBottom: '4px', position: 'relative',
      }}
      className="hover:brightness-[0.96]"
    >
      {hasConflict && <AlertTriangle size={10} style={{ color: 'var(--warning)', marginBottom: '3px', display: 'block' }} />}
      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>
        {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
      </p>
      {shift.position && (
        <p style={{ fontSize: '12px', color: textColor, marginTop: '3px', lineHeight: 1 }}>{shift.position}</p>
      )}
      {hovered && !disabled && (
        <button
          onClick={e => { e.stopPropagation(); onSos() }}
          title="Signaler une absence imprévue"
          style={{
            position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px',
            borderRadius: '4px', backgroundColor: '#FEF3C7', border: '0.5px solid #F59E0B',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10,
          }}
        >
          <Zap size={11} style={{ color: '#D97706' }} />
        </button>
      )}
    </div>
  )
})
