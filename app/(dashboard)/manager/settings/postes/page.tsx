'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Check, X, Layers, Save, CheckCircle2,
  ShieldCheck, UserPlus, ChevronRight, Crown, Shield, User, UserCog,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
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

function roleIcon(role: string) {
  if (role === 'manager') return Crown
  if (role === 'superviseur') return Shield
  if (role === 'employe') return User
  return UserCog
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
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set(PERMISSION_CATEGORIES.map(c => c.id)))

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
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId); else next.add(catId)
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

  // ── Derived ────────────────────────────────────────────────────────────────

  const allRoles = [...BUILTIN_ROLES, ...customRoles]
  const roleCount = (role: string) => ALL_PERM_KEYS.filter(k => permMatrix[role]?.[k]).length

  const smallLabel = (text: string) => (
    <span className="nx-label" style={{ fontSize: 11, marginBottom: 6 }}>{text}</span>
  )

  function posteForm(mode: 'add' | 'edit') {
    const isAdd = mode === 'add'
    const name = isAdd ? addName : editName
    const color = isAdd ? addColor : editColor
    const autoBreak = isAdd ? addAutoBreak : editAutoBreak
    const brk = isAdd ? addBreak : editBreak
    const cost = isAdd ? addCost : editCost
    const maxDay = isAdd ? addMaxDay : editMaxDay
    const maxWeek = isAdd ? addMaxWeek : editMaxWeek
    const err = isAdd ? addError : editError
    const busy = isAdd ? addLoading : editLoading
    const setName = isAdd ? setAddName : setEditName
    const setColor = isAdd ? setAddColor : setEditColor
    const setAutoBreak = isAdd ? setAddAutoBreak : setEditAutoBreak
    const setBrk = isAdd ? setAddBreak : setEditBreak
    const setCost = isAdd ? setAddCost : setEditCost
    const setMaxDay = isAdd ? setAddMaxDay : setEditMaxDay
    const setMaxWeek = isAdd ? setAddMaxWeek : setEditMaxWeek
    return (
      <div className="qb-reveal" style={{ padding: 18, borderRadius: 14, background: 'var(--accent-light)', border: '0.5px solid var(--accent)' }}>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>{isAdd ? 'Nouveau poste' : 'Modifier le poste'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
          <div>
            {smallLabel('Nom du poste')}
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Serveur" className="nx-input" style={{ height: 34 }} />
          </div>
          <div>
            {smallLabel('Couleur planning')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ height: 34, width: 48, borderRadius: 8, cursor: 'pointer', padding: 2, border: '0.5px solid var(--border)' }} />
              <span className="nx-mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{color}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 14, marginBottom: 14 }}>
          <div>
            {smallLabel('Pause auto')}
            <button
              onClick={() => setAutoBreak(v => !v)}
              style={{
                height: 34, padding: '0 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: `0.5px solid ${autoBreak ? 'var(--success)' : 'var(--border)'}`,
                background: autoBreak ? 'var(--sev-success-bg)' : 'transparent',
                color: autoBreak ? 'var(--success)' : 'var(--text-secondary)',
              }}
            >{autoBreak ? 'Oui' : 'Non'}</button>
          </div>
          {autoBreak && (
            <div>
              {smallLabel('Durée')}
              <Select value={brk} onValueChange={setBrk}>
                <SelectTrigger className="nx-input" style={{ height: 34 }}><SelectValue /></SelectTrigger>
                <SelectContent>{BREAK_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div>
            {smallLabel('Coût/h (€)')}
            <Input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" className="nx-input" style={{ height: 34 }} />
          </div>
          <div>
            {smallLabel('Max h/jour')}
            <Input type="number" min="0" step="0.5" value={maxDay} onChange={e => setMaxDay(e.target.value)} placeholder="0" className="nx-input" style={{ height: 34 }} />
          </div>
          <div>
            {smallLabel('Max h/sem')}
            <Input type="number" min="0" step="0.5" value={maxWeek} onChange={e => setMaxWeek(e.target.value)} placeholder="0" className="nx-input" style={{ height: 34 }} />
          </div>
        </div>
        {err && <p style={{ fontSize: 12, marginBottom: 10, color: 'var(--danger)' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={isAdd ? handleAdd : () => editingId && handleSaveEdit(editingId)} disabled={busy} className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}>
            <Check className="ic14" />{busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button onClick={isAdd ? resetAdd : cancelEdit} disabled={busy} className="btn-secondary" style={{ fontSize: 12, padding: '7px 14px' }}>
            <X className="ic14" />Annuler
          </button>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 768, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-.02em', color: 'var(--text-primary)' }}>Postes &amp; rôles</h1>
          <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>Postes de travail et matrice de permissions par rôle.</p>
        </div>
      </div>

      {error && (
        <div style={{ borderRadius: 10, padding: 14, fontSize: 13, background: 'var(--sev-critical-bg)', border: '0.5px solid var(--danger)', color: 'var(--danger)' }}>{error}</div>
      )}

      {/* ── Postes card ──────────────────────────────────────────────────── */}
      <div className="nx-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="nx-ico" style={{ background: 'var(--accent-light)' }}><Layers className="ic16" style={{ color: 'var(--accent)' }} /></div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Postes de travail</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{postes.length} poste{postes.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => { resetAdd(); setShowAddForm(true) }} disabled={showAddForm} className="btn-secondary" style={{ fontSize: 12, flexShrink: 0 }}>
            <Plus className="ic14" />Ajouter
          </button>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {showAddForm && posteForm('add')}
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>Chargement…</div>
          ) : postes.length === 0 && !showAddForm ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>Aucun poste. Cliquez sur « Ajouter » pour commencer.</div>
          ) : (
            postes.map((poste, i) => (
              editingId === poste.id ? (
                <div key={poste.id}>{posteForm('edit')}</div>
              ) : (
                <div key={poste.id} className="nx-poste" style={{ ['--poste-c' as string]: poste.color, animationDelay: `${i * 0.04}s` }}>
                  <div className="nx-poste-ico" style={{ background: `${poste.color}1A`, color: poste.color, fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16 }}>
                    {poste.name.trim().slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 130, flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.01em' }}>{poste.name}</p>
                  </div>
                  <div className="nx-poste-metrics">
                    {[
                      { label: 'Pause', value: breakLabel(poste.break_minutes) },
                      { label: 'Coût/h', value: numLabel(poste.hourly_cost, '€') },
                      { label: 'Max/j', value: numLabel(poste.max_hours_per_day, 'h') },
                      { label: 'Max/sem', value: numLabel(poste.max_hours_per_week, 'h') },
                    ].map(m => (
                      <div key={m.label} style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-tertiary)' }}>{m.label}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, marginTop: 3, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="nx-poste-act">
                    <button className="nx-iconbtn" style={{ color: 'var(--text-secondary)' }} onClick={() => startEdit(poste)} aria-label="Modifier"><Pencil className="ic14" /></button>
                    <button className="nx-iconbtn" style={{ color: 'var(--danger)' }} onClick={() => { setDeleteId(poste.id); setDeleteError(null) }} aria-label="Supprimer"><Trash2 className="ic14" /></button>
                  </div>
                </div>
              )
            ))
          )}
        </div>
      </div>

      {/* ── Permissions matrix ───────────────────────────────────────────── */}
      <div className="nx-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="nx-ico" style={{ background: 'var(--accent-light)' }}><ShieldCheck className="ic16" style={{ color: 'var(--accent)' }} /></div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Permissions par rôle</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Définissez les accès de chaque rôle dans l&apos;application</p>
            </div>
          </div>
          <button className="btn-secondary" style={{ fontSize: 12, flexShrink: 0 }} onClick={() => { setShowAddRole(true); setNewRoleName('') }} disabled={showAddRole}>
            <UserPlus className="ic14" />Nouveau rôle
          </button>
        </div>

        {showAddRole && (
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '0.5px solid var(--border)', background: 'var(--bg-page)' }}>
            <Input autoFocus placeholder="Nom du rôle (ex : Chef de rang)" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCustomRole(); if (e.key === 'Escape') setShowAddRole(false) }} className="nx-input" style={{ maxWidth: 280, height: 32 }} />
            <button className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={addCustomRole} disabled={!newRoleName.trim()}>Créer</button>
            <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setShowAddRole(false)}>Annuler</button>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-page)', borderBottom: '0.5px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-tertiary)', minWidth: 220 }}>Permission</th>
                {allRoles.map(role => {
                  const Icon = roleIcon(role)
                  const isManager = role === 'manager'
                  return (
                    <th key={role} style={{ padding: '12px 16px', minWidth: 112 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                        <span className="nx-rolechip" style={{ background: isManager ? 'rgba(0,169,143,.14)' : 'var(--accent-light)', color: isManager ? '#0f9e82' : 'var(--accent)' }}><Icon className="ic14" /></span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {ROLE_LABELS[role] ?? role.replace(/_/g, ' ')}
                          {customRoles.includes(role) && (
                            <button onClick={() => removeCustomRole(role)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, display: 'inline-flex' }} title="Supprimer ce rôle"><X className="ic12" /></button>
                          )}
                        </span>
                        <span style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums', color: 'var(--text-tertiary)' }}>{isManager ? ALL_PERM_KEYS.length : roleCount(role)}/{ALL_PERM_KEYS.length} droits</span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_CATEGORIES.map((category, ci) => {
                const open = openCategories.has(category.id)
                return [
                  <tr key={`cat-${category.id}`} className="nx-catrow" onClick={() => toggleCategory(category.id)} style={{ animationDelay: `${ci * 0.03}s` }}>
                    <td colSpan={allRoles.length + 1} style={{ padding: '10px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <ChevronRight className={`ic14 nx-catchev ${open ? 'open' : ''}`} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-primary)' }}>{category.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 999, background: 'var(--bg-card)', border: '0.5px solid var(--border)', color: 'var(--text-tertiary)' }}>{category.permissions.length}</span>
                      </div>
                    </td>
                  </tr>,
                  ...(open ? category.permissions.map((perm, ri) => (
                    <tr key={perm.key} className="nx-permrow" style={{ borderTop: '0.5px solid var(--border)', animationDelay: `${ri * 0.02}s` }}>
                      <td style={{ padding: '11px 20px 11px 43px', color: 'var(--text-secondary)' }}>{perm.label}</td>
                      {allRoles.map(role => {
                        const isManager = role === 'manager'
                        const checked = isManager || (permMatrix[role]?.[perm.key] ?? false)
                        const cls = isManager ? 'nx-perm locked' : checked ? 'nx-perm on' : 'nx-perm off'
                        return (
                          <td key={role} style={{ padding: '9px 16px', textAlign: 'center' }}>
                            <button className={cls} onClick={isManager ? undefined : () => togglePerm(role, perm.key)} disabled={isManager} aria-label={perm.label}>
                              {checked ? <Check className="ic14" /> : <X className="ic14" />}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )) : []),
                ]
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderTop: '0.5px solid var(--border)', background: 'var(--bg-page)' }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
            <Crown className="ic12" style={{ color: '#0f9e82' }} />Manager — accès total non modifiable.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {permsSaved && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--success)' }}><CheckCircle2 className="ic14" />Enregistré</span>}
            <button onClick={savePerms} disabled={permsSaving} className="btn-primary">
              <Save className="ic14" />{permsSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
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
