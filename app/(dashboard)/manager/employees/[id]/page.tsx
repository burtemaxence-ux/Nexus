'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Contract, Availability } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  User, FileText, FolderOpen, History, Archive,
  Loader2, RefreshCw, Check, AlertTriangle, Plus,
  Trash2, Shield, Clock, ChevronLeft, AlarmClock
} from 'lucide-react'

type LatenessRecord = {
  id: string
  employee_id: string
  date: string
  scheduled_time: string
  actual_time: string
  late_minutes: number
  justified: boolean
  notes: string | null
}

const TABS = [
  { id: 'info', label: 'Informations personnelles', icon: User },
  { id: 'contrat', label: 'Données contractuelles', icon: FileText },
  { id: 'rh', label: 'Dossier RH', icon: FolderOpen },
  { id: 'historique', label: 'Historique & Compteurs', icon: History },
  { id: 'documents', label: 'Documents', icon: Archive },
]

const CONTRACT_TYPES = ['CDI 35h', 'CDI 28h', 'CDD', 'CDD Saisonnier', 'Extra'] as const
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const POSITIONS = ['Serveur', 'Serveuse', 'Cuisinier', 'Cuisinière', 'Chef de rang', 'Barman', 'Barmaid', 'Plongeur', 'Chef de cuisine', 'Sous-chef', 'Commis de cuisine', "Hôte d'accueil"]

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [activeTab, setActiveTab] = useState('info')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [employee, setEmployee] = useState<Profile | null>(null)
  const [invitedByName, setInvitedByName] = useState<string | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showContractDialog, setShowContractDialog] = useState(false)
  const [pinVisible, setPinVisible] = useState(false)
  const [pinResetting, setPinResetting] = useState(false)
  const [newPin, setNewPin] = useState<string | null>(null)
  const [latenessRecords, setLatenessRecords] = useState<LatenessRecord[]>([])
  const [latenessLoading, setLatenessLoading] = useState(false)

  // Form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [payRef, setPayRef] = useState('')
  const [disability, setDisability] = useState(false)
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set())
  const [dayTimes, setDayTimes] = useState<Record<number, { start: string; end: string }>>({})

  // Contract form state
  const [contractForm, setContractForm] = useState({
    type: 'CDI 35h',
    start_date: '',
    end_date: '',
    weekly_hours: '',
    hourly_rate: '',
    notes: '',
  })

  const load = useCallback(async () => {
    const supabase = createClient()
    const [empRes, contractsRes, availRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      fetch(`/api/employees/${id}/contracts`).then(r => r.json()),
      fetch(`/api/employees/${id}/availabilities`).then(r => r.json()),
    ])

    if (empRes.error || !empRes.data) { router.push('/manager/employees'); return }

    const emp = empRes.data as Profile
    setEmployee(emp)
    setFullName(emp.full_name ?? '')
    setPhone(emp.phone ?? '')
    setPosition(emp.position ?? '')
    setPayRef(emp.pay_ref ?? '')
    setDisability(emp.disability ?? false)

    if (emp.invited_by) {
      const { data: inv } = await supabase.from('profiles').select('full_name').eq('id', emp.invited_by).single()
      setInvitedByName(inv?.full_name ?? null)
    }

    setContracts(Array.isArray(contractsRes) ? contractsRes : [])

    const avails: Availability[] = Array.isArray(availRes) ? availRes : []
    setAvailabilities(avails)
    const days = new Set(avails.map(a => a.day_of_week))
    setActiveDays(days)
    const times: Record<number, { start: string; end: string }> = {}
    avails.forEach(a => { times[a.day_of_week] = { start: a.start_time.slice(0, 5), end: a.end_time.slice(0, 5) } })
    setDayTimes(times)

    setLoading(false)
  }, [id, router])

  const loadLateness = useCallback(async () => {
    setLatenessLoading(true)
    const res = await fetch(`/api/lateness?employee_id=${id}`)
    if (res.ok) setLatenessRecords(await res.json())
    setLatenessLoading(false)
  }, [id])

  async function toggleJustified(record: LatenessRecord) {
    const res = await fetch(`/api/lateness/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justified: !record.justified }),
    })
    if (res.ok) {
      const updated = await res.json()
      setLatenessRecords(prev => prev.map(r => r.id === updated.id ? updated : r))
    }
  }

  useEffect(() => { load() }, [load])
  useEffect(() => { if (activeTab === 'historique') loadLateness() }, [activeTab, loadLateness])

  async function handleSaveInfo() {
    setSaving(true)
    const res = await fetch(`/api/employees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        position: position || null,
        pay_ref: payRef.trim() || null,
        disability,
      }),
    })
    if (res.ok) {
      // Save availabilities
      const availPayload = Array.from(activeDays).map(day => ({
        day_of_week: day,
        start_time: dayTimes[day]?.start ?? '09:00',
        end_time: dayTimes[day]?.end ?? '17:00',
      }))
      await fetch(`/api/employees/${id}/availabilities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(availPayload),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      load()
    }
    setSaving(false)
  }

  async function handleResetPin() {
    setPinResetting(true)
    const res = await fetch(`/api/employees/${id}/pin-reset`, { method: 'POST' })
    const data = await res.json()
    setNewPin(data.pin)
    setPinResetting(false)
    setPinVisible(true)
    load()
  }

  async function handleArchive() {
    const res = await fetch(`/api/employees/${id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: !employee?.archived }),
    })
    if (res.ok) { setShowArchiveDialog(false); load() }
  }

  async function handleCreateContract() {
    if (!contractForm.type || !contractForm.start_date || !contractForm.weekly_hours) return
    const res = await fetch(`/api/employees/${id}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: contractForm.type,
        start_date: contractForm.start_date,
        end_date: contractForm.end_date || null,
        weekly_hours: parseFloat(contractForm.weekly_hours),
        hourly_rate: contractForm.hourly_rate ? parseFloat(contractForm.hourly_rate) : null,
        notes: contractForm.notes || null,
      }),
    })
    if (res.ok) {
      setShowContractDialog(false)
      setContractForm({ type: 'CDI 35h', start_date: '', end_date: '', weekly_hours: '', hourly_rate: '', notes: '' })
      load()
    }
  }

  async function handleDeleteContract(contractId: string) {
    await fetch(`/api/employees/${id}/contracts/${contractId}`, { method: 'DELETE' })
    load()
  }

  function toggleDay(day: number) {
    setActiveDays(prev => {
      const next = new Set(prev)
      if (next.has(day)) { next.delete(day) } else { next.add(day) }
      return next
    })
    if (!dayTimes[day]) {
      setDayTimes(prev => ({ ...prev, [day]: { start: '09:00', end: '17:00' } }))
    }
  }

  // suppress unused variable warning
  void availabilities

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!employee) return null

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-4 py-5">
            <button onClick={() => router.push('/manager/employees')} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary">{getInitials(employee.full_name ?? employee.email)}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-foreground">{employee.full_name ?? 'Sans nom'}</h1>
                  {employee.archived && <Badge variant="secondary" className="text-xs">Archivé</Badge>}
                  <Badge variant="outline" className="text-xs text-muted-foreground">Employé standard</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{employee.email}</p>
              </div>
            </div>
          </div>
          {/* Tabs */}
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-8 max-w-6xl mx-auto">

        {/* TAB: Informations personnelles */}
        {activeTab === 'info' && (
          <div className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations personnelles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nom complet</Label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Prénom Nom" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={employee.email} disabled className="bg-muted text-muted-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Téléphone</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Poste</Label>
                    <Select value={position} onValueChange={setPosition}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Matricule de paie</Label>
                  <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Ex : MAT-0042" className="max-w-sm" />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="disability"
                    checked={disability}
                    onChange={e => setDisability(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                  <label htmlFor="disability" className="text-sm text-foreground cursor-pointer select-none">
                    Employé en situation de handicap (RQTH)
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* PIN */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Code PIN badgeuse</CardTitle>
                <CardDescription>Code à 4 chiffres utilisé sur la badgeuse de l&apos;établissement.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg min-w-[100px]">
                    {pinVisible
                      ? <span className="font-mono font-bold text-lg text-foreground tracking-widest">{newPin ?? employee.pin ?? '—'}</span>
                      : <span className="font-mono font-bold text-lg text-muted-foreground tracking-widest">{employee.pin ? '••••' : '—'}</span>
                    }
                  </div>
                  {employee.pin && (
                    <button
                      onClick={() => setPinVisible(!pinVisible)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {pinVisible ? 'Masquer' : 'Afficher'}
                    </button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleResetPin} disabled={pinResetting} className="gap-2 ml-auto">
                    {pinResetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Réinitialiser le PIN
                  </Button>
                </div>
                {newPin && (
                  <p className="mt-2 text-xs text-amber-600 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    Nouveau PIN généré : <strong className="font-mono">{newPin}</strong> — notez-le avant de fermer.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Disponibilités */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Disponibilités</CardTitle>
                <CardDescription>Jours et horaires où l&apos;employé est disponible.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                        activeDays.has(i)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                {Array.from(activeDays).sort().map(day => (
                  <div key={day} className="flex items-center gap-3 py-2 border-t border-border/50 first:border-t-0">
                    <span className="text-sm font-medium w-8 text-foreground">{DAYS[day]}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={dayTimes[day]?.start ?? '09:00'}
                        onChange={e => setDayTimes(p => ({ ...p, [day]: { ...p[day], start: e.target.value } }))}
                        className="w-32 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">→</span>
                      <Input
                        type="time"
                        value={dayTimes[day]?.end ?? '17:00'}
                        onChange={e => setDayTimes(p => ({ ...p, [day]: { ...p[day], end: e.target.value } }))}
                        className="w-32 text-sm"
                      />
                    </div>
                  </div>
                ))}
                {activeDays.size === 0 && (
                  <p className="text-sm text-muted-foreground italic">Aucune disponibilité configurée — tous les jours sont considérés disponibles.</p>
                )}
              </CardContent>
            </Card>

            {/* Save + Archive */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:border-destructive gap-2"
                onClick={() => setShowArchiveDialog(true)}
              >
                <Archive className="h-4 w-4" />
                {employee.archived ? 'Désarchiver' : "Archiver l'employé"}
              </Button>
              <Button onClick={handleSaveInfo} disabled={saving} className="gap-2 min-w-[140px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
                {saving ? 'Enregistrement…' : saved ? 'Enregistré !' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        )}

        {/* TAB: Données contractuelles */}
        {activeTab === 'contrat' && (
          <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Données contractuelles & salariales</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Historique des contrats de cet employé.</p>
              </div>
              <Button onClick={() => setShowContractDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />Créer un contrat
              </Button>
            </div>

            {invitedByName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2.5 rounded-lg">
                <Shield className="h-3.5 w-3.5" />
                Créé par <span className="font-medium text-foreground">{invitedByName}</span> le {formatDate(employee.created_at)}
              </div>
            )}

            {contracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
                <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Aucun contrat enregistré</p>
                <p className="text-xs text-muted-foreground">Cliquez sur &ldquo;Créer un contrat&rdquo; pour ajouter le premier contrat.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contracts.map((contract, i) => (
                  <Card key={contract.id} className={cn(i === 0 && 'border-primary/30 bg-primary/5')}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={i === 0 ? 'default' : 'outline'} className="text-xs">
                              {contract.type}
                            </Badge>
                            {i === 0 && <span className="text-xs text-primary font-medium">Actuel</span>}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {contract.weekly_hours}h/sem.
                            </span>
                            {contract.hourly_rate && <span>{contract.hourly_rate}€/h brut</span>}
                            <span>
                              Du {formatDate(contract.start_date)}
                              {contract.end_date ? ` au ${formatDate(contract.end_date)}` : ' (en cours)'}
                            </span>
                          </div>
                          {contract.notes && <p className="text-xs text-muted-foreground mt-1 italic">{contract.notes}</p>}
                        </div>
                        <button
                          onClick={() => handleDeleteContract(contract.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Dossier RH */}
        {activeTab === 'rh' && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Dossier RH</h2>
            <p className="text-sm text-muted-foreground max-w-sm">Arrêts maladie, avertissements, entretiens — cette section sera disponible prochainement.</p>
          </div>
        )}

        {/* TAB: Historique & Compteurs */}
        {activeTab === 'historique' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Historique des retards</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Retards détectés automatiquement lors du pointage.</p>
            </div>

            {/* Summary */}
            {!latenessLoading && latenessRecords.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'Total retards',
                    value: latenessRecords.length,
                    color: 'text-orange-600',
                    bg: 'bg-orange-50 border-orange-200',
                  },
                  {
                    label: 'Minutes perdues',
                    value: `${latenessRecords.reduce((s, r) => s + r.late_minutes, 0)} min`,
                    color: 'text-red-600',
                    bg: 'bg-red-50 border-red-200',
                  },
                  {
                    label: 'Non justifiés',
                    value: latenessRecords.filter(r => !r.justified).length,
                    color: 'text-gray-600',
                    bg: 'bg-gray-50 border-gray-200',
                  },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`rounded-xl border p-4 text-center ${bg}`}>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {latenessLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : latenessRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
                <AlarmClock className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">Aucun retard enregistré</p>
                <p className="text-xs text-muted-foreground mt-1">Les retards sont détectés automatiquement lors du pointage.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {['Date', 'Planifié', 'Arrivée', 'Retard', 'Statut'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {latenessRecords.map(record => (
                      <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-sm text-foreground capitalize">
                          {new Date(record.date + 'T12:00:00').toLocaleDateString('fr-FR', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {record.scheduled_time.slice(0, 5)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground">
                          {new Date(record.actual_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                            +{record.late_minutes} min
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleJustified(record)}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                              record.justified
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 rounded-full', record.justified ? 'bg-emerald-500' : 'bg-red-500')} />
                            {record.justified ? 'Justifié' : 'Non justifié'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: Documents */}
        {activeTab === 'documents' && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Archive className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Documents</h2>
            <p className="text-sm text-muted-foreground max-w-sm">Contrats signés, bulletins de salaire, justificatifs — disponible prochainement.</p>
          </div>
        )}
      </div>

      {/* Archive confirmation dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{employee.archived ? 'Désarchiver cet employé ?' : 'Archiver cet employé ?'}</DialogTitle>
            <DialogDescription>
              {employee.archived
                ? "L'employé redeviendra visible et actif dans l'application."
                : "L'employé sera masqué de la liste et du planning. Cette action est réversible."
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>Annuler</Button>
            <Button variant={employee.archived ? 'default' : 'destructive'} onClick={handleArchive}>
              {employee.archived ? 'Désarchiver' : 'Archiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create contract dialog */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau contrat</DialogTitle>
            <DialogDescription>Enregistrez un nouveau contrat pour cet employé.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Type de contrat</Label>
              <Select value={contractForm.type} onValueChange={v => setContractForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date de début</Label>
                <Input type="date" value={contractForm.start_date} onChange={e => setContractForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date de fin <span className="text-muted-foreground text-xs">(facultatif)</span></Label>
                <Input type="date" value={contractForm.end_date} onChange={e => setContractForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Volume horaire (h/sem.)</Label>
                <Input type="number" min="1" max="60" step="0.5" value={contractForm.weekly_hours} onChange={e => setContractForm(p => ({ ...p, weekly_hours: e.target.value }))} placeholder="35" />
              </div>
              <div className="space-y-1.5">
                <Label>Taux horaire brut (€) <span className="text-muted-foreground text-xs">(facultatif)</span></Label>
                <Input type="number" min="0" step="0.01" value={contractForm.hourly_rate} onChange={e => setContractForm(p => ({ ...p, hourly_rate: e.target.value }))} placeholder="11.88" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground text-xs">(facultatif)</span></Label>
              <Input value={contractForm.notes} onChange={e => setContractForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ex : Avenant volume horaire, renouvellement CDD..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractDialog(false)}>Annuler</Button>
            <Button onClick={handleCreateContract} disabled={!contractForm.type || !contractForm.start_date || !contractForm.weekly_hours}>
              Créer le contrat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
