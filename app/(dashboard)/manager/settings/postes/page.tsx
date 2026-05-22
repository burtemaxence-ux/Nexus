'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Poste } from '@/types'

const BREAK_OPTIONS = [
  { value: '0', label: 'Aucune' },
  { value: '15', label: '15 min' },
  { value: '20', label: '20 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1h' },
]

function breakLabel(minutes: number): string {
  if (minutes === 0) return 'Aucune'
  if (minutes === 60) return '1h'
  return `${minutes} min`
}

export default function PostesPage() {
  const router = useRouter()
  const [postes, setPostes] = useState<Poste[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addName, setAddName] = useState('')
  const [addColor, setAddColor] = useState('#3B82F6')
  const [addBreak, setAddBreak] = useState('0')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#3B82F6')
  const [editBreak, setEditBreak] = useState('0')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete confirm dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchPostes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/postes')
      if (!res.ok) throw new Error('Erreur lors du chargement des postes')
      const data = await res.json()
      setPostes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPostes()
  }, [fetchPostes])

  async function handleAdd() {
    if (!addName.trim()) {
      setAddError('Le nom est requis')
      return
    }
    setAddLoading(true)
    setAddError(null)
    try {
      const res = await fetch('/api/postes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          color: addColor,
          break_minutes: parseInt(addBreak, 10),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erreur lors de la création')
      }
      setShowAddForm(false)
      setAddName('')
      setAddColor('#3B82F6')
      setAddBreak('0')
      await fetchPostes()
      router.refresh()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setAddLoading(false)
    }
  }

  function startEdit(poste: Poste) {
    setEditingId(poste.id)
    setEditName(poste.name)
    setEditColor(poste.color)
    setEditBreak(String(poste.break_minutes))
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) {
      setEditError('Le nom est requis')
      return
    }
    setEditLoading(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/postes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          color: editColor,
          break_minutes: parseInt(editBreak, 10),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erreur lors de la modification')
      }
      setEditingId(null)
      await fetchPostes()
      router.refresh()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/postes/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erreur lors de la suppression')
      }
      setDeleteId(null)
      await fetchPostes()
      router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/manager"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Tableau de bord
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres — Postes</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Gérez les postes de votre établissement et leurs couleurs d&apos;affichage
          </p>
        </div>
        <Button
          onClick={() => {
            setShowAddForm(true)
            setAddName('')
            setAddColor('#3B82F6')
            setAddBreak('0')
            setAddError(null)
          }}
          className="gap-2"
          disabled={showAddForm}
        >
          <Plus className="h-4 w-4" />
          Ajouter un poste
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Nouveau poste</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="add-name">Nom</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Ex : Serveur"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-color">Couleur</Label>
              <div className="flex items-center gap-2">
                <input
                  id="add-color"
                  type="color"
                  value={addColor}
                  onChange={(e) => setAddColor(e.target.value)}
                  className="h-9 w-12 rounded border border-input cursor-pointer p-0.5"
                />
                <span className="text-xs text-gray-500 font-mono">{addColor}</span>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-break">Pause</Label>
              <Select value={addBreak} onValueChange={setAddBreak}>
                <SelectTrigger id="add-break">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BREAK_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {addError && (
            <p className="text-sm text-red-600 mt-2">{addError}</p>
          )}
          <div className="flex gap-2 mt-3">
            <Button onClick={handleAdd} disabled={addLoading} size="sm">
              {addLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false)
                setAddError(null)
              }}
              disabled={addLoading}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Postes list */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Chargement des postes...
          </div>
        ) : postes.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Aucun poste créé. Créez votre premier poste pour organiser votre planning.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Poste</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Couleur</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Pause</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {postes.map((poste, index) => (
                <tr
                  key={poste.id}
                  className={`border-b border-gray-100 last:border-b-0 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                >
                  {editingId === poste.id ? (
                    /* Edit row */
                    <>
                      <td className="px-4 py-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Nom du poste"
                        />
                        {editError && (
                          <p className="text-xs text-red-600 mt-1">{editError}</p>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="h-8 w-10 rounded border border-input cursor-pointer p-0.5"
                          />
                          <span className="text-xs text-gray-500 font-mono">{editColor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Select value={editBreak} onValueChange={setEditBreak}>
                          <SelectTrigger className="h-8 text-sm w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BREAK_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleSaveEdit(poste.id)}
                            disabled={editLoading}
                            title="Enregistrer"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                            onClick={cancelEdit}
                            disabled={editLoading}
                            title="Annuler"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    /* View row */
                    <>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-3.5 w-3.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: poste.color }}
                          />
                          <span className="text-sm font-medium text-gray-900">{poste.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-gray-500">{poste.color}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{breakLabel(poste.break_minutes)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            onClick={() => startEdit(poste)}
                            title="Modifier"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setDeleteId(poste.id)
                              setDeleteError(null)
                            }}
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer ce poste ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Cette action est irréversible. Les créneaux utilisant ce poste ne seront plus liés à lui.
          </p>
          {deleteError && (
            <p className="text-sm text-red-600">{deleteError}</p>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={deleteLoading}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
