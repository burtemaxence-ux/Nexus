'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Props {
  employee: {
    id: string
    full_name: string | null
    email: string | null
    position: string | null
  }
  onDeleted?: () => void
}

export default function DeleteEmployeeButton({ employee, onDeleted }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/employees/${employee.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erreur lors de la suppression')
      setLoading(false)
      return
    }
    setLoading(false)
    setOpen(false)
    if (onDeleted) onDeleted()
    else router.refresh()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="hover:opacity-80"
        style={{ color: 'var(--danger)' }}
        onClick={() => { setError(null); setOpen(true) }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer cet employé ?</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg p-3 text-sm space-y-1" style={{ backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)', color: 'var(--text-primary)' }}>
              <p><span className="font-medium">Nom :</span> {employee.full_name ?? '—'}</p>
              <p><span className="font-medium">Email :</span> {employee.email ?? '—'}</p>
              {employee.position && (
                <p><span className="font-medium">Poste :</span> {employee.position}</p>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Son compte, ses horaires et ses congés seront définitivement supprimés. Cette action est irréversible.
            </p>
            {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
