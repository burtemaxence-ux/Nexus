'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, Save, Upload, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'

const TIMEZONES = [
  { value: 'Europe/Paris',        label: 'Europe/Paris (UTC+1/+2)' },
  { value: 'Europe/Brussels',     label: 'Europe/Brussels (UTC+1/+2)' },
  { value: 'Europe/Zurich',       label: 'Europe/Zurich (UTC+1/+2)' },
  { value: 'Europe/London',       label: 'Europe/London (UTC+0/+1)' },
  { value: 'America/New_York',    label: 'America/New_York (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8/-7)' },
]

type Fields = {
  establishment_name: string
  org_address: string
  org_phone: string
  org_email: string
  org_siret: string
  org_timezone: string
  org_logo: string
}

const EMPTY: Fields = {
  establishment_name: '',
  org_address: '',
  org_phone: '',
  org_email: '',
  org_siret: '',
  org_timezone: 'Europe/Paris',
  org_logo: '',
}

export default function OrganisationPage() {
  const [fields, setFields] = useState<Fields>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((s: Record<string, string>) => {
        setFields({
          establishment_name: s.establishment_name ?? '',
          org_address:  s.org_address  ?? '',
          org_phone:    s.org_phone    ?? '',
          org_email:    s.org_email    ?? '',
          org_siret:    s.org_siret    ?? '',
          org_timezone: s.org_timezone ?? 'Europe/Paris',
          org_logo:     s.org_logo     ?? '',
        })
        if (s.org_logo) setLogoPreview(s.org_logo)
      })
      .catch(() => {})
  }, [])

  function set(key: keyof Fields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setLogoError('Veuillez sélectionner une image (PNG, JPG, SVG…)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Image trop lourde (max 2 Mo)')
      return
    }

    setLogoError(null)
    setLogoUploading(true)
    setLogoPreview(URL.createObjectURL(file))

    try {
      await fetch('/api/storage/init', { method: 'POST' })

      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `org/logo-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true, cacheControl: '31536000' })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('logos').getPublicUrl(path)
      set('org_logo', data.publicUrl)
    } catch {
      setLogoError('Upload échoué — vérifiez que le bucket "logos" existe dans Supabase Storage.')
    } finally {
      setLogoUploading(false)
    }
  }

  function removeLogo() {
    setLogoPreview(null)
    set('org_logo', '')
    setLogoError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError("Erreur lors de l'enregistrement.")
    }
    setSaving(false)
  }

  const fieldLabel = (text: string) => (
    <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
      {text}
    </label>
  )

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <div className="mb-6">
        <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
          Organisation
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Informations légales et coordonnées de votre établissement
        </p>
      </div>

      <div className="overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
            <Building2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Informations de l&apos;établissement</p>
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Ces informations apparaissent dans vos exports et emails</p>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Logo */}
          <div>
            {fieldLabel('Logo')}
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                  <button
                    onClick={removeLogo}
                    className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full flex items-center justify-center transition-colors duration-150"
                    style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}
                  >
                    <X className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 rounded-xl flex items-center justify-center shrink-0" style={{ border: '1px dashed var(--border)', backgroundColor: 'var(--bg-page)' }}>
                  <Building2 className="h-6 w-6" style={{ color: 'var(--text-tertiary)' }} />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <button
                  type="button"
                  className="btn-secondary flex items-center gap-1.5 text-[12px]"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {logoUploading ? 'Upload en cours…' : 'Choisir une image'}
                </button>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>PNG, JPG, SVG · max 2 Mo</p>
                {logoError && <p className="text-[11px] mt-1" style={{ color: 'var(--danger)' }}>{logoError}</p>}
              </div>
            </div>
          </div>

          {/* Nom */}
          <div>
            {fieldLabel("Nom de l'établissement")}
            <Input
              id="org-name"
              value={fields.establishment_name}
              onChange={e => set('establishment_name', e.target.value)}
              placeholder="Ex : Bistrot du Marché"
              className="dp-input h-9 text-[13px]"
            />
          </div>

          {/* Adresse */}
          <div>
            {fieldLabel('Adresse')}
            <Input
              id="org-address"
              value={fields.org_address}
              onChange={e => set('org_address', e.target.value)}
              placeholder="Ex : 12 rue de la Paix, 75001 Paris"
              className="dp-input h-9 text-[13px]"
            />
          </div>

          {/* Téléphone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              {fieldLabel('Téléphone')}
              <Input
                id="org-phone"
                type="tel"
                value={fields.org_phone}
                onChange={e => set('org_phone', e.target.value)}
                placeholder="Ex : 01 23 45 67 89"
                className="dp-input h-9 text-[13px]"
              />
            </div>
            <div>
              {fieldLabel('Email')}
              <Input
                id="org-email"
                type="email"
                value={fields.org_email}
                onChange={e => set('org_email', e.target.value)}
                placeholder="Ex : contact@monrestaurant.fr"
                className="dp-input h-9 text-[13px]"
              />
            </div>
          </div>

          {/* SIRET + Fuseau */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              {fieldLabel('SIRET')}
              <Input
                id="org-siret"
                value={fields.org_siret}
                onChange={e => set('org_siret', e.target.value)}
                placeholder="123 456 789 00012"
                maxLength={17}
                className="dp-input h-9 text-[13px] font-mono tracking-wide"
              />
            </div>
            <div>
              {fieldLabel('Fuseau horaire')}
              <Select value={fields.org_timezone} onValueChange={v => set('org_timezone', v)}>
                <SelectTrigger id="org-timezone" className="dp-input h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value} className="text-[13px]">
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
          {error
            ? <p className="text-[12px]" style={{ color: 'var(--danger)' }}>{error}</p>
            : <span />
          }
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5 ml-auto">
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Enregistrement…' : saved ? 'Enregistré !' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
