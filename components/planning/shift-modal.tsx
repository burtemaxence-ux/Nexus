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
import { type Profile, type Shift } from '@/types'
import { toISODate } from '@/lib/utils/dates'


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

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editStartTime, setEditStartTime] = useState('09:00')
  const [editEndTime, setEditEndTime] = useState('17:00')
  const [editPosition, setEditPosition] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const isOpen = modalState.type !== 'closed'

  // Reset form state when modal opens for creation
  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose()
      setError(null)
      setLoading(false)
      setIsEditing(false)
    } else if (modalState.type === 'create') {
      setStartTime('09:00')
      setEndTime('17:00')
      setPosition(modalState.employee.position ?? '')
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
    setEditNotes(shift.notes ?? '')
    setError(null)
    setIsEditing(true)
  }

  function handleCancelEdit() {
    setIsEditing(false)
    setError(null)
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

  // View / Edit mode
  const { shift } = modalState

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

            {/* Position */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-position">Poste</Label>
              <Input
                id="edit-position"
                value={editPosition}
                onChange={(e) => setEditPosition(e.target.value)}
                placeholder={employee.position ?? 'Ex : Serveur'}
              />
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
          <Button
            variant="outline"
            onClick={handleStartEdit}
            disabled={loading}
          >
            Modifier
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
