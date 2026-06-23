'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
import { DocumentsTab } from '@/components/employees/documents-tab'
import {
  CONTRACT_TYPES,
  parseContractConfig,
  enabledContractTypes,
  type ContractType,
  type ContractTypesConfig,
} from '@/lib/contracts'

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
  const [contractConfig, setContractConfig] = useState<ContractTypesConfig | null>(null)
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
  // Données administratives
  const [matricule, setMatricule] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [nationality, setNationality] = useState('')
  const [address, setAddress] = useState('')
  const [ssn, setSsn] = useState('')
  const [iban, setIban] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [workPermitExpiry, setWorkPermitExpiry] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set())
  const [dayTimes, setDayTimes] = useState<Record<number, { start: string; end: string }>>({})

  // Contract form state
  const [contractForm, setContractForm] = useState({
    type: 'CDI 35h' as string,
    start_date: '',
    end_date: '',
    weekly_hours: '',
    hourly_rate: '',
    monthly_gross_salary: '',
    classification: '',
    coefficient: '',
    has_mutuelle: false,
    has_meal_vouchers: false,
    meal_voucher_value: '',
    has_transport_reimbursement: false,
    job_title: '',
    work_location: '',
    cdd_reason: '',
    trial_period_days: '61',
    notice_period_days: '30',
    paid_leave_days: '25',
    has_confidentiality: false,
    has_non_compete: false,
    notes: '',
  })

  // Auto-compute trial period when contract type or dates change
  useEffect(() => {
    if (!showContractDialog) return
    function computeTrialDays(type: string, start: string, end: string): number {
      if (type === 'Extra') return 0
      if (type === 'CDI 35h' || type === 'CDI 28h') return 61
      const durationDays = (start && end)
        ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
        : 0
      const months = durationDays / 30.44
      if (months <= 0) return 14
      if (months <= 6) return Math.min(14, Math.max(1, Math.ceil(durationDays / 7)))
      if (months <= 12) return 30
      return 61
    }
    const days = computeTrialDays(contractForm.type, contractForm.start_date, contractForm.end_date)
    const notice = ['CDD', 'CDD Saisonnier', 'Extra'].includes(contractForm.type) ? '0' : '30'
    setContractForm(p => ({ ...p, trial_period_days: days.toString(), notice_period_days: p.notice_period_days || notice }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractForm.type, contractForm.start_date, contractForm.end_date, showContractDialog])

  const load = useCallback(async () => {
    const supabase = createClient()
    const [empRes, contractsRes, availRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      fetch(`/api/employees/${id}/contracts`).then(r => r.json()),
      fetch(`/api/employees/${id}/availabilities`).then(r => r.json()),
      fetch('/api/settings').then(r => r.json()).catch(() => ({})),
    ])

    setContractConfig(parseContractConfig((settingsRes as Record<string, string>)?.contract_types_config))

    if (empRes.error || !empRes.data) { router.push('/manager/employees'); return }

    const emp = empRes.data as Profile
    setEmployee(emp)
    setFullName(emp.full_name ?? '')
    setPhone(emp.phone ?? '')
    setPosition(emp.position ?? '')
    setPayRef(emp.pay_ref ?? '')
    setDisability(emp.disability ?? false)
    setMatricule(emp.matricule ?? '')
    setBirthDate(emp.birth_date ?? '')
    setNationality(emp.nationality ?? '')
    setAddress(emp.address ?? '')
    setSsn(emp.social_security_number ?? '')
    setIban(emp.iban ?? '')
    setEmergencyName(emp.emergency_contact_name ?? '')
    setEmergencyPhone(emp.emergency_contact_phone ?? '')
    setWorkPermitExpiry(emp.work_permit_expiry ?? '')
    setAvatarUrl(emp.avatar_url ?? '')

    if (emp.invited_by) {
      const { data: inv } = await supabase.from('profiles').select('full_name').eq('id', emp.invited_by).single()
      setInvitedByName(inv?.full_name ?? null)
    }

    setContracts(Array.isArray(contractsRes) ? contractsRes : [])

    const avails: Availability[] = Array.isArray(availRes) ? availRes : []
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
        matricule: matricule.trim() || null,
        birth_date: birthDate || null,
        nationality: nationality.trim() || null,
        address: address.trim() || null,
        social_security_number: ssn.trim() || null,
        iban: iban.trim() || null,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
        work_permit_expiry: workPermitExpiry || null,
        avatar_url: avatarUrl || null,
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
        monthly_gross_salary: contractForm.monthly_gross_salary ? parseFloat(contractForm.monthly_gross_salary) : null,
        classification: contractForm.classification || null,
        coefficient: contractForm.coefficient || null,
        has_mutuelle: contractForm.has_mutuelle,
        has_meal_vouchers: contractForm.has_meal_vouchers,
        meal_voucher_value: contractForm.meal_voucher_value ? parseFloat(contractForm.meal_voucher_value) : null,
        has_transport_reimbursement: contractForm.has_transport_reimbursement,
        job_title: contractForm.job_title || null,
        work_location: contractForm.work_location || null,
        cdd_reason: contractForm.cdd_reason || null,
        trial_period_days: contractForm.trial_period_days ? parseInt(contractForm.trial_period_days) : null,
        notice_period_days: contractForm.notice_period_days ? parseInt(contractForm.notice_period_days) : null,
        paid_leave_days: contractForm.paid_leave_days ? parseInt(contractForm.paid_leave_days) : 25,
        has_confidentiality: contractForm.has_confidentiality,
        has_non_compete: contractForm.has_non_compete,
        notes: contractForm.notes || null,
      }),
    })
    if (res.ok) {
      setShowContractDialog(false)
      setContractForm({
        type: 'CDI 35h', start_date: '', end_date: '', weekly_hours: '', hourly_rate: '',
        monthly_gross_salary: '', classification: '', coefficient: '',
        has_mutuelle: false, has_meal_vouchers: false, meal_voucher_value: '', has_transport_reimbursement: false,
        job_title: '', work_location: '', cdd_reason: '',
        trial_period_days: '61', notice_period_days: '30', paid_leave_days: '25',
        has_confidentiality: false, has_non_compete: false, notes: '',
      })
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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setAvatarError('Veuillez sélectionner une image.'); return }
    if (file.size > 2 * 1024 * 1024) { setAvatarError('Image trop lourde (max 2 Mo).'); return }
    setAvatarError(null)
    setAvatarUploading(true)
    try {
      await fetch('/api/storage/init', { method: 'POST' })
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${id}/avatar-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '31536000' })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    } catch {
      setAvatarError('Upload échoué — réessayez.')
    } finally {
      setAvatarUploading(false)
    }
  }

  function removeAvatar() {
    setAvatarUrl('')
    setAvatarError(null)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!employee) return null

  // Types proposés dans le dialogue de contrat : ceux activés en réglages, en
  // gardant toujours le type courant même s'il a été désactivé entre-temps.
  const baseContractTypes = contractConfig ? enabledContractTypes(contractConfig) : [...CONTRACT_TYPES]
  const contractTypeOptions = baseContractTypes.includes(contractForm.type as ContractType)
    ? baseContractTypes
    : [contractForm.type as ContractType, ...baseContractTypes]

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <div className="px-4 md:px-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-4 py-4">
            <button
              onClick={() => router.push('/manager/employees')}
              className="p-1.5 rounded-md transition-colors duration-150"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: 'var(--accent-light)' }}>
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
                    {getInitials(employee.full_name ?? employee.email)}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
                    {employee.full_name ?? 'Sans nom'}
                  </h1>
                  {employee.archived && <span className="dp-badge-warning">Archivé</span>}
                  <span className="dp-badge-info">Employé</span>
                </div>
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{employee.email}</p>
              </div>
            </div>
          </div>
          {/* Tabs */}
          <nav className="flex gap-0 -mb-px overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] whitespace-nowrap transition-colors duration-150"
                  style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 md:px-6 py-8 max-w-6xl mx-auto">

        {/* TAB: Informations personnelles */}
        {activeTab === 'info' && (
          <div className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations personnelles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Photo de profil */}
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--accent-light)', border: '0.5px solid var(--border)' }}>
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="Photo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[18px] font-medium" style={{ color: 'var(--accent)' }}>
                        {getInitials(employee.full_name ?? employee.email)}
                      </span>
                    )}
                  </div>
                  <div>
                    <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} className="gap-1.5">
                        {avatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {avatarUploading ? 'Upload…' : 'Choisir une photo'}
                      </Button>
                      {avatarUrl && (
                        <Button variant="ghost" size="sm" onClick={removeAvatar} className="text-muted-foreground">Retirer</Button>
                      )}
                    </div>
                    <p className="text-[11px] mt-1.5 text-muted-foreground">PNG, JPG · max 2 Mo</p>
                    {avatarError && <p className="text-[11px] mt-1" style={{ color: 'var(--danger)' }}>{avatarError}</p>}
                  </div>
                </div>

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

            {/* Informations administratives */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations administratives</CardTitle>
                <CardDescription>État civil, coordonnées et données utiles à la paie et aux déclarations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Matricule</Label>
                    <Input value={matricule} onChange={e => setMatricule(e.target.value)} placeholder="Ex : EMP001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date de naissance</Label>
                    <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nationalité</Label>
                    <Input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="Française" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>N° de sécurité sociale</Label>
                    <Input value={ssn} onChange={e => setSsn(e.target.value)} placeholder="1 85 12 75…" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Adresse postale</Label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="12 rue de la Paix, 75002 Paris" />
                </div>
                <div className="space-y-1.5">
                  <Label>IBAN</Label>
                  <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="FR76 …" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="space-y-1.5 pt-4">
                    <Label>Contact d&apos;urgence</Label>
                    <Input value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Nom du proche" />
                  </div>
                  <div className="space-y-1.5 pt-4">
                    <Label>Téléphone d&apos;urgence</Label>
                    <Input value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="06 …" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Titre de séjour — expiration <span className="text-muted-foreground font-normal">(si hors UE)</span></Label>
                  <Input type="date" value={workPermitExpiry} onChange={e => setWorkPermitExpiry(e.target.value)} className="max-w-sm" />
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
                  <Card key={contract.id} style={i === 0 ? { borderColor: 'var(--accent)', backgroundColor: 'var(--accent-light)' } : {}}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={i === 0 ? 'default' : 'outline'} className="text-xs">
                              {contract.type}
                            </Badge>
                            {i === 0 && <span className="text-xs text-primary font-medium">Actuel</span>}
                            {contract.job_title && (
                              <span className="text-xs text-muted-foreground">— {contract.job_title}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {contract.weekly_hours}h/sem.
                            </span>
                            {contract.hourly_rate && <span>{contract.hourly_rate}€/h brut</span>}
                            {contract.monthly_gross_salary && <span>{contract.monthly_gross_salary.toLocaleString('fr-FR')}€/mois brut</span>}
                            <span>
                              Du {formatDate(contract.start_date)}
                              {contract.end_date ? ` au ${formatDate(contract.end_date)}` : ' (en cours)'}
                            </span>
                            {contract.work_location && <span>📍 {contract.work_location}</span>}
                          </div>
                          {(contract.classification || contract.coefficient) && (
                            <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground mt-1">
                              {contract.classification && <span>{contract.classification}</span>}
                              {contract.coefficient && <span>Coef. {contract.coefficient}</span>}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                            {contract.trial_period_days != null && contract.trial_period_days > 0 && (
                              <span>Essai : {contract.trial_period_days}j</span>
                            )}
                            {contract.notice_period_days != null && contract.notice_period_days > 0 && (
                              <span>Préavis : {contract.notice_period_days}j</span>
                            )}
                            {contract.paid_leave_days != null && (
                              <span>CP : {contract.paid_leave_days}j/an</span>
                            )}
                            {contract.has_confidentiality && (
                              <span className="dp-badge-info">Confidentialité</span>
                            )}
                            {contract.has_non_compete && (
                              <span className="dp-badge-info">Non-concurrence</span>
                            )}
                            {contract.has_mutuelle && (
                              <span className="dp-badge-info">Mutuelle</span>
                            )}
                            {contract.has_meal_vouchers && (
                              <span className="dp-badge-info">
                                Tickets resto{contract.meal_voucher_value ? ` ${contract.meal_voucher_value}€` : ''}
                              </span>
                            )}
                            {contract.has_transport_reimbursement && (
                              <span className="dp-badge-info">Transport 50 %</span>
                            )}
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
                  { label: 'Total retards', value: latenessRecords.length, color: 'var(--warning)', bg: '#FEF3C7', border: 'var(--warning)' },
                  { label: 'Minutes perdues', value: `${latenessRecords.reduce((s, r) => s + r.late_minutes, 0)} min`, color: 'var(--danger)', bg: '#FEE2E2', border: 'var(--danger)' },
                  { label: 'Non justifiés', value: latenessRecords.filter(r => !r.justified).length, color: 'var(--text-secondary)', bg: 'var(--bg-page)', border: 'var(--border)' },
                ].map(({ label, value, color, bg, border }) => (
                  <div key={label} className="rounded-[10px] p-3 text-center" style={{ backgroundColor: bg, border: `0.5px solid ${border}` }}>
                    <p className="text-[20px] font-[400] leading-none" style={{ color }}>{value}</p>
                    <p className="text-[10px] uppercase tracking-[0.06em] mt-2" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
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
                          <span className="dp-badge-warning">+{record.late_minutes} min</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleJustified(record)}
                            className={cn(
                              'inline-flex items-center gap-1.5 transition-colors duration-150',
                              record.justified ? 'dp-badge-success' : 'dp-badge-danger'
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: record.justified ? 'var(--success)' : 'var(--danger)' }} />
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
          <DocumentsTab employeeId={id} />
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
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau contrat</DialogTitle>
            <DialogDescription>Enregistrez un nouveau contrat pour cet employé.</DialogDescription>
          </DialogHeader>

          {/* Alerts */}
          {(() => {
            const SMIC = 11.88
            const hours = parseFloat(contractForm.weekly_hours)
            const rate = parseFloat(contractForm.hourly_rate)
            const isCDD = ['CDD', 'CDD Saisonnier'].includes(contractForm.type)
            const alerts: { level: 'warning' | 'error'; msg: string }[] = []
            if (contractForm.hourly_rate && !isNaN(rate) && rate < SMIC)
              alerts.push({ level: 'warning', msg: `Taux inférieur au SMIC (${SMIC} €/h).` })
            if (isCDD && !contractForm.end_date)
              alerts.push({ level: 'warning', msg: 'La date de fin est obligatoire pour un CDD (art. L.1242-7).' })
            if (!isNaN(hours) && hours > 48)
              alerts.push({ level: 'error', msg: 'Dépassement du maximum légal absolu (48 h/sem.).' })
            else if (!isNaN(hours) && hours > 44)
              alerts.push({ level: 'warning', msg: 'Volume proche du plafond légal (48 h/sem.).' })
            if (alerts.length === 0) return null
            return (
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className={cn(
                    'flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm',
                    a.level === 'error'
                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                      : 'bg-amber-50 text-amber-800 border border-amber-200',
                  )}>
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    {a.msg}
                  </div>
                ))}
              </div>
            )
          })()}

          <div className="space-y-5 py-1">
            {/* Section: Identification */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Identification du poste</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Intitulé du poste</Label>
                  <Input
                    value={contractForm.job_title}
                    onChange={e => setContractForm(p => ({ ...p, job_title: e.target.value }))}
                    placeholder="Ex : Cuisinier, Chef de rang…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lieu de travail</Label>
                  <Input
                    value={contractForm.work_location}
                    onChange={e => setContractForm(p => ({ ...p, work_location: e.target.value }))}
                    placeholder="Ex : 12 rue de la Paix, Paris"
                  />
                </div>
              </div>
            </div>

            {/* Section: Type & Dates */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Type & durée</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Type de contrat</Label>
                  <Select value={contractForm.type} onValueChange={v => setContractForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {contractTypeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date de début</Label>
                    <Input type="date" value={contractForm.start_date} onChange={e => setContractForm(p => ({ ...p, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Date de fin
                      {['CDD', 'CDD Saisonnier'].includes(contractForm.type)
                        ? <span className="ml-1 text-destructive text-xs">*</span>
                        : <span className="ml-1 text-muted-foreground text-xs">(facultatif)</span>
                      }
                    </Label>
                    <Input type="date" value={contractForm.end_date} onChange={e => setContractForm(p => ({ ...p, end_date: e.target.value }))} />
                  </div>
                </div>
                {['CDD', 'CDD Saisonnier'].includes(contractForm.type) && (
                  <div className="space-y-1.5">
                    <Label>Motif du CDD <span className="text-destructive text-xs">*</span></Label>
                    <Select value={contractForm.cdd_reason} onValueChange={v => setContractForm(p => ({ ...p, cdd_reason: v }))}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un motif…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accroissement">Accroissement temporaire d&apos;activité</SelectItem>
                        <SelectItem value="remplacement_salarie">Remplacement d&apos;un salarié absent</SelectItem>
                        <SelectItem value="saisonnier">Emploi saisonnier</SelectItem>
                        <SelectItem value="usage">Contrat d&apos;usage (secteur HCR)</SelectItem>
                        <SelectItem value="remplacement_chef">Remplacement d&apos;un chef d&apos;entreprise</SelectItem>
                        <SelectItem value="autre">Autre (préciser dans les notes)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Section: Rémunération */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Rémunération</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Volume horaire (h/sem.) <span className="text-destructive text-xs">*</span></Label>
                  <Input
                    type="number" min="1" max="60" step="0.5"
                    value={contractForm.weekly_hours}
                    onChange={e => setContractForm(p => ({ ...p, weekly_hours: e.target.value }))}
                    placeholder="35"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Taux horaire brut (€) <span className="text-muted-foreground text-xs">(facultatif)</span></Label>
                  <div className="relative">
                    <Input
                      type="number" min="0" step="0.01"
                      value={contractForm.hourly_rate}
                      onChange={e => setContractForm(p => ({ ...p, hourly_rate: e.target.value }))}
                      placeholder="11.88"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">SMIC 2025 : 11.88 €/h</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Salaire brut mensuel (€) <span className="text-muted-foreground text-xs">(facultatif)</span></Label>
                  <div className="relative">
                    <Input
                      type="number" min="0" step="0.01"
                      value={contractForm.monthly_gross_salary}
                      onChange={e => setContractForm(p => ({ ...p, monthly_gross_salary: e.target.value }))}
                      placeholder="1801.80"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Classification & avantages */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Classification & avantages</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Classification <span className="text-muted-foreground text-xs">(convention)</span></Label>
                  <Input
                    value={contractForm.classification}
                    onChange={e => setContractForm(p => ({ ...p, classification: e.target.value }))}
                    placeholder="Ex : Niveau II — Échelon 1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Coefficient</Label>
                  <Input
                    value={contractForm.coefficient}
                    onChange={e => setContractForm(p => ({ ...p, coefficient: e.target.value }))}
                    placeholder="Ex : 190"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2.5 mt-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={contractForm.has_mutuelle}
                    onChange={e => setContractForm(p => ({ ...p, has_mutuelle: e.target.checked }))}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">Mutuelle d&apos;entreprise</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={contractForm.has_transport_reimbursement}
                    onChange={e => setContractForm(p => ({ ...p, has_transport_reimbursement: e.target.checked }))}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">Transport (50 %)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={contractForm.has_meal_vouchers}
                    onChange={e => setContractForm(p => ({ ...p, has_meal_vouchers: e.target.checked }))}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">Tickets restaurant</span>
                </label>
                {contractForm.has_meal_vouchers && (
                  <div className="relative w-32">
                    <Input
                      type="number" min="0" step="0.01"
                      value={contractForm.meal_voucher_value}
                      onChange={e => setContractForm(p => ({ ...p, meal_voucher_value: e.target.value }))}
                      placeholder="Valeur"
                      className="pr-8 h-9"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section: Conditions */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Conditions</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Période d&apos;essai (jours)</Label>
                  <Input
                    type="number" min="0" max="180" step="1"
                    value={contractForm.trial_period_days}
                    onChange={e => setContractForm(p => ({ ...p, trial_period_days: e.target.value }))}
                    placeholder="0"
                  />
                  <p className="text-[10px] text-muted-foreground">Auto-calculé — modifiable</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Préavis (jours)</Label>
                  <Select
                    value={contractForm.notice_period_days}
                    onValueChange={v => setContractForm(p => ({ ...p, notice_period_days: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Aucun</SelectItem>
                      <SelectItem value="7">7 jours</SelectItem>
                      <SelectItem value="14">14 jours</SelectItem>
                      <SelectItem value="30">30 jours</SelectItem>
                      <SelectItem value="60">60 jours</SelectItem>
                      <SelectItem value="90">90 jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Congés payés (jours/an)</Label>
                  <Input
                    type="number" min="0" max="60" step="1"
                    value={contractForm.paid_leave_days}
                    onChange={e => setContractForm(p => ({ ...p, paid_leave_days: e.target.value }))}
                    placeholder="25"
                  />
                </div>
              </div>
            </div>

            {/* Section: Clauses */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Clauses</p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={contractForm.has_confidentiality}
                    onChange={e => setContractForm(p => ({ ...p, has_confidentiality: e.target.checked }))}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">Clause de confidentialité</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={contractForm.has_non_compete}
                    onChange={e => setContractForm(p => ({ ...p, has_non_compete: e.target.checked }))}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">Clause de non-concurrence</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground text-xs">(facultatif)</span></Label>
              <Input
                value={contractForm.notes}
                onChange={e => setContractForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Avenant, renouvellement, précisions motif CDD…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractDialog(false)}>Annuler</Button>
            <Button
              onClick={handleCreateContract}
              disabled={!contractForm.type || !contractForm.start_date || !contractForm.weekly_hours}
            >
              Créer le contrat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
