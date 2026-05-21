'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Profile, type Shift } from '@/types'
import { toISODate } from '@/lib/utils/dates'

// Generate time options every 30 min
function generateTimeOptions(startHour: number, startMin: number, endHour: number, endMin: number): string[] {
  const options: string[] = []
  let h = startHour
  let m = startMin
  while (h < endHour || (h === endHour && m <= endMin)) {
    const hStr = String(h).padStart(2, '0')
    const mStr = String(m).padStart(2, '0')
    options.push(`${hStr}:${mStr}`)
    m += 30
    if (m >= 60) {
      m = 0
      h += 1
    }
  }
  return options
}

// 06:00 to 23:30 for start time
const START_TIME_OPTIONS = generateTimeOptions(6, 0, 23, 30)
// 06:30 to 00:00 for end time (midnight handled specially)
const END_TIME_OPTIONS = [...generateTimeOptions(6, 30, 23, 30), '00:00']

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
  | { type: 'view'; shift: Shift; employee: Profile; date: Date }

interface ShiftModalProps {
  modalState: ModalState
  onClose: () => void
}

export function ShiftModal({ modalState, onClose }: ShiftModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create mode form state
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [position, setPosition] = useState('')
  const [notes, setNotes] = useState('')

  const isOpen = modalState.type !== 'closed'

  // Reset form state when modal opens for creation
  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose()
      setError(null)
      setLoading(false)
    } else if (modalState.type === 'create') {
      setStartTime('09:00')
      setEndTime('17:00')
      setPosition(modalState.employee.position ?? '')
      setNotes('')
      setError(null)
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
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger id="start-time">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {START_TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* End time */}
            <div className="grid gap-1.5">
              <Label htmlFor="end-time">Heure de fin</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger id="end-time">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {END_TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position */}
            <div className="grid gap-1.5">
              <Label htmlFor="position">Poste</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder={employee.position ?? 'Ex : Serveur'}
              />
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

  // View mode
  const { shift } = modalState
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Créneau — {firstName} — {dayLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-2 text-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500">Heure de début</span>
            <span className="font-medium">{shift.start_time.slice(0, 5)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500">Heure de fin</span>
            <span className="font-medium">{shift.end_time.slice(0, 5)}</span>
          </div>
          {(shift.position || employee.position) && (
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">Poste</span>
              <span className="font-medium">{shift.position ?? employee.position}</span>
            </div>
          )}
          {shift.notes && (
            <div className="flex flex-col gap-1">
              <span className="text-gray-500">Notes</span>
              <p className="text-gray-800 bg-gray-50 rounded p-2">{shift.notes}</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Suppression...' : 'Supprimer'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
