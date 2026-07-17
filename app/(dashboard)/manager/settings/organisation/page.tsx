'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Building2, Scale, ShieldCheck, Save, Upload, ImagePlus, Globe, Check, Minus, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const COUNTRIES = ['France', 'Belgique', 'Suisse', 'Luxembourg', 'Autre']
const TIMEZONES = [
  'Europe/Paris (UTC+1/+2)',
  'Europe/Brussels (UTC+1/+2)',
  'Europe/Zurich (UTC+1/+2)',
  'Europe/London (UTC+0/+1)',
  'America/New_York (UTC-5/-4)',
  'America/Los_Angeles (UTC-8/-7)',
]
const CURRENCIES = ['Euro (€)', 'Franc suisse (CHF)', 'Livre sterling (£)', 'Dollar US ($)']
const LEGAL_FORMS = ['SARL', 'SAS', 'SASU', 'EURL', 'EI', 'SA', 'SNC', 'SCI', 'Association', 'Autre']

type Fields = {
  establishment_name: string
  org_legal_name: string
  org_address: string
  org_postal_code: string
  org_city: string
  org_country: string
  org_phone: string
  org_email: string
  org_website: string
  org_siret: string
  org_timezone: string
  org_currency: string
  org_legal_form: string
  org_capital: string
  org_ape_code: string
  org_vat: string
  org_rcs: string
  org_urssaf: string
  org_logo: string
}

const EMPTY: Fields = {
  establishment_name: '',
  org_legal_name: '',
  org_address: '',
  org_postal_code: '',
  org_city: '',
  org_country: 'France',
  org_phone: '',
  org_email: '',
  org_website: '',
  org_siret: '',
  org_timezone: 'Europe/Paris (UTC+1/+2)',
  org_currency: 'Euro (€)',
  org_legal_form: '',
  org_capital: '',
  org_ape_code: '',
  org_vat: '',
  org_rcs: '',
  org_urssaf: '',
  org_logo: '',
}

// Champs pris en compte dans la jauge de complétion (le logo est exclu).
const COMPLETION_FIELDS: (keyof Fields)[] = [
  'establishment_name', 'org_legal_name', 'org_address', 'org_postal_code', 'org_city',
  'org_country', 'org_phone', 'org_email', 'org_website', 'org_siret', 'org_timezone',
  'org_currency', 'org_legal_form', 'org_capital', 'org_ape_code', 'org_vat', 'org_rcs', 'org_urssaf',
]

const ORG_CIRC = 113.1

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
        setFields(prev => {
          const next = { ...prev }
          for (const k of Object.keys(EMPTY) as (keyof Fields)[]) {
            if (s[k] != null && s[k] !== '') next[k] = s[k]
          }
          return next
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

  // ── Jauge de complétion live ──
  const filled = COMPLETION_FIELDS.reduce((n, k) => n + ((fields[k] || '').trim() ? 1 : 0), 0)
  const orgPct = Math.round((filled / COMPLETION_FIELDS.length) * 100)
  const orgDash = (ORG_CIRC * (1 - orgPct / 100)).toFixed(1)
  const orgMsg =
    orgPct >= 100 ? 'Profil complet — tout est prêt pour vos exports et bulletins.'
    : orgPct >= 60 ? 'Presque terminé. Encore quelques champs pour un profil impeccable.'
    : orgPct >= 25 ? 'Bon départ ! Complétez les informations pour fiabiliser vos documents.'
    : 'Renseignez les coordonnées de votre établissement pour commencer.'
  const orgChecks = [
    { label: 'Coordonnées', done: orgPct >= 25 },
    { label: 'Identité légale', done: orgPct >= 60 },
    { label: 'Fiscalité', done: orgPct >= 90 },
  ]

  return (
    <div className="nx-planpage" style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Completion hero */}
      <div className="nx-org-hero">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', opacity: .85 }}>Établissement · Identité</p>
            <p style={{ fontSize: 19, fontWeight: 700, fontFamily: "'Syne',sans-serif", letterSpacing: '-.01em', marginTop: 5 }}>Profil de votre établissement</p>
            <p style={{ fontSize: 12.5, opacity: .85, marginTop: 6, lineHeight: 1.5, maxWidth: 380 }}>{orgMsg}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ position: 'relative', width: 78, height: 78 }}>
              <svg width="78" height="78" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="4" />
                <circle
                  cx="22" cy="22" r="18" fill="none" stroke="#8AF5DC" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={ORG_CIRC} strokeDashoffset={orgDash}
                  style={{ transition: 'stroke-dashoffset .55s cubic-bezier(.2,.7,.2,1)' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 19, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{orgPct}%</span>
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', opacity: .85 }}>Complété</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          {orgChecks.map(c => (
            <span key={c.label} className={`nx-orgcheck ${c.done ? 'done' : ''}`}>
              <span className="dot">{c.done ? <Check className="ic10" /> : <Minus className="ic10" />}</span>
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* Coordonnées card */}
      <div className="nx-card">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '18px 24px', borderBottom: '0.5px solid var(--border)' }}>
          <div className="nx-ico" style={{ width: 38, height: 38, background: 'var(--accent-light)' }}><Building2 className="ic18" style={{ color: 'var(--accent)' }} /></div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.01em' }}>Coordonnées de l&apos;établissement</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Nom, adresse et contacts visibles sur vos documents</p>
          </div>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Logo */}
          <div>
            <label className="nx-label">Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {logoPreview ? (
                <div style={{ position: 'relative', width: 64, height: 64, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <button onClick={removeLogo} className="nx-iconbtn" style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, background: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
                    <X className="ic12" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-page)', border: '1.5px dashed var(--border-hover)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(108,99,255,.06),rgba(0,212,170,.06))' }} />
                  <ImagePlus className="ic20" style={{ color: 'var(--accent)', position: 'relative' }} />
                </div>
              )}
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} id="logo-upload" />
                <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '8px 14px' }} onClick={() => fileInputRef.current?.click()} disabled={logoUploading}>
                  <Upload className="ic14" />{logoUploading ? 'Upload en cours…' : 'Choisir une image'}
                </button>
                <p style={{ fontSize: 11, marginTop: 7, color: 'var(--text-tertiary)' }}>PNG, JPG, SVG · max 2 Mo · fond transparent conseillé</p>
                {logoError && <p style={{ fontSize: 11, marginTop: 4, color: 'var(--danger)' }}>{logoError}</p>}
              </div>
            </div>
          </div>

          <div>
            <label className="nx-label">Nom commercial <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input className="nx-input" value={fields.establishment_name} onChange={e => set('establishment_name', e.target.value)} placeholder="Ex : Bistrot du Marché" />
            <p className="nx-hint">Nom affiché sur les plannings, exports et emails envoyés à l&apos;équipe.</p>
          </div>

          <div>
            <label className="nx-label">Raison sociale</label>
            <input className="nx-input" value={fields.org_legal_name} onChange={e => set('org_legal_name', e.target.value)} placeholder="Ex : Le Bistrot du Marché SARL" />
            <p className="nx-hint">Dénomination légale, si elle diffère du nom commercial.</p>
          </div>

          <div>
            <label className="nx-label">Adresse <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input className="nx-input" value={fields.org_address} onChange={e => set('org_address', e.target.value)} placeholder="Ex : 12 rue de la Paix" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 16 }}>
            <div>
              <label className="nx-label">Code postal</label>
              <input className="nx-input" style={{ fontVariantNumeric: 'tabular-nums' }} value={fields.org_postal_code} onChange={e => set('org_postal_code', e.target.value)} placeholder="75001" />
            </div>
            <div>
              <label className="nx-label">Ville</label>
              <input className="nx-input" value={fields.org_city} onChange={e => set('org_city', e.target.value)} placeholder="Paris" />
            </div>
            <div>
              <label className="nx-label">Pays</label>
              <select className="nx-input" value={fields.org_country} onChange={e => set('org_country', e.target.value)}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="nx-label">Téléphone</label>
              <input className="nx-input" type="tel" value={fields.org_phone} onChange={e => set('org_phone', e.target.value)} placeholder="Ex : 01 23 45 67 89" />
              <p className="nx-hint">Contact principal de l&apos;établissement.</p>
            </div>
            <div>
              <label className="nx-label">Email <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="nx-input" type="email" value={fields.org_email} onChange={e => set('org_email', e.target.value)} placeholder="Ex : contact@monrestaurant.fr" />
              <p className="nx-hint">Sert d&apos;expéditeur pour les notifications d&apos;équipe.</p>
            </div>
          </div>

          <div>
            <label className="nx-label">Site web</label>
            <div style={{ position: 'relative' }}>
              <Globe className="ic14" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input className="nx-input" style={{ paddingLeft: 34 }} value={fields.org_website} onChange={e => set('org_website', e.target.value)} placeholder="https://monrestaurant.fr" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="nx-label">SIRET <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="nx-input" maxLength={17} style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '.03em' }} value={fields.org_siret} onChange={e => set('org_siret', e.target.value)} placeholder="123 456 789 00012" />
              <p className="nx-hint">14 chiffres · vérifié automatiquement.</p>
            </div>
            <div>
              <label className="nx-label">Fuseau horaire</label>
              <select className="nx-input" value={fields.org_timezone} onChange={e => set('org_timezone', e.target.value)}>
                {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <p className="nx-hint">Utilisé pour l&apos;affichage des horaires et pointages.</p>
            </div>
          </div>

          <div>
            <label className="nx-label">Devise</label>
            <div style={{ display: 'flex', gap: 8, maxWidth: 260 }}>
              <select className="nx-input" style={{ flex: 1 }} value={fields.org_currency} onChange={e => set('org_currency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <p className="nx-hint">Appliquée aux coûts et estimations de masse salariale.</p>
          </div>
        </div>
      </div>

      {/* Juridique card */}
      <div className="nx-card">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '18px 24px', borderBottom: '0.5px solid var(--border)' }}>
          <div className="nx-ico" style={{ width: 38, height: 38, background: 'rgba(0,212,170,.12)' }}><Scale className="ic18" style={{ color: 'var(--emerald)' }} /></div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.01em' }}>Informations juridiques</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Requises pour vos mentions légales et documents RH</p>
          </div>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="nx-label">Forme juridique</label>
              <select className="nx-input" value={fields.org_legal_form} onChange={e => set('org_legal_form', e.target.value)}>
                <option value="">Sélectionner</option>
                {LEGAL_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="nx-label">Capital social</label>
              <input className="nx-input" value={fields.org_capital} onChange={e => set('org_capital', e.target.value)} placeholder="Ex : 10 000 €" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="nx-label">Code APE / NAF</label>
              <input className="nx-input" style={{ fontVariantNumeric: 'tabular-nums' }} value={fields.org_ape_code} onChange={e => set('org_ape_code', e.target.value)} placeholder="Ex : 5610A" />
            </div>
            <div>
              <label className="nx-label">TVA intracommunautaire</label>
              <input className="nx-input" style={{ fontVariantNumeric: 'tabular-nums' }} value={fields.org_vat} onChange={e => set('org_vat', e.target.value)} placeholder="Ex : FR 12 345678901" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="nx-label">RCS</label>
              <input className="nx-input" value={fields.org_rcs} onChange={e => set('org_rcs', e.target.value)} placeholder="Ex : RCS Paris 123 456 789" />
            </div>
            <div>
              <label className="nx-label">N° URSSAF</label>
              <input className="nx-input" value={fields.org_urssaf} onChange={e => set('org_urssaf', e.target.value)} placeholder="Compte cotisant" />
            </div>
          </div>
        </div>
      </div>

      {/* RGPD footer + save */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <ShieldCheck className="ic16" style={{ color: 'var(--emerald)', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {error ? <span style={{ color: 'var(--danger)' }}>{error}</span> : 'Chiffré et stocké en France · conforme RGPD'}
          </p>
        </div>
        <button className="btn-primary" style={{ flexShrink: 0 }} onClick={handleSave} disabled={saving}>
          <Save className="ic14" />
          {saving ? 'Enregistrement…' : saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
