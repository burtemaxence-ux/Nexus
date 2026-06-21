'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Store, Plus, Check, Loader2, Building2, Users, ChevronDown, ChevronUp,
  Trash2, UserPlus, Edit2, X, Calendar, Palmtree, CheckCircle,
} from 'lucide-react'
import type { EstablishmentMetrics } from '@/app/api/establishments/overview/route'

interface Establishment {
  id: string
  name: string
  createdAt: string
  role: 'manager' | 'supervisor'
}

interface Member {
  user_id: string
  role: string
  full_name: string | null
  email: string
}

interface Props {
  establishments: Establishment[]
  activeEstablishmentId: string
  callerRole: 'manager' | 'supervisor' | 'employee'
  currentUserId: string
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email.slice(0, 2).toUpperCase()
}

// ── EstablishmentCard ─────────────────────────────────────────────────────────

function EstablishmentCard({
  est, isActive, metrics, isManager, switching, currentUserId,
  onSwitch, onRenamed,
}: {
  est: Establishment
  isActive: boolean
  metrics: EstablishmentMetrics | null
  isManager: boolean
  switching: boolean
  currentUserId: string
  onSwitch: () => void
  onRenamed: (name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(est.name)
  const [savingName, setSavingName] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'manager' | 'supervisor'>('supervisor')
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [memberError, setMemberError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true)
    setMemberError(null)
    try {
      const res = await fetch(`/api/establishments/${est.id}/members`)
      if (res.ok) setMembers(await res.json())
    } finally {
      setLoadingMembers(false)
    }
  }, [est.id])

  function toggleExpand() {
    if (!expanded && members === null) fetchMembers()
    setExpanded(v => !v)
  }

  async function saveName() {
    if (!newName.trim() || newName.trim() === est.name) { setRenaming(false); return }
    setSavingName(true)
    const res = await fetch(`/api/establishments/${est.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setSavingName(false)
    if (res.ok) {
      onRenamed(newName.trim())
      setRenaming(false)
    }
  }

  async function invite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setMemberError(null)
    const res = await fetch(`/api/establishments/${est.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMemberError(data.error ?? 'Erreur')
    } else {
      setInviteEmail('')
      fetchMembers()
    }
    setInviting(false)
  }

  async function removeMember(userId: string) {
    setRemoving(userId)
    setMemberError(null)
    const res = await fetch(`/api/establishments/${est.id}/members/${userId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setMemberError(data.error ?? 'Erreur')
    } else {
      setMembers(prev => prev?.filter(m => m.user_id !== userId) ?? null)
    }
    setRemoving(null)
  }

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-150"
      style={{
        border: isActive ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
        backgroundColor: 'var(--bg-card)',
      }}
    >
      {/* Main row */}
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isActive ? 'var(--accent-light)' : 'var(--bg-page)' }}
        >
          <Store className="h-4 w-4" style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }} />
        </div>

        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setRenaming(false) }}
                autoFocus
                className="dp-input flex-1 px-2 py-1 text-[13px]"
              />
              <button onClick={saveName} disabled={savingName} className="btn-primary text-[12px] px-2 py-1 flex items-center gap-1">
                {savingName ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                OK
              </button>
              <button onClick={() => { setRenaming(false); setNewName(est.name) }} className="p-1" style={{ color: 'var(--text-tertiary)' }}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium truncate" style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                {est.name}
              </p>
              {isManager && (
                <button onClick={() => setRenaming(true)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded" style={{ color: 'var(--text-tertiary)' }}>
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          <p className="text-[11px] mt-0.5 capitalize" style={{ color: 'var(--text-tertiary)' }}>{est.role}</p>
        </div>

        {/* Quick metrics */}
        {metrics && (
          <div className="hidden sm:flex items-center gap-3 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {metrics.employee_count}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {metrics.week_shifts}
            </span>
            {metrics.pending_leaves > 0 && (
              <span className="flex items-center gap-1" style={{ color: 'var(--warning)' }}>
                <Palmtree className="h-3 w-3" />
                {metrics.pending_leaves}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isActive ? (
            <span className="dp-badge-info flex items-center gap-1 text-[11px]">
              <Check className="h-3 w-3" />
              Actif
            </span>
          ) : (
            <button
              onClick={onSwitch}
              disabled={switching}
              className="btn-secondary text-[12px] disabled:opacity-50"
            >
              {switching && <Loader2 className="h-3 w-3 animate-spin" />}
              Activer
            </button>
          )}
          {isManager && (
            <button
              onClick={toggleExpand}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              title={expanded ? 'Réduire' : 'Gérer les membres'}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable members section */}
      {isManager && expanded && (
        <div className="px-4 pb-4" style={{ borderTop: '0.5px solid var(--border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mt-3 mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Accès collaborateurs
          </p>

          {loadingMembers ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          ) : (
            <div className="space-y-1.5 mb-3">
              {(members ?? []).map(m => (
                <div
                  key={m.user_id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)' }}
                >
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                  >
                    {getInitials(m.full_name, m.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {m.full_name ?? m.email}
                    </p>
                    {m.full_name && (
                      <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{m.email}</p>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded capitalize flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                    {m.role}
                  </span>
                  {m.user_id !== currentUserId && (
                    <button
                      onClick={() => removeMember(m.user_id)}
                      disabled={removing === m.user_id}
                      className="p-1 rounded transition-colors disabled:opacity-50"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="Retirer l'accès"
                    >
                      {removing === m.user_id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  )}
                </div>
              ))}
              {members?.length === 0 && (
                <p className="text-[12px] py-2" style={{ color: 'var(--text-tertiary)' }}>Aucun collaborateur pour l&apos;instant.</p>
              )}
            </div>
          )}

          {/* Invite form */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Inviter un collaborateur
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') invite() }}
              placeholder="email@exemple.com"
              className="dp-input flex-1 px-3 py-2 text-[13px]"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'manager' | 'supervisor')}
              className="dp-input px-2 py-2 text-[13px]"
              style={{ minWidth: '100px' }}
            >
              <option value="supervisor">Superviseur</option>
              <option value="manager">Manager</option>
            </select>
            <button
              onClick={invite}
              disabled={!inviteEmail.trim() || inviting}
              className="btn-primary flex items-center gap-1.5 text-[13px] disabled:opacity-50"
            >
              {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Inviter
            </button>
          </div>

          {memberError && (
            <p className="mt-2 text-[12px]" style={{ color: 'var(--danger)' }}>{memberError}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EstablishmentsClient({ establishments: initialEstablishments, activeEstablishmentId, callerRole, currentUserId }: Props) {
  const router = useRouter()
  const isManager = callerRole === 'manager'

  const [establishments, setEstablishments] = useState(initialEstablishments)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState<EstablishmentMetrics[] | null>(null)

  useEffect(() => {
    if (establishments.length <= 1) return
    fetch('/api/establishments/overview')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMetrics(data) })
  }, [establishments.length])

  async function handleSwitch(id: string) {
    if (id === activeEstablishmentId || switching) return
    setSwitching(id)
    try {
      const res = await fetch('/api/establishments/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establishment_id: id }),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Erreur lors du changement')
        return
      }
      router.refresh()
    } finally {
      setSwitching(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/establishments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error ?? 'Erreur lors de la création')
        return
      }
      setName('')
      setShowForm(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const multiSite = establishments.length > 1

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Établissements</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Gérez vos sites et basculez entre eux depuis la barre de navigation.
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => { setShowForm(true); setError('') }}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un site
          </button>
        )}
      </div>

      {/* Multi-site overview banner */}
      {multiSite && metrics && (
        <div className="mb-5 rounded-xl p-4" style={{ backgroundColor: 'var(--accent-light)', border: '0.5px solid var(--accent)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--accent)' }}>
            Vue multi-sites — semaine en cours
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
              <p className="text-[18px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {metrics.reduce((s, m) => s + m.employee_count, 0)}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Employés actifs</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
              <p className="text-[18px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {metrics.reduce((s, m) => s + m.week_shifts, 0)}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Shifts cette semaine</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
              <p className="text-[18px] font-medium" style={{ color: metrics.some(m => m.pending_leaves > 0) ? 'var(--warning)' : 'var(--text-primary)' }}>
                {metrics.reduce((s, m) => s + m.pending_leaves, 0)}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Congés en attente</p>
            </div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-5 p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-light)', border: '0.5px solid var(--accent)' }}>
          <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Nom du nouvel établissement</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex : Restaurant Lyon Part-Dieu"
              autoFocus
              className="dp-input flex-1 px-3 py-2 text-[13px]"
            />
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Créer
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setName(''); setError('') }}
              className="btn-secondary"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-[13px]" style={{ backgroundColor: '#FEE2E2', border: '0.5px solid var(--danger)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Establishments list */}
      {establishments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-10 w-10 mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Aucun établissement trouvé.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {establishments.map(est => (
            <EstablishmentCard
              key={est.id}
              est={est}
              isActive={est.id === activeEstablishmentId}
              metrics={metrics?.find(m => m.id === est.id) ?? null}
              isManager={est.role === 'manager'}
              switching={switching === est.id}
              currentUserId={currentUserId}
              onSwitch={() => handleSwitch(est.id)}
              onRenamed={newName => setEstablishments(prev => prev.map(e => e.id === est.id ? { ...e, name: newName } : e))}
            />
          ))}
        </div>
      )}

      {establishments.length > 0 && (
        <div className="mt-5 flex items-start gap-2 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
          <span>
            L&apos;établissement actif détermine les données affichées dans toute l&apos;application.
            Basculez aussi depuis la barre de navigation en haut.
          </span>
        </div>
      )}
    </div>
  )
}
