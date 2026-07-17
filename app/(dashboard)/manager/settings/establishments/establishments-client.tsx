'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Check, Loader2, Building2, Users, ChevronDown,
  Trash2, UserPlus, Edit2, X, CalendarCheck, Umbrella, Store, Info,
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

function estInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.trim().slice(0, 2).toUpperCase()
}

// ── EstablishmentCard ─────────────────────────────────────────────────────────

function EstablishmentCard({
  est, isActive, metrics, isManager, switching, currentUserId, delay,
  onSwitch, onRenamed,
}: {
  est: Establishment
  isActive: boolean
  metrics: EstablishmentMetrics | null
  isManager: boolean
  switching: boolean
  currentUserId: string
  delay: string
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
    <div className="nx-est qb-reveal" data-active={isActive} style={{ animationDelay: delay }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
        <div
          className="nx-est-ico"
          style={{
            width: 44, height: 44, borderRadius: 12, fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15,
            ...(isActive
              ? { background: 'linear-gradient(135deg,#6C63FF,#00D4AA)', color: '#fff' }
              : {}),
          }}
        >
          {estInitials(est.name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {renaming ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setRenaming(false) }}
                autoFocus
                className="nx-input"
                style={{ flex: 1, padding: '6px 10px' }}
              />
              <button onClick={saveName} disabled={savingName} className="btn-primary" style={{ fontSize: 12, padding: '6px 10px' }}>
                {savingName ? <Loader2 className="ic12 nx-spin" /> : <Check className="ic12" />} OK
              </button>
              <button onClick={() => { setRenaming(false); setNewName(est.name) }} className="nx-iconbtn" style={{ width: 28, height: 28 }}>
                <X className="ic14" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p className="nx-est-name" style={{ fontSize: 14, fontWeight: 600 }}>{est.name}</p>
                {isActive && (
                  <span className="nx-badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)', gap: 4, padding: '2px 8px' }}>
                    <span style={{ position: 'relative', width: 6, height: 6, borderRadius: '50%', background: '#00D4AA', display: 'inline-block' }}>
                      <span className="qb-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#00D4AA' }} />
                    </span>
                    Actif
                  </span>
                )}
                {isManager && !isActive && (
                  <button onClick={() => setRenaming(true)} className="nx-iconbtn" style={{ width: 24, height: 24 }} title="Renommer">
                    <Edit2 className="ic12" style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 3, fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                {est.role}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!isActive && (
            <button onClick={onSwitch} disabled={switching} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 12 }}>
              {switching && <Loader2 className="ic12 nx-spin" />} Activer
            </button>
          )}
          {isManager && (
            <button
              onClick={toggleExpand}
              className="nx-iconbtn"
              style={{ width: 34, height: 34, border: '0.5px solid var(--border)', background: 'var(--bg-page)' }}
              title={expanded ? 'Réduire' : 'Gérer les membres'}
            >
              <ChevronDown className={`ic16 nx-est-chev ${expanded ? 'open' : ''}`} style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Metrics grid (real data) */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border)', borderTop: '0.5px solid var(--border)' }}>
          {[
            { icon: <Users className="ic14" style={{ color: 'var(--text-tertiary)' }} />, value: metrics.employee_count, label: 'Employés' },
            { icon: <CalendarCheck className="ic14" style={{ color: 'var(--text-tertiary)' }} />, value: metrics.week_shifts, label: 'Shifts/sem.' },
            { icon: <Umbrella className="ic14" style={{ color: metrics.pending_leaves > 0 ? 'var(--warning)' : 'var(--text-tertiary)' }} />, value: metrics.pending_leaves, label: 'Congés à valider' },
          ].map((m, i) => (
            <div key={i} style={{ padding: '12px 16px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {m.icon}
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{m.value}</p>
                <p style={{ fontSize: 10, marginTop: 2, color: 'var(--text-tertiary)' }}>{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expandable members */}
      {isManager && expanded && (
        <div className="qb-reveal" style={{ padding: 16, borderTop: '0.5px solid var(--border)', background: 'var(--bg-page)' }}>
          <p className="nx-eyebrow" style={{ marginBottom: 10 }}>Accès collaborateurs</p>
          {loadingMembers ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
              <Loader2 className="ic16 nx-spin" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {(members ?? []).map(m => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#6C63FF,#00A98F)' }}>
                    {getInitials(m.full_name, m.email)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.full_name ?? m.email}</p>
                      {m.user_id === currentUserId && (
                        <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 5, background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>Vous</span>
                      )}
                    </div>
                    {m.full_name && <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.email}</p>}
                  </div>
                  <span className="nx-badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0, textTransform: 'capitalize' }}>{m.role}</span>
                  {m.user_id !== currentUserId && (
                    <button onClick={() => removeMember(m.user_id)} disabled={removing === m.user_id} className="nx-iconbtn" style={{ width: 28, height: 28 }} title="Retirer l'accès">
                      {removing === m.user_id ? <Loader2 className="ic14 nx-spin" /> : <Trash2 className="ic14" style={{ color: 'var(--text-tertiary)' }} />}
                    </button>
                  )}
                </div>
              ))}
              {members?.length === 0 && (
                <p style={{ fontSize: 12, padding: '8px 0', color: 'var(--text-tertiary)' }}>Aucun collaborateur pour l&apos;instant.</p>
              )}
            </div>
          )}

          <p className="nx-eyebrow" style={{ marginBottom: 8 }}>Inviter un collaborateur</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') invite() }} placeholder="email@exemple.com" className="nx-input" style={{ flex: 1 }} />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'manager' | 'supervisor')} className="nx-input" style={{ minWidth: 130, width: 'auto' }}>
              <option value="supervisor">Superviseur</option>
              <option value="manager">Manager</option>
            </select>
            <button onClick={invite} disabled={!inviteEmail.trim() || inviting} className="btn-primary" style={{ flexShrink: 0 }}>
              {inviting ? <Loader2 className="ic14 nx-spin" /> : <UserPlus className="ic14" />} Inviter
            </button>
          </div>
          {memberError && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>{memberError}</p>}
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
    fetch('/api/establishments/overview')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMetrics(data) })
      .catch(() => {})
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

  const totals = (metrics ?? []).reduce(
    (acc, m) => ({
      employees: acc.employees + m.employee_count,
      shifts: acc.shifts + m.week_shifts,
      pending: acc.pending + m.pending_leaves,
    }),
    { employees: 0, shifts: 0, pending: 0 },
  )

  const kpis = [
    { icon: <Store className="ic14" />, label: 'Établissements', value: establishments.length, sub: 'sur votre compte', alert: false },
    { icon: <Users className="ic14" />, label: 'Employés', value: metrics ? totals.employees : '—', sub: 'actifs', alert: false },
    { icon: <CalendarCheck className="ic14" />, label: 'Shifts', value: metrics ? totals.shifts : '—', sub: 'cette semaine', alert: false },
    { icon: <Umbrella className="ic14" />, label: 'Congés à valider', value: metrics ? totals.pending : '—', sub: 'en attente', alert: totals.pending > 0 },
  ]

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-.02em', color: 'var(--text-primary)' }}>Établissements</h1>
          <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>Gérez vos sites, leurs équipes et l&apos;établissement actif.</p>
        </div>
        {isManager && (
          <button onClick={() => { setShowForm(v => !v); setError('') }} className="btn-primary" style={{ flexShrink: 0 }}>
            <Plus className="ic14" />Ajouter un site
          </button>
        )}
      </div>

      {/* KPI bar (real aggregates) */}
      <div className="nx-kpi-bar qb-reveal" style={{ position: 'relative', overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderRadius: 16, background: 'var(--bg-card)', border: '0.5px solid var(--border)', marginBottom: 20 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#6C63FF,#00D4AA)' }} />
        {kpis.map((k, i) => (
          <div key={i} className="nx-kpi-cell" style={{ padding: '18px 20px', borderLeft: '0.5px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-tertiary)' }}>
              {k.icon}<span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.01em' }}>{k.label}</span>
            </div>
            <p className="nx-kpi-num" data-alert={k.alert} style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', marginTop: 10, lineHeight: 1, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{k.value}</p>
            <p style={{ fontSize: 11, marginTop: 6, color: 'var(--text-tertiary)' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="qb-reveal" style={{ marginBottom: 16, padding: 16, borderRadius: 14, background: 'var(--accent-light)', border: '0.5px solid var(--accent)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>Nouvel établissement</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Restaurant Lyon Part-Dieu" autoFocus className="nx-input" style={{ flex: 1 }} />
            <button type="submit" disabled={!name.trim() || saving} className="btn-primary">{saving && <Loader2 className="ic14 nx-spin" />}Créer</button>
            <button type="button" onClick={() => { setShowForm(false); setName(''); setError('') }} className="btn-secondary">Annuler</button>
          </div>
        </form>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'var(--sev-critical-bg)', border: '0.5px solid var(--danger)', color: 'var(--danger)' }}>{error}</div>
      )}

      {/* List */}
      {establishments.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', textAlign: 'center' }}>
          <Building2 className="ic28" style={{ color: 'var(--text-tertiary)', marginBottom: 12 }} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Aucun établissement trouvé.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {establishments.map((est, i) => (
            <EstablishmentCard
              key={est.id}
              est={est}
              isActive={est.id === activeEstablishmentId}
              metrics={metrics?.find(m => m.id === est.id) ?? null}
              isManager={est.role === 'manager'}
              switching={switching === est.id}
              currentUserId={currentUserId}
              delay={`${i * 0.05}s`}
              onSwitch={() => handleSwitch(est.id)}
              onRenamed={newName => setEstablishments(prev => prev.map(e => e.id === est.id ? { ...e, name: newName } : e))}
            />
          ))}
        </div>
      )}

      {establishments.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', borderRadius: 12, background: 'var(--bg-subtle)', border: '0.5px solid var(--border)' }}>
          <Info className="ic14" style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            L&apos;établissement actif détermine les données affichées dans toute l&apos;application. Vous pouvez aussi basculer depuis la barre de navigation en haut.
          </span>
        </div>
      )}
    </div>
  )
}
