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
import { type Violation, type ComplianceConfig, RULES } from '@/lib/compliance/rules'
import {
  DEFAULT_RULES,
  parseRules,
  type PlanningRules,
  computeDurationWarnings,
  computeComplianceViolations,
  breakOptions,
  calcDurationMinutes,
} from '@/lib/planning/shift-form'


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

// ---- Shared shift form ----
interface ShiftFormState {
  startTime: string
  endTime: string
  position: string
  posteId: string
  breakMinutes: string
  notes: string
}

const EMPTY_FORM: ShiftFormState = {
  startTime: '09:00',
  endTime: '17:00',
  position: '',
  posteId: 'none',
  breakMinutes: '0',
  notes: '',
}

// Form fields shared by the create and edit modes (previously duplicated JSX).
function ShiftFields({
  form,
  onChange,
  postes,
  positionPlaceholder,
  warnings,
  violations,
  idPrefix,
}: {
  form: ShiftFormState
  onChange: <K extends keyof ShiftFormState>(key: K, value: ShiftFormState[K]) => void
  postes: Poste[]
  positionPlaceholder?: string
  warnings: string[]
  violations: Violation[]
  idPrefix: string
}) {
  return (
    <div className="grid gap-4 py-2">
      {/* Start time */}
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-start-time`}>Heure de début</Label>
        <Input
          id={`${idPrefix}-start-time`}
          type="time"
          value={form.startTime}
          onChange={(e) => onChange('startTime', e.target.value)}
        />
      </div>

      {/* End time */}
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-end-time`}>Heure de fin</Label>
        <Input
          id={`${idPrefix}-end-time`}
          type="time"
          value={form.endTime}
          onChange={(e) => onChange('endTime', e.target.value)}
        />
      </div>

      {/* Poste officiel */}
      <div className="grid gap-1.5">
        <Label>Poste</Label>
        <Select value={form.posteId} onValueChange={(val) => {
          onChange('posteId', val)
          const poste = postes.find(p => p.id === val)
          if (poste) onChange('position', poste.name)
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
        <Label htmlFor={`${idPrefix}-position`}>Intitulé du poste (libre)</Label>
        <Input
          id={`${idPrefix}-position`}
          value={form.position}
          onChange={(e) => onChange('position', e.target.value)}
          placeholder={positionPlaceholder ?? 'Ex : Serveur'}
        />
      </div>

      {/* Pause */}
      <div className="grid gap-1.5">
        <Label>Pause</Label>
        <Select value={form.breakMinutes} onValueChange={(val) => onChange('breakMinutes', val)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {breakOptions(form.breakMinutes).map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>Notes (optionnel)</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={form.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Informations supplémentaires..."
          rows={3}
        />
      </div>

      {/* Règles warnings (durée établissement) */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
              style={{ backgroundColor: '#FEF3C7', border: '0.5px solid #D97706' }}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: '#D97706' }} />
              <p className="text-[12px] leading-snug" style={{ color: '#92400E' }}>{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alertes légales Code du travail */}
      {violations.length > 0 && (
        <div className="space-y-1.5">
          {violations.map((v, i) => {
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
    </div>
  )
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
  complianceConfig?: ComplianceConfig
}

export function ShiftModal({ modalState, onClose, postes, employees, weekDates, shifts = [], complianceConfig }: ShiftModalProps) {
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

  // Single form state, shared by create and edit modes.
  const [form, setForm] = useState<ShiftFormState>(EMPTY_FORM)
  const [isEditing, setIsEditing] = useState(false)

  function setField<K extends keyof ShiftFormState>(key: K, value: ShiftFormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // Copy dialog state
  const [showCopyDialog, setShowCopyDialog] = useState(false)
  const [copyTargetEmployeeId, setCopyTargetEmployeeId] = useState<string>('')
  const [copyTargetDate, setCopyTargetDate] = useState<string>('')
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  const isOpen = modalState.type !== 'closed'

  // Apply the poste's standard break when a poste is selected.
  useEffect(() => {
    const selectedPoste = form.posteId !== 'none' ? postes.find(p => p.id === form.posteId) : null
    if (selectedPoste && selectedPoste.break_minutes > 0) {
      setField('breakMinutes', String(selectedPoste.break_minutes))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.posteId])

  // Suggest a 30 min break past the 6h legal trigger, without overwriting a
  // value the manager has already set.
  useEffect(() => {
    if (calcDurationMinutes(form.startTime, form.endTime) > 360 && form.breakMinutes === '0') {
      setField('breakMinutes', '30')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startTime, form.endTime])

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose()
      setError(null)
      setLoading(false)
      setIsEditing(false)
      setShowCopyDialog(false)
      setCopyError(null)
    } else if (modalState.type === 'create') {
      setForm({ ...EMPTY_FORM, position: modalState.employee.position ?? '' })
      setError(null)
    }
  }

  function handleStartEdit() {
    if (modalState.type !== 'view') return
    const { shift, employee } = modalState
    setForm({
      startTime: shift.start_time.slice(0, 5),
      endTime: shift.end_time.slice(0, 5),
      position: shift.position ?? employee.position ?? '',
      posteId: shift.poste_id ?? 'none',
      breakMinutes: String(shift.break_minutes ?? 0),
      notes: shift.notes ?? '',
    })
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
          start_time: form.startTime,
          end_time: form.endTime,
          position: form.position || modalState.employee.position || '',
          poste_id: form.posteId !== 'none' ? form.posteId : null,
          break_minutes: parseInt(form.breakMinutes, 10),
          notes: form.notes || undefined,
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
          start_time: form.startTime,
          end_time: form.endTime,
          position: form.position,
          poste_id: form.posteId !== 'none' ? form.posteId : null,
          break_minutes: parseInt(form.breakMinutes, 10),
          notes: form.notes,
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

  // Reactive warnings + legal violations for whichever form is being edited.
  const formWarnings = useMemo(() => {
    if (modalState.type === 'create' || (modalState.type === 'view' && isEditing)) {
      return computeDurationWarnings(form.startTime, form.endTime, parseInt(form.breakMinutes, 10), rules)
    }
    return []
  }, [form, rules, modalState, isEditing])

  const formViolations = useMemo<Violation[]>(() => {
    const meta = modalState.type !== 'closed'
      ? {
          id: modalState.employee.id,
          birthDate: modalState.employee.birth_date ?? null,
          contractType: modalState.employee.contract_type ?? null,
          weeklyHours: modalState.employee.weekly_hours ?? null,
        }
      : undefined
    if (modalState.type === 'create') {
      return computeComplianceViolations(
        form.startTime, form.endTime, parseInt(form.breakMinutes, 10),
        modalState.employee.id, modalState.date, shifts, undefined, meta, complianceConfig,
      )
    }
    if (modalState.type === 'view' && isEditing) {
      return computeComplianceViolations(
        form.startTime, form.endTime, parseInt(form.breakMinutes, 10),
        modalState.employee.id, modalState.date, shifts, modalState.shift.id, meta, complianceConfig,
      )
    }
    return []
  }, [form, modalState, isEditing, shifts, complianceConfig])

  if (modalState.type === 'closed') {
    return null
  }

  const { employee, date } = modalState
  const firstName = getFirstName(employee.full_name, employee.email)
  const dayLabel = formatDayFR(date)
  const positionPlaceholder = employee.position ?? 'Ex : Serveur'

  // ── Create mode ───────────────────────────────────────────────────────────
  if (modalState.type === 'create') {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Ajouter un créneau — {firstName} — {dayLabel}
            </DialogTitle>
          </DialogHeader>

          <ShiftFields
            form={form}
            onChange={setField}
            postes={postes}
            positionPlaceholder={positionPlaceholder}
            warnings={formWarnings}
            violations={formViolations}
            idPrefix="create"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
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

  // ── Edit mode ─────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Modifier le créneau — {firstName} — {dayLabel}
            </DialogTitle>
          </DialogHeader>

          <ShiftFields
            form={form}
            onChange={setField}
            postes={postes}
            positionPlaceholder={positionPlaceholder}
            warnings={formWarnings}
            violations={formViolations}
            idPrefix="edit"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelEdit} disabled={loading}>
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

  // ── View mode ─────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open={isOpen && !showCopyDialog} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] overflow-x-hidden">
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
