'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, Save, Upload, X } from 'lucide-react'
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
import { createClient } from '@/lib/supabase/client'

const TIMEZONES = [
  { value: 'Europe/Paris',       label: 'Europe/Paris (UTC+1/+2)' },
  { value: 'Europe/Brussels',    label: 'Europe/Brussels (UTC+1/+2)' },
  { value: 'Europe/Zurich',      label: 'Europe/Zurich (UTC+1/+2)' },
  { value: 'Europe/London',      label: 'Europe/London (UTC+0/+1)' },
  { value: 'America/New_York',   label: 'America/New_York (UTC-5/-4)' },
  { value: 'America/Los_Angeles',label: 'America/Los_Angeles (UTC-8/-7)' },
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

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Organisation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Informations légales et coordonnées de votre établissement
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Informations de l&apos;établissement</p>
            <p className="text-xs text-gray-500">Ces informations apparaissent dans vos exports et emails</p>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Logo */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Logo</Label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative h-16 w-16 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                  <button
                    onClick={removeLogo}
                    className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center shrink-0 bg-gray-50">
                  <Building2 className="h-6 w-6 text-gray-300" />
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {logoUploading ? 'Upload en cours…' : 'Choisir une image'}
                </Button>
                <p className="text-xs text-gray-400 mt-1.5">PNG, JPG, SVG · max 2 Mo</p>
                {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
              </div>
            </div>
          </div>

          {/* Nom */}
          <div>
            <Label htmlFor="org-name" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Nom de l&apos;établissement
            </Label>
            <Input
              id="org-name"
              value={fields.establishment_name}
              onChange={e => set('establishment_name', e.target.value)}
              placeholder="Ex : Bistrot du Marché"
              className="h-9 text-sm"
            />
          </div>

          {/* Adresse */}
          <div>
            <Label htmlFor="org-address" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Adresse
            </Label>
            <Input
              id="org-address"
              value={fields.org_address}
              onChange={e => set('org_address', e.target.value)}
              placeholder="Ex : 12 rue de la Paix, 75001 Paris"
              className="h-9 text-sm"
            />
          </div>

          {/* Téléphone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="org-phone" className="text-sm font-medium text-gray-700 mb-1.5 block">
                Téléphone
              </Label>
              <Input
                id="org-phone"
                type="tel"
                value={fields.org_phone}
                onChange={e => set('org_phone', e.target.value)}
                placeholder="Ex : 01 23 45 67 89"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="org-email" className="text-sm font-medium text-gray-700 mb-1.5 block">
                Email
              </Label>
              <Input
                id="org-email"
                type="email"
                value={fields.org_email}
                onChange={e => set('org_email', e.target.value)}
                placeholder="Ex : contact@monrestaurant.fr"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* SIRET + Fuseau */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="org-siret" className="text-sm font-medium text-gray-700 mb-1.5 block">
                SIRET
              </Label>
              <Input
                id="org-siret"
                value={fields.org_siret}
                onChange={e => set('org_siret', e.target.value)}
                placeholder="123 456 789 00012"
                maxLength={17}
                className="h-9 text-sm font-mono tracking-wide"
              />
            </div>
            <div>
              <Label htmlFor="org-timezone" className="text-sm font-medium text-gray-700 mb-1.5 block">
                Fuseau horaire
              </Label>
              <Select value={fields.org_timezone} onValueChange={v => set('org_timezone', v)}>
                <SelectTrigger id="org-timezone" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value} className="text-sm">
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          {error
            ? <p className="text-sm text-red-600">{error}</p>
            : <span />
          }
          <Button onClick={handleSave} disabled={saving} className="gap-2 ml-auto">
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement…' : saved ? 'Enregistré !' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  )
}
