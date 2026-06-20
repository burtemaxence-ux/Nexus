'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type Profile, type Shift, type Poste } from '@/types'
import { toISODate } from '@/lib/utils/dates'
import { checkCompliance, type ShiftRecord, type Violation, RULES } from '@/lib/compliance/rules'

// ── Planning rules ────────────────────────────────────────────────────────────

// Establishment-configurable shift duration bounds only. Break (break_missing)
// and daily rest (rest_daily) are judged authoritatively by checkCompliance
// against the legal thresholds, so they are no longer duplicated here.
interface PlanningRules {
  minShiftMinutes: number
  maxShiftMinutes: number
}

const DEFAULT_RULES: PlanningRules = {
  minShiftMinutes: 30,
  maxShiftMinutes: 600,
}

function parseRules(data: Record<string, string>): PlanningRules {
  return {
    minShiftMinutes: parseInt(data.min_shift_duration ?? '30', 10),
    maxShiftMinutes: parseInt(data.max_shift_duration ?? '600', 10),
  }
}

function fmtMins(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return min > 0 ? `${h}h${String(min).padStart(2, '0')}` : `${h}h`
}

function computeDurationWarnings(
  startTime: string,
  endTime: string,
  breakMins: number,
  rules: PlanningRules,
): string[] {
  const warnings: string[] = []
  const netDuration = calcDurationMinutes(startTime, endTime) - breakMins

  if (netDuration > 0 && netDuration < rules.minShiftMinutes) {
    warnings.push(`Créneau trop court — minimum requis : ${fmtMins(rules.minShiftMinutes)}`)
  }
  if (netDuration > rules.maxShiftMinutes) {
    warnings.push(`Créneau trop long — maximum autorisé : ${fmtMins(rules.maxShiftMinutes)}`)
  }
  return warnings
}

function computeComplianceViolations(
  startTime: string,
  endTime: string,
  breakMins: number,
  employeeId: string,
  date: Date,
  allShifts: Shift[],
  excludeShiftId?: string,
): Violation[] {
  const dateStr = toISODate(date)

  const existing: ShiftRecord[] = allShifts
    .filter(s => s.employee_id === employeeId && s.id !== (excludeShiftId ?? ''))
    .map(s => ({
      id: s.id,
      employeeId: s.employee_id,
      date: s.date,
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time.slice(0, 5),
      breakMinutes: s.break_minutes,
    }))

  const proposed: ShiftRecord = {
    id: 'proposed',
    employeeId,
    date: dateStr,
    startTime,
    endTime,
    breakMinutes: breakMins,
  }

  const baseline = checkCompliance(existing)
  const withProposed = checkCompliance([...existing, proposed])

  return withProposed.filter(v =>
    !baseline.some(b => b.ruleId === v.ruleId && b.employeeId === v.employeeId && b.date === v.date)
  )
}

const BREAK_OPTIONS = [
  { value: '0', label: 'Aucune' },
  { value: '15', label: '15 min' },
  { value: '20', label: '20 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1h' },
]

// Ensure the currently-selected break value (e.g. a poste's custom break_minutes
// like 25) always has a matching option, otherwise the Select renders empty.
function breakOptions(current: string) {
  if (BREAK_OPTIONS.some(o => o.value === current)) return BREAK_OPTIONS
  return [...BREAK_OPTIONS, { value: current, label: `${current} min` }]
    .sort((a, b) => Number(a.value) - Number(b.value))
}

function calcDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let minutes = (eh * 60 + em) - (sh * 60 + sm)
  if (minutes < 0) minutes += 24 * 60
  return minutes
}


function formatDayFR(date: Date): string {
  const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' })
  const day = date.getDate()
  const month = date.toLocaleDateString('fr-FR', { month: 'long' })
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day} ${month}`
}

function getFirstName(fullName: string | null, email: string): string {
  if (!fullName) return email.split('@')[0]
  return fullName.split(' ')[0]
}

// ---- Modal state types ----
export type ModalState =
  | { type: 'closed' }
  | { type: 'create'; employee: Profile; date: Date }
  | { type: 'view'; shift: Shift; employee: Profile; date: Date; readOnly?: boolean }

interface ShiftModalProps {
  modalState: ModalState
  onClose: () => void
  postes: Poste[]
  employees: Profile[]
  weekDates: Date[]
  shifts?: Shift[]
}

export function ShiftModal({ modalState, onClose, postes, employees, weekDates, shifts = [] }: ShiftModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rules, setRules] = useState<PlanningRules>(DEFAULT_RULES)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => setRules(parseRules(data)))
      .catch(() => { /* keep defaults */ })
  }, [])

  // Create mode form state
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [position, setPosition] = useState('')
  const [posteId, setPosteId] = useState<string>('none')
  const [breakMinutes, setBreakMinutes] = useState('0')
  const [notes, setNotes] = useState('')

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editStartTime, setEditStartTime] = useState('09:00')
  const [editEndTime, setEditEndTime] = useState('17:00')
  const [editPosition, setEditPosition] = useState('')
  const [editPosteId, setEditPosteId] = useState<string>('none')
  const [editBreakMinutes, setEditBreakMinutes] = useState('0')
  const [editNotes, setEditNotes] = useState('')

  // Copy dialog state
  const [showCopyDialog, setShowCopyDialog] = useState(false)
  const [copyTargetEmployeeId, setCopyTargetEmployeeId] = useState<string>('')
  const [copyTargetDate, setCopyTargetDate] = useState<string>('')
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  const isOpen = modalState.type !== 'closed'

  // Create mode — apply the poste's standard break when a poste is selected.
  useEffect(() => {
    const selectedPoste = posteId !== 'none' ? postes.find(p => p.id === posteId) : null
    if (selectedPoste && selectedPoste.break_minutes > 0) {
      setBreakMinutes(String(selectedPoste.break_minutes))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posteId])

  // Create mode — suggest a 30 min break past the 6h legal trigger, without
  // overwriting a value the manager has already set.
  useEffect(() => {
    if (calcDurationMinutes(startTime, endTime) > 360 && breakMinutes === '0') {
      setBreakMinutes('30')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime])

  // Edit mode — apply the poste's standard break when a poste is selected.
  useEffect(() => {
    const selectedPoste = editPosteId !== 'none' ? postes.find(p => p.id === editPosteId) : null
    if (selectedPoste && selectedPoste.break_minutes > 0) {
      setEditBreakMinutes(String(selectedPoste.break_minutes))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPosteId])

  // Edit mode — suggest a 30 min break past the 6h legal trigger.
  useEffect(() => {
    if (calcDurationMinutes(editStartTime, editEndTime) > 360 && editBreakMinutes === '0') {
      setEditBreakMinutes('30')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editStartTime, editEndTime])

  // Reset form state when modal opens for creation
  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose()
      setError(null)
      setLoading(false)
      setIsEditing(false)
      setShowCopyDialog(false)
      setCopyError(null)
    } else if (modalState.type === 'create') {
      setStartTime('09:00')
      setEndTime('17:00')
      setPosition(modalState.employee.position ?? '')
      setPosteId('none')
      setBreakMinutes('0')
      setNotes('')
      setError(null)
    }
  }

  function handleStartEdit() {
    if (modalState.type !== 'view') return
    const { shift, employee } = modalState
    setEditStartTime(shift.start_time.slice(0, 5))
    setEditEndTime(shift.end_time.slice(0, 5))
    setEditPosition(shift.position ?? employee.position ?? '')
    setEditPosteId(shift.poste_id ?? 'none')
    setEditBreakMinutes(String(shift.break_minutes ?? 0))
    setEditNotes(shift.notes ?? '')
    setError(null)
    setIsEditing(true)
  }

  function handleCancelEdit() {
    setIsEditing(false)
    setError(null)
  }

  function handleOpenCopyDialog() {
    if (modalState.type !== 'view') return
    // Pre-select current employee and date
    setCopyTargetEmployeeId(modalState.employee.id)
    setCopyTargetDate(weekDates.length > 0 ? toISODate(weekDates[0]) : '')
    setCopyError(null)
    setShowCopyDialog(true)
  }

  async function handleCopyShift() {
    if (modalState.type !== 'view') return
    if (!copyTargetEmployeeId || !copyTargetDate) {
      setCopyError('Veuillez choisir un employé et un jour cible')
      return
    }

    setCopyLoading(true)
    setCopyError(null)

    try {
      const { shift } = modalState
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: copyTargetEmployeeId,
          date: copyTargetDate,
          start_time: shift.start_time.slice(0, 5),
          end_time: shift.end_time.slice(0, 5),
          position: shift.position,
          poste_id: shift.poste_id,
          break_minutes: shift.break_minutes,
          notes: shift.notes,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Erreur lors de la copie')
      }

      setShowCopyDialog(false)
      onClose()
      router.refresh()
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setCopyLoading(false)
    }
  }

  async function handleCreate() {
    if (modalState.type !== 'create') return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: modalState.employee.id,
          date: toISODate(modalState.date),
          start_time: startTime,
          end_time: endTime,
          position: position || modalState.employee.position || '',
          poste_id: posteId !== 'none' ? posteId : null,
          break_minutes: parseInt(breakMinutes, 10),
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Erreur lors de la création')
      }

      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveEdit() {
    if (modalState.type !== 'view') return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/shifts/${modalState.shift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: editStartTime,
          end_time: editEndTime,
          position: editPosition,
          poste_id: editPosteId !== 'none' ? editPosteId : null,
          break_minutes: parseInt(editBreakMinutes, 10),
          notes: editNotes,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Erreur lors de la modification')
      }

      setIsEditing(false)
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (modalState.type !== 'view') return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/shifts/${modalState.shift.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Erreur lors de la suppression')
      }

      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Reactive warnings for create mode
  const createWarnings = useMemo(() => {
    if (modalState.type !== 'create') return []
    return computeDurationWarnings(startTime, endTime, parseInt(breakMinutes, 10), rules)
  }, [startTime, endTime, breakMinutes, rules, modalState])

  const createComplianceViolations = useMemo<Violation[]>(() => {
    if (modalState.type !== 'create') return []
    return computeComplianceViolations(
      startTime, endTime, parseInt(breakMinutes, 10),
      modalState.employee.id, modalState.date, shifts,
    )
  }, [startTime, endTime, breakMinutes, modalState, shifts])

  // Reactive warnings for edit mode
  const editWarnings = useMemo(() => {
    if (modalState.type !== 'view' || !isEditing) return []
    return computeDurationWarnings(editStartTime, editEndTime, parseInt(editBreakMinutes, 10), rules)
  }, [editStartTime, editEndTime, editBreakMinutes, rules, modalState, isEditing])

  const editComplianceViolations = useMemo<Violation[]>(() => {
    if (modalState.type !== 'view' || !isEditing) return []
    return computeComplianceViolations(
      editStartTime, editEndTime, parseInt(editBreakMinutes, 10),
      modalState.employee.id, modalState.date, shifts,
      modalState.shift.id,
    )
  }, [editStartTime, editEndTime, editBreakMinutes, modalState, isEditing, shifts])

  if (modalState.type === 'closed') {
    return null
  }

  const { employee, date } = modalState
  const firstName = getFirstName(employee.full_name, employee.email)
  const dayLabel = formatDayFR(date)

  if (modalState.type === 'create') {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Ajouter un créneau — {firstName} — {dayLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Start time */}
            <div className="grid gap-1.5">
              <Label htmlFor="start-time">Heure de début</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            {/* End time */}
            <div className="grid gap-1.5">
              <Label htmlFor="end-time">Heure de fin</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            {/* Poste officiel */}
            <div className="grid gap-1.5">
              <Label>Poste</Label>
              <Select value={posteId} onValueChange={(val) => {
                setPosteId(val)
                const poste = postes.find(p => p.id === val)
                if (poste) setPosition(poste.name)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un poste..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun poste officiel —</SelectItem>
                  {postes.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position texte */}
            <div className="grid gap-1.5">
              <Label htmlFor="position">Intitulé du poste (libre)</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder={employee.position ?? 'Ex : Serveur'}
              />
            </div>

            {/* Pause */}
            <div className="grid gap-1.5">
              <Label>Pause</Label>
              <Select value={breakMinutes} onValueChange={setBreakMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {breakOptions(breakMinutes).map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations supplémentaires..."
                rows={3}
              />
            </div>

            {/* Règles warnings */}
            {createWarnings.length > 0 && (
              <div className="space-y-1.5">
                {createWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                    style={{ backgroundColor: '#FEF3C7', border: '0.5px solid #D97706' }}>
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                    <p className="text-[12px] leading-snug" style={{ color: '#92400E' }}>{w}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Alertes légales Code du travail */}
            {createComplianceViolations.length > 0 && (
              <div className="space-y-1.5">
                {createComplianceViolations.map((v, i) => {
                  const rule = RULES[v.ruleId]
                  const isCritical = rule.severity === 'critical'
                  return (
                    <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                      style={{
                        backgroundColor: isCritical ? '#FEE2E2' : '#FEF3C7',
                        border: `0.5px solid ${isCritical ? '#dc2626' : '#D97706'}`,
                      }}>
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: isCritical ? '#dc2626' : '#D97706' }} />
                      <div>
                        <p className="text-[12px] font-medium leading-snug" style={{ color: isCritical ? '#991b1b' : '#92400E' }}>
                          {rule.name}
                        </p>
                        <p className="text-[11px] leading-snug mt-0.5" style={{ color: isCritical ? '#b91c1c' : '#a16207' }}>
                          {v.description} — <span className="font-medium">{rule.legalRef}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Enregistrement...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // View / Edit mode
  const { shift } = modalState
  const isReadOnly = modalState.readOnly === true

  if (isEditing) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Modifier le créneau — {firstName} — {dayLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Start time */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-start-time">Heure de début</Label>
              <Input
                id="edit-start-time"
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
              />
            </div>

            {/* End time */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-end-time">Heure de fin</Label>
              <Input
                id="edit-end-time"
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
              />
            </div>

            {/* Poste officiel */}
            <div className="grid gap-1.5">
              <Label>Poste</Label>
              <Select value={editPosteId} onValueChange={(val) => {
                setEditPosteId(val)
                const poste = postes.find(p => p.id === val)
                if (poste) setEditPosition(poste.name)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un poste..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun poste officiel —</SelectItem>
                  {postes.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position texte */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-position">Intitulé du poste (libre)</Label>
              <Input
                id="edit-position"
                value={editPosition}
                onChange={(e) => setEditPosition(e.target.value)}
                placeholder={employee.position ?? 'Ex : Serveur'}
              />
            </div>

            {/* Pause */}
            <div className="grid gap-1.5">
              <Label>Pause</Label>
              <Select value={editBreakMinutes} onValueChange={setEditBreakMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {breakOptions(editBreakMinutes).map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-notes">Notes (optionnel)</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Informations supplémentaires..."
                rows={3}
              />
            </div>

            {/* Règles warnings */}
            {editWarnings.length > 0 && (
              <div className="space-y-1.5">
                {editWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                    style={{ backgroundColor: '#FEF3C7', border: '0.5px solid #D97706' }}>
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                    <p className="text-[12px] leading-snug" style={{ color: '#92400E' }}>{w}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Alertes légales Code du travail */}
            {editComplianceViolations.length > 0 && (
              <div className="space-y-1.5">
                {editComplianceViolations.map((v, i) => {
                  const rule = RULES[v.ruleId]
                  const isCritical = rule.severity === 'critical'
                  return (
                    <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                      style={{
                        backgroundColor: isCritical ? '#FEE2E2' : '#FEF3C7',
                        border: `0.5px solid ${isCritical ? '#dc2626' : '#D97706'}`,
                      }}>
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: isCritical ? '#dc2626' : '#D97706' }} />
                      <div>
                        <p className="text-[12px] font-medium leading-snug" style={{ color: isCritical ? '#991b1b' : '#92400E' }}>
                          {rule.name}
                        </p>
                        <p className="text-[11px] leading-snug mt-0.5" style={{ color: isCritical ? '#b91c1c' : '#a16207' }}>
                          {v.description} — <span className="font-medium">{rule.legalRef}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // View mode
  return (
    <>
      <Dialog open={isOpen && !showCopyDialog} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="leading-snug pr-6">
              Créneau — {firstName} — {dayLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="w-full grid gap-3 py-2 text-sm">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2A2D3A] pb-2 gap-4">
              <span className="text-gray-500 dark:text-[#8B90A7] shrink-0">Heure de début</span>
              <span className="font-medium">{shift.start_time.slice(0, 5)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2A2D3A] pb-2 gap-4">
              <span className="text-gray-500 dark:text-[#8B90A7] shrink-0">Heure de fin</span>
              <span className="font-medium">{shift.end_time.slice(0, 5)}</span>
            </div>
            {shift.poste_id && (() => {
              const poste = postes.find(p => p.id === shift.poste_id)
              return poste ? (
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2A2D3A] pb-2 gap-4">
                  <span className="text-gray-500 dark:text-[#8B90A7] shrink-0">Poste</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: poste.color }} />
                    <span className="font-medium truncate">{poste.name}</span>
                  </div>
                </div>
              ) : null
            })()}
            {(shift.position || employee.position) && (
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2A2D3A] pb-2 gap-4">
                <span className="text-gray-500 dark:text-[#8B90A7] shrink-0">Intitulé</span>
                <span className="font-medium truncate">{shift.position ?? employee.position}</span>
              </div>
            )}
            {shift.break_minutes > 0 && (
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2A2D3A] pb-2 gap-4">
                <span className="text-gray-500 dark:text-[#8B90A7] shrink-0">Pause</span>
                <span className="font-medium">
                  {shift.break_minutes === 60 ? '1h' : `${shift.break_minutes} min`}
                </span>
              </div>
            )}
            {shift.notes && (
              <div className="flex flex-col gap-1">
                <span className="text-gray-500 dark:text-[#8B90A7]">Notes</span>
                <p className="text-gray-800 dark:text-[#F0F2F8] bg-gray-50 dark:bg-[#1A1D27] rounded p-2 break-words">{shift.notes}</p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <DialogFooter className="flex-wrap gap-2 sm:justify-end">
            {!isReadOnly && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? 'Suppression...' : 'Supprimer'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStartEdit}
                  disabled={loading}
                >
                  Modifier
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={handleOpenCopyDialog}
              disabled={loading}
            >
              Copier vers...
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy shift dialog */}
      <Dialog open={showCopyDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCopyDialog(false)
          setCopyError(null)
        }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Copier le créneau vers...</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Target employee */}
            <div className="grid gap-1.5">
              <Label>Employé cible</Label>
              <Select value={copyTargetEmployeeId} onValueChange={setCopyTargetEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un employé..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name ?? emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target day */}
            <div className="grid gap-1.5">
              <Label>Jour cible</Label>
              <Select value={copyTargetDate} onValueChange={setCopyTargetDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un jour..." />
                </SelectTrigger>
                <SelectContent>
                  {weekDates.map(d => {
                    const dateStr = toISODate(d)
                    const label = d.toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                    return (
                      <SelectItem key={dateStr} value={dateStr}>
                        {label.charAt(0).toUpperCase() + label.slice(1)}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {copyError && (
              <p className="text-sm text-red-600">{copyError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCopyDialog(false)
                setCopyError(null)
              }}
              disabled={copyLoading}
            >
              Annuler
            </Button>
            <Button onClick={handleCopyShift} disabled={copyLoading}>
              {copyLoading ? 'Copie...' : 'Copier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
