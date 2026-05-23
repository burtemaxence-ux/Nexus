'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Check, X, Euro, Clock, Layers } from 'lucide-react'
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
  { value: '15', label: '15 min' },
  { value: '20', label: '20 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1h' },
]

function breakLabel(m: number) { return m === 0 ? '—' : m === 60 ? '1h' : `${m} min` }
function numLabel(v: number, u: string) { return !v || v === 0 ? '—' : `${v} ${u}` }

// ── Permissions ───────────────────────────────────────────────────────────────

const FEATURES = [
  { key: 'planning',   label: 'Planning' },
  { key: 'employees',  label: 'Employés' },
  { key: 'reports',    label: 'Rapports' },
  { key: 'settings',   label: 'Paramètres' },
] as const

type Feature = (typeof FEATURES)[number]['key']
type PermRow = Record<Feature, boolean>
type PermMatrix = { manager: PermRow; superviseur: PermRow; employe: PermRow }

const DEFAULT_PERMS: PermMatrix = {
  manager:     { planning: true,  employees: true,  reports: true,  settings: true  },
  superviseur: { planning: true,  employees: false, reports: false, settings: false },
  employe:     { planning: true,  employees: false, reports: false, settings: false },
}

const ROLE_LABELS: Record<keyof PermMatrix, string> = {
  manager: 'Manager', superviseur: 'Superviseur', employe: 'Employé',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PostesPage() {
  const router = useRouter()
  const [postes, setPostes] = useState<Poste[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add form
  const [showAddForm, setShowAddForm] = useState(false)
  const [addName, setAddName] = useState('')
  const [addColor, setAddColor] = useState('#3B82F6')
  const [addAutoBreak, setAddAutoBreak] = useState(false)
  const [addBreak, setAddBreak] = useState('30')
  const [addCost, setAddCost] = useState('')
  const [addMaxDay, setAddMaxDay] = useState('')
  const [addMaxWeek, setAddMaxWeek] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#3B82F6')
  const [editAutoBreak, setEditAutoBreak] = useState(false)
  const [editBreak, setEditBreak] = useState('30')
  const [editCost, setEditCost] = useState('')
  const [editMaxDay, setEditMaxDay] = useState('')
  const [editMaxWeek, setEditMaxWeek] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Permissions
  const [perms, setPerms] = useState<PermMatrix>(DEFAULT_PERMS)
  const [permsSaving, setPermsSaving] = useState(false)
  const [permsSaved, setPermsSaved] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPostes = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/postes')
      if (!res.ok) throw new Error('Erreur lors du chargement')
      setPostes(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchPostes()
    fetch('/api/settings')
      .then(r => r.json())
      .then((s: Record<string, string>) => {
        if (s.permissions_matrix) {
          try { setPerms(JSON.parse(s.permissions_matrix)) } catch { /* keep default */ }
        }
      })
      .catch(() => {})
  }, [fetchPostes])

  // ── Add ────────────────────────────────────────────────────────────────────

  function resetAdd() {
    setShowAddForm(false); setAddName(''); setAddColor('#3B82F6')
    setAddAutoBreak(false); setAddBreak('30'); setAddCost('')
    setAddMaxDay(''); setAddMaxWeek(''); setAddError(null)
  }

  async function handleAdd() {
    if (!addName.trim()) { setAddError('Le nom est requis'); return }
    setAddLoading(true); setAddError(null)
    try {
      const res = await fetch('/api/postes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(), color: addColor,
          break_minutes: addAutoBreak ? parseInt(addBreak, 10) : 0,
          hourly_cost: addCost ? parseFloat(addCost) : 0,
          max_hours_per_day: addMaxDay ? parseFloat(addMaxDay) : 0,
          max_hours_per_week: addMaxWeek ? parseFloat(addMaxWeek) : 0,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Erreur') }
      resetAdd(); await fetchPostes(); router.refresh()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally { setAddLoading(false) }
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  function startEdit(p: Poste) {
    setEditingId(p.id); setEditName(p.name); setEditColor(p.color)
    setEditAutoBreak(p.break_minutes > 0)
    setEditBreak(p.break_minutes > 0 ? String(p.break_minutes) : '30')
    setEditCost(p.hourly_cost ? String(p.hourly_cost) : '')
    setEditMaxDay(p.max_hours_per_day ? String(p.max_hours_per_day) : '')
    setEditMaxWeek(p.max_hours_per_week ? String(p.max_hours_per_week) : '')
    setEditError(null)
  }

  function cancelEdit() { setEditingId(null); setEditError(null) }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) { setEditError('Le nom est requis'); return }
    setEditLoading(true); setEditError(null)
    try {
      const res = await fetch(`/api/postes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(), color: editColor,
          break_minutes: editAutoBreak ? parseInt(editBreak, 10) : 0,
          hourly_cost: editCost ? parseFloat(editCost) : 0,
          max_hours_per_day: editMaxDay ? parseFloat(editMaxDay) : 0,
          max_hours_per_week: editMaxWeek ? parseFloat(editMaxWeek) : 0,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Erreur') }
      setEditingId(null); await fetchPostes(); router.refresh()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally { setEditLoading(false) }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeleteLoading(true); setDeleteError(null)
    try {
      const res = await fetch(`/api/postes/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Erreur') }
      setDeleteId(null); await fetchPostes(); router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally { setDeleteLoading(false) }
  }

  // ── Permissions ────────────────────────────────────────────────────────────

  function togglePerm(role: keyof PermMatrix, feat: Feature) {
    setPerms(prev => ({
      ...prev,
      [role]: { ...prev[role], [feat]: !prev[role][feat] },
    }))
  }

  async function savePerms() {
    setPermsSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions_matrix: JSON.stringify(perms) }),
    })
    if (res.ok) { setPermsSaved(true); setTimeout(() => setPermsSaved(false), 3000) }
    setPermsSaving(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Postes & rôles</h1>
          <p className="text-sm text-gray-500 mt-1">Postes de travail et permissions par rôle</p>
        </div>
        <Button onClick={() => { resetAdd(); setShowAddForm(true) }} className="gap-2" disabled={showAddForm}>
          <Plus className="h-4 w-4" />Ajouter un poste
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 mb-4 text-sm text-red-700">{error}</div>
      )}

      {/* ── Add form ─────────────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5 mb-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Nouveau poste</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Nom du poste</Label>
              <Input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Ex : Serveur" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Couleur planning</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={addColor} onChange={e => setAddColor(e.target.value)} className="h-8 w-12 rounded border border-input cursor-pointer p-0.5" />
                <span className="text-xs text-gray-400 font-mono">{addColor}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Pause auto</Label>
              <button
                onClick={() => setAddAutoBreak(v => !v)}
                className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${addAutoBreak ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                {addAutoBreak ? 'Oui' : 'Non'}
              </button>
            </div>
            {addAutoBreak && (
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Durée</Label>
                <Select value={addBreak} onValueChange={setAddBreak}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{BREAK_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Coût/h (€)</Label>
              <Input type="number" min="0" step="0.01" value={addCost} onChange={e => setAddCost(e.target.value)} placeholder="0.00" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Max h/jour</Label>
              <Input type="number" min="0" step="0.5" value={addMaxDay} onChange={e => setAddMaxDay(e.target.value)} placeholder="0" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Max h/sem</Label>
              <Input type="number" min="0" step="0.5" value={addMaxWeek} onChange={e => setAddMaxWeek(e.target.value)} placeholder="0" className="h-8 text-sm" />
            </div>
          </div>

          {addError && <p className="text-sm text-red-600 mb-3">{addError}</p>}
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={addLoading} size="sm">{addLoading ? 'Enregistrement...' : 'Enregistrer'}</Button>
            <Button variant="outline" size="sm" onClick={resetAdd} disabled={addLoading}>Annuler</Button>
          </div>
        </div>
      )}

      {/* ── Postes table ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-8">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Postes de travail</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Chargement…</div>
        ) : postes.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Aucun poste. Cliquez sur &ldquo;Ajouter un poste&rdquo; pour commencer.
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {['Poste', 'Pause', 'Coût/h', 'Max/j', 'Max/sem', ''].map(h => (
                  <th key={h} className={`px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide ${h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {postes.map(poste => (
                editingId === poste.id ? (
                  <tr key={poste.id} className="border-b border-gray-100 bg-blue-50/20">
                    <td colSpan={6} className="px-5 py-4">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <Label className="text-xs font-medium text-gray-600 mb-1 block">Nom</Label>
                          <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" />
                          {editError && <p className="text-xs text-red-600 mt-1">{editError}</p>}
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600 mb-1 block">Couleur</Label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="h-8 w-12 rounded border border-input cursor-pointer p-0.5" />
                            <span className="text-xs text-gray-400 font-mono">{editColor}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div>
                          <Label className="text-xs font-medium text-gray-600 mb-1 block">Pause auto</Label>
                          <button
                            onClick={() => setEditAutoBreak(v => !v)}
                            className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${editAutoBreak ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                          >
                            {editAutoBreak ? 'Oui' : 'Non'}
                          </button>
                        </div>
                        {editAutoBreak && (
                          <div>
                            <Label className="text-xs font-medium text-gray-600 mb-1 block">Durée</Label>
                            <Select value={editBreak} onValueChange={setEditBreak}>
                              <SelectTrigger className="h-8 text-sm w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>{BREAK_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <Label className="text-xs font-medium text-gray-600 mb-1 block">Coût/h (€)</Label>
                          <Input type="number" min="0" step="0.01" value={editCost} onChange={e => setEditCost(e.target.value)} placeholder="0.00" className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600 mb-1 block">Max h/jour</Label>
                          <Input type="number" min="0" step="0.5" value={editMaxDay} onChange={e => setEditMaxDay(e.target.value)} placeholder="0" className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600 mb-1 block">Max h/sem</Label>
                          <Input type="number" min="0" step="0.5" value={editMaxWeek} onChange={e => setEditMaxWeek(e.target.value)} placeholder="0" className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(poste.id)} disabled={editLoading} className="gap-1.5">
                          <Check className="h-3.5 w-3.5" />{editLoading ? 'Enregistrement…' : 'Enregistrer'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit} disabled={editLoading} className="gap-1.5">
                          <X className="h-3.5 w-3.5" />Annuler
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={poste.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: poste.color }} />
                        <span className="font-medium text-gray-900">{poste.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        {poste.break_minutes > 0 && <Clock className="h-3.5 w-3.5 text-gray-400" />}
                        <span>{breakLabel(poste.break_minutes)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        {poste.hourly_cost > 0 && <Euro className="h-3.5 w-3.5 text-gray-400" />}
                        <span>{numLabel(poste.hourly_cost, '€')}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{numLabel(poste.max_hours_per_day, 'h')}</td>
                    <td className="px-5 py-3 text-gray-600">{numLabel(poste.max_hours_per_week, 'h')}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100" onClick={() => startEdit(poste)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => { setDeleteId(poste.id); setDeleteError(null) }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Permissions ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Permissions par rôle</p>
          <p className="text-xs text-gray-500 mt-0.5">Définissez les accès de chaque rôle dans l&apos;application</p>
        </div>
        <div className="px-6 py-5">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 pr-6 font-medium text-gray-500 text-xs uppercase tracking-wide w-36">Rôle</th>
                {FEATURES.map(f => (
                  <th key={f.key} className="text-center py-2 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(Object.keys(ROLE_LABELS) as (keyof PermMatrix)[]).map(role => (
                <tr key={role}>
                  <td className="py-3 pr-6">
                    <span className="font-medium text-gray-800">{ROLE_LABELS[role]}</span>
                    {role === 'employe' && (
                      <span className="ml-2 text-[10px] text-gray-400">planning personnel uniquement</span>
                    )}
                  </td>
                  {FEATURES.map(f => (
                    <td key={f.key} className="py-3 px-4 text-center">
                      {role === 'manager' ? (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 text-emerald-600">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : (
                        <button
                          onClick={() => togglePerm(role, f.key)}
                          className={`inline-flex items-center justify-center h-5 w-5 rounded-full transition-colors ${
                            perms[role][f.key]
                              ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {perms[role][f.key] ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <Button size="sm" onClick={savePerms} disabled={permsSaving} className="gap-2">
            {permsSaving ? 'Enregistrement…' : permsSaved ? 'Enregistré !' : 'Enregistrer les permissions'}
          </Button>
        </div>
      </div>

      {/* ── Delete dialog ─────────────────────────────────────────────────── */}
      <Dialog open={deleteId !== null} onOpenChange={open => { if (!open) setDeleteId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Supprimer ce poste ?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">
            Cette action est irréversible. Les créneaux utilisant ce poste ne seront plus liés à lui.
          </p>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteLoading}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} disabled={deleteLoading}>
              {deleteLoading ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
