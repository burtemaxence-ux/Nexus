'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Check, X, Euro, Clock, Layers,
  ShieldCheck, UserPlus, ChevronDown, ChevronRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Poste } from '@/types'

// ── Postes helpers ────────────────────────────────────────────────────────────

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

const PERMISSION_CATEGORIES = [
  {
    id: 'planning',
    label: 'Planning',
    permissions: [
      { key: 'planning.view',       label: "Voir le planning de l'équipe" },
      { key: 'planning.create',     label: 'Créer un créneau' },
      { key: 'planning.edit',       label: 'Modifier un créneau' },
      { key: 'planning.delete',     label: 'Supprimer un créneau' },
      { key: 'planning.copy_week',  label: 'Copier une semaine' },
      { key: 'planning.publish',    label: 'Publier le planning' },
      { key: 'planning.lock',       label: 'Verrouiller le planning' },
      { key: 'planning.export_pdf', label: 'Exporter le planning en PDF' },
    ],
  },
  {
    id: 'employees',
    label: 'Employés',
    permissions: [
      { key: 'employees.view',           label: 'Voir la liste des employés' },
      { key: 'employees.invite',         label: 'Inviter un employé' },
      { key: 'employees.edit',           label: "Modifier le profil d'un employé" },
      { key: 'employees.archive',        label: 'Archiver un employé' },
      { key: 'employees.view_contracts', label: 'Voir les contrats' },
      { key: 'employees.edit_contracts', label: 'Modifier les contrats' },
    ],
  },
  {
    id: 'leave',
    label: 'Congés & absences',
    permissions: [
      { key: 'leave.request',   label: 'Faire une demande de congé' },
      { key: 'leave.view_team', label: "Voir les demandes de l'équipe" },
      { key: 'leave.validate',  label: 'Valider une demande' },
      { key: 'leave.refuse',    label: 'Refuser une demande' },
      { key: 'leave.manual',    label: 'Saisir une absence manuellement' },
    ],
  },
  {
    id: 'reports',
    label: 'Rapports',
    permissions: [
      { key: 'reports.view',   label: 'Voir les rapports' },
      { key: 'reports.export', label: 'Exporter les rapports' },
    ],
  },
  {
    id: 'settings',
    label: 'Paramètres',
    permissions: [
      { key: 'settings.access', label: 'Accéder aux paramètres' },
      { key: 'settings.edit',   label: 'Modifier les paramètres' },
    ],
  },
  {
    id: 'presence',
    label: 'Présences',
    permissions: [
      { key: 'presence.view_team', label: "Voir les présences de l'équipe" },
      { key: 'presence.edit',      label: 'Modifier une présence' },
    ],
  },
] as const

const ALL_PERM_KEYS = PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.key))

const BUILTIN_ROLES = ['manager', 'superviseur', 'employe'] as const
type BuiltinRole = (typeof BUILTIN_ROLES)[number]

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  superviseur: 'Superviseur',
  employe: 'Employé',
}

function buildAllTrue(): Record<string, boolean> {
  return Object.fromEntries(ALL_PERM_KEYS.map(k => [k, true]))
}

function buildSuperviseurDefaults(): Record<string, boolean> {
  const on = new Set([
    'planning.view', 'planning.create', 'planning.edit', 'planning.copy_week',
    'employees.view', 'leave.view_team', 'leave.validate', 'leave.refuse',
    'leave.manual', 'reports.view', 'presence.view_team', 'presence.edit',
  ])
  return Object.fromEntries(ALL_PERM_KEYS.map(k => [k, on.has(k)]))
}

function buildEmployeDefaults(): Record<string, boolean> {
  const on = new Set(['planning.view', 'leave.request'])
  return Object.fromEntries(ALL_PERM_KEYS.map(k => [k, on.has(k)]))
}

function buildEmptyPerms(): Record<string, boolean> {
  return Object.fromEntries(ALL_PERM_KEYS.map(k => [k, false]))
}

const DEFAULT_MATRIX: Record<string, Record<string, boolean>> = {
  manager:     buildAllTrue(),
  superviseur: buildSuperviseurDefaults(),
  employe:     buildEmployeDefaults(),
}

type PermConfig = {
  custom_roles: string[]
  matrix: Record<string, Record<string, boolean>>
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function PermToggle({ checked, onChange, disabled }: {
  checked: boolean; onChange: () => void; disabled?: boolean
}) {
  if (disabled) {
    return (
      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
        <Check className="h-3 w-3" />
      </span>
    )
  }
  return (
    <button
      onClick={onChange}
      className="inline-flex items-center justify-center h-5 w-5 rounded-full transition-colors duration-150"
      style={{
        backgroundColor: checked ? 'var(--accent-light)' : 'var(--bg-page)',
        color: checked ? 'var(--accent)' : 'var(--text-tertiary)',
        border: checked ? 'none' : '0.5px solid var(--border)',
      }}
    >
      {checked ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
  const [permMatrix, setPermMatrix] = useState<Record<string, Record<string, boolean>>>(DEFAULT_MATRIX)
  const [customRoles, setCustomRoles] = useState<string[]>([])
  const [permsSaving, setPermsSaving] = useState(false)
  const [permsSaved, setPermsSaved] = useState(false)
  const [showAddRole, setShowAddRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

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
          try {
            const parsed = JSON.parse(s.permissions_matrix) as PermConfig
            if (parsed.matrix) {
              const merged = { ...DEFAULT_MATRIX }
              const roles = [...BUILTIN_ROLES, ...(parsed.custom_roles ?? [])]
              for (const role of roles) {
                if (parsed.matrix[role]) {
                  merged[role] = { ...buildEmptyPerms(), ...parsed.matrix[role] }
                }
              }
              setPermMatrix(merged)
              setCustomRoles(parsed.custom_roles ?? [])
            }
          } catch { /* keep defaults */ }
        }
      })
      .catch(() => {})
  }, [fetchPostes])

  // ── Add poste ─────────────────────────────────────────────────────────────

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

  // ── Edit poste ────────────────────────────────────────────────────────────

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

  // ── Delete poste ──────────────────────────────────────────────────────────

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

  // ── Permissions handlers ──────────────────────────────────────────────────

  function togglePerm(role: string, permKey: string) {
    setPermMatrix(prev => ({
      ...prev,
      [role]: { ...prev[role], [permKey]: !prev[role]?.[permKey] },
    }))
  }

  function addCustomRole() {
    const name = newRoleName.trim()
    if (!name || customRoles.includes(name) || BUILTIN_ROLES.includes(name as BuiltinRole)) return
    const slug = name.toLowerCase().replace(/\s+/g, '_')
    setCustomRoles(prev => [...prev, slug])
    setPermMatrix(prev => ({ ...prev, [slug]: buildEmptyPerms() }))
    setNewRoleName('')
    setShowAddRole(false)
  }

  function removeCustomRole(slug: string) {
    setCustomRoles(prev => prev.filter(r => r !== slug))
    setPermMatrix(prev => {
      const next = { ...prev }
      delete next[slug]
      return next
    })
  }

  function toggleCategory(catId: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      next.has(catId) ? next.delete(catId) : next.add(catId)
      return next
    })
  }

  async function savePerms() {
    setPermsSaving(true)
    const config: PermConfig = { custom_roles: customRoles, matrix: permMatrix }
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions_matrix: JSON.stringify(config) }),
    })
    setPermsSaving(false)
    setPermsSaved(true)
    setTimeout(() => setPermsSaved(false), 2500)
  }

  // ── All visible roles (builtin + custom) ──────────────────────────────────

  const allRoles = [...BUILTIN_ROLES, ...customRoles]

  const smallLabel = (text: string) => (
    <span className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{text}</span>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
            Postes & rôles
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Postes de travail et permissions par rôle
          </p>
        </div>
        <button
          onClick={() => { resetAdd(); setShowAddForm(true) }}
          disabled={showAddForm}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />Ajouter un poste
        </button>
      </div>

      {error && (
        <div className="rounded-lg p-4 mb-4 text-[13px]" style={{ backgroundColor: '#FEE2E2', border: '0.5px solid var(--danger)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* ── Add form ─────────────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: 'var(--accent-light)', border: '0.5px solid var(--accent)' }}>
          <p className="text-[13px] font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Nouveau poste</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              {smallLabel('Nom du poste')}
              <Input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Ex : Serveur" className="dp-input h-8 text-[13px]" />
            </div>
            <div>
              {smallLabel('Couleur planning')}
              <div className="flex items-center gap-2">
                <input type="color" value={addColor} onChange={e => setAddColor(e.target.value)} className="h-8 w-12 rounded-lg cursor-pointer p-0.5" style={{ border: '0.5px solid var(--border)' }} />
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{addColor}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              {smallLabel('Pause auto')}
              <button
                onClick={() => setAddAutoBreak(v => !v)}
                className="h-8 px-3 rounded-lg text-[12px] font-medium transition-colors duration-150"
                style={{
                  border: `0.5px solid ${addAutoBreak ? 'var(--success)' : 'var(--border)'}`,
                  backgroundColor: addAutoBreak ? '#DCFCE7' : 'transparent',
                  color: addAutoBreak ? 'var(--success)' : 'var(--text-secondary)',
                }}
              >
                {addAutoBreak ? 'Oui' : 'Non'}
              </button>
            </div>
            {addAutoBreak && (
              <div>
                {smallLabel('Durée')}
                <Select value={addBreak} onValueChange={setAddBreak}>
                  <SelectTrigger className="dp-input h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{BREAK_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              {smallLabel('Coût/h (€)')}
              <Input type="number" min="0" step="0.01" value={addCost} onChange={e => setAddCost(e.target.value)} placeholder="0.00" className="dp-input h-8 text-[13px]" />
            </div>
            <div>
              {smallLabel('Max h/jour')}
              <Input type="number" min="0" step="0.5" value={addMaxDay} onChange={e => setAddMaxDay(e.target.value)} placeholder="0" className="dp-input h-8 text-[13px]" />
            </div>
            <div>
              {smallLabel('Max h/sem')}
              <Input type="number" min="0" step="0.5" value={addMaxWeek} onChange={e => setAddMaxWeek(e.target.value)} placeholder="0" className="dp-input h-8 text-[13px]" />
            </div>
          </div>

          {addError && <p className="text-[12px] mb-3" style={{ color: 'var(--danger)' }}>{addError}</p>}
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={addLoading} className="btn-primary text-[12px] py-1.5 px-3">
              {addLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button onClick={resetAdd} disabled={addLoading} className="btn-secondary text-[12px] py-1.5 px-3">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Postes table ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
            <Layers className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Postes de travail</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>Chargement…</div>
        ) : postes.length === 0 ? (
          <div className="p-8 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Aucun poste. Cliquez sur &ldquo;Ajouter un poste&rdquo; pour commencer.
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                {['Poste', 'Pause', 'Coût/h', 'Max/j', 'Max/sem', ''].map(h => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-[11px] font-medium uppercase tracking-[0.06em] ${h === '' ? 'text-right' : 'text-left'}`}
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {postes.map(poste => (
                editingId === poste.id ? (
                  <tr key={poste.id} style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--accent-light)' }}>
                    <td colSpan={6} className="px-5 py-4">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          {smallLabel('Nom')}
                          <Input value={editName} onChange={e => setEditName(e.target.value)} className="dp-input h-8 text-[13px]" />
                          {editError && <p className="text-[11px] mt-1" style={{ color: 'var(--danger)' }}>{editError}</p>}
                        </div>
                        <div>
                          {smallLabel('Couleur')}
                          <div className="flex items-center gap-2">
                            <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="h-8 w-12 rounded-lg cursor-pointer p-0.5" style={{ border: '0.5px solid var(--border)' }} />
                            <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{editColor}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          {smallLabel('Pause auto')}
                          <button
                            onClick={() => setEditAutoBreak(v => !v)}
                            className="h-8 px-3 rounded-lg text-[12px] font-medium transition-colors duration-150"
                            style={{
                              border: `0.5px solid ${editAutoBreak ? 'var(--success)' : 'var(--border)'}`,
                              backgroundColor: editAutoBreak ? '#DCFCE7' : 'transparent',
                              color: editAutoBreak ? 'var(--success)' : 'var(--text-secondary)',
                            }}
                          >
                            {editAutoBreak ? 'Oui' : 'Non'}
                          </button>
                        </div>
                        {editAutoBreak && (
                          <div>
                            {smallLabel('Durée')}
                            <Select value={editBreak} onValueChange={setEditBreak}>
                              <SelectTrigger className="dp-input h-8 text-[13px] w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>{BREAK_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          {smallLabel('Coût/h (€)')}
                          <Input type="number" min="0" step="0.01" value={editCost} onChange={e => setEditCost(e.target.value)} placeholder="0.00" className="dp-input h-8 text-[13px]" />
                        </div>
                        <div>
                          {smallLabel('Max h/jour')}
                          <Input type="number" min="0" step="0.5" value={editMaxDay} onChange={e => setEditMaxDay(e.target.value)} placeholder="0" className="dp-input h-8 text-[13px]" />
                        </div>
                        <div>
                          {smallLabel('Max h/sem')}
                          <Input type="number" min="0" step="0.5" value={editMaxWeek} onChange={e => setEditMaxWeek(e.target.value)} placeholder="0" className="dp-input h-8 text-[13px]" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-primary flex items-center gap-1.5 text-[12px] py-1.5 px-3" onClick={() => handleSaveEdit(poste.id)} disabled={editLoading}>
                          <Check className="h-3.5 w-3.5" />{editLoading ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                        <button className="btn-secondary flex items-center gap-1.5 text-[12px] py-1.5 px-3" onClick={cancelEdit} disabled={editLoading}>
                          <X className="h-3.5 w-3.5" />Annuler
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={poste.id} className="transition-colors duration-150" style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: poste.color }} />
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{poste.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        {poste.break_minutes > 0 && <Clock className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />}
                        <span>{breakLabel(poste.break_minutes)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        {poste.hourly_cost > 0 && <Euro className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />}
                        <span>{numLabel(poste.hourly_cost, '€')}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{numLabel(poste.max_hours_per_day, 'h')}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{numLabel(poste.max_hours_per_week, 'h')}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors duration-150"
                          style={{ color: 'var(--text-tertiary)' }}
                          onClick={() => startEdit(poste)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors duration-150"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => { setDeleteId(poste.id); setDeleteError(null) }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Permissions matrix ───────────────────────────────────────────── */}
      <div className="overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
              <ShieldCheck className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Permissions par rôle</p>
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Définissez les accès de chaque rôle dans l&apos;application</p>
            </div>
          </div>
          <button
            className="btn-secondary flex items-center gap-1.5 text-[12px]"
            onClick={() => { setShowAddRole(true); setNewRoleName('') }}
            disabled={showAddRole}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Nouveau rôle
          </button>
        </div>

        {/* Add custom role input */}
        {showAddRole && (
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
            <Input
              autoFocus
              placeholder="Nom du rôle (ex: Chef de rang)"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustomRole(); if (e.key === 'Escape') setShowAddRole(false) }}
              className="dp-input h-7 text-[13px] max-w-xs"
            />
            <button className="btn-primary text-[12px] py-1 px-3" onClick={addCustomRole} disabled={!newRoleName.trim()}>
              Créer
            </button>
            <button className="btn-secondary text-[12px] py-1 px-3" onClick={() => setShowAddRole(false)}>
              Annuler
            </button>
          </div>
        )}

        {/* Scrollable matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                <th className="text-left px-5 py-3 text-[11px] font-medium uppercase tracking-[0.06em] min-w-[220px]" style={{ color: 'var(--text-tertiary)' }}>
                  Permission
                </th>
                {allRoles.map(role => (
                  <th key={role} className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-[0.06em] min-w-[100px]" style={{ color: 'var(--text-tertiary)' }}>
                    <div className="flex flex-col items-center gap-1">
                      <span style={{ color: role === 'manager' ? 'var(--success)' : 'var(--accent)' }}>
                        {ROLE_LABELS[role] ?? role}
                      </span>
                      {customRoles.includes(role) && (
                        <button
                          onClick={() => removeCustomRole(role)}
                          style={{ color: 'var(--text-tertiary)' }}
                          title="Supprimer ce rôle"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      {role === 'manager' && (
                        <span className="text-[9px] font-normal normal-case tracking-normal" style={{ color: 'var(--success)' }}>Accès total</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_CATEGORIES.map(category => {
                const isCollapsed = collapsedCategories.has(category.id)
                return [
                  <tr
                    key={`cat-${category.id}`}
                    className="cursor-pointer transition-colors duration-150"
                    style={{ borderTop: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <td colSpan={allRoles.length + 1} className="px-5 py-2">
                      <div className="flex items-center gap-2">
                        {isCollapsed
                          ? <ChevronRight className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
                          : <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
                        }
                        <span className="text-[11px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>
                          {category.label}
                        </span>
                        <span className="text-[10px] font-normal normal-case tracking-normal" style={{ color: 'var(--text-tertiary)' }}>
                          {category.permissions.length} permission{category.permissions.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                  </tr>,
                  ...(!isCollapsed ? category.permissions.map(perm => (
                    <tr key={perm.key} className="transition-colors duration-150" style={{ borderTop: '0.5px solid var(--border)' }}>
                      <td className="px-5 py-2.5 pl-10">
                        <span style={{ color: 'var(--text-secondary)' }}>{perm.label}</span>
                      </td>
                      {allRoles.map(role => (
                        <td key={role} className="px-4 py-2.5 text-center">
                          <PermToggle
                            checked={permMatrix[role]?.[perm.key] ?? false}
                            onChange={() => togglePerm(role, perm.key)}
                            disabled={role === 'manager'}
                          />
                        </td>
                      ))}
                    </tr>
                  )) : []),
                ]
              })}
            </tbody>
          </table>
        </div>

        {/* Footer note + save */}
        <div className="px-5 py-4 flex items-center justify-between gap-4" style={{ borderTop: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            <span style={{ color: 'var(--success)' }}>✓ Manager</span> — accès total non modifiable.
            Les rôles personnalisés s&apos;assignent depuis le profil employé.
          </p>
          <button onClick={savePerms} disabled={permsSaving} className="btn-primary flex items-center gap-1.5 shrink-0">
            {permsSaving
              ? <><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enregistrement…</>
              : permsSaved
              ? <><Check className="h-3.5 w-3.5" />Enregistré</>
              : 'Enregistrer les permissions'
            }
          </button>
        </div>
      </div>

      {/* ── Delete dialog ─────────────────────────────────────────────────── */}
      <Dialog open={deleteId !== null} onOpenChange={open => { if (!open) setDeleteId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Supprimer ce poste ?</DialogTitle></DialogHeader>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Cette action est irréversible. Les créneaux utilisant ce poste ne seront plus liés à lui.
          </p>
          {deleteError && <p className="text-[12px]" style={{ color: 'var(--danger)' }}>{deleteError}</p>}
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
