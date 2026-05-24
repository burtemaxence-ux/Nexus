'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Copy, Check, ExternalLink } from 'lucide-react'
import type { Poste } from '@/types'

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employé' },
  { value: 'supervisor', label: 'Superviseur' },
  { value: 'manager', label: 'Manager' },
] as const

const CONTRACT_TYPES = ['CDI 35h', 'CDI 28h', 'CDD', 'CDD Saisonnier', 'Extra'] as const

export default function NewEmployeePage() {
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<string>('employee')
  const [position, setPosition] = useState('')
  const [contractType, setContractType] = useState('')
  const [weeklyHours, setWeeklyHours] = useState('')
  const [startDate, setStartDate] = useState('')

  const [postes, setPostes] = useState<Poste[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [invitedFullName, setInvitedFullName] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/postes')
      .then(r => r.json())
      .then((data: Poste[]) => Array.isArray(data) && setPostes(data))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Prénom, nom et email sont requis.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          role,
          position: position || undefined,
          contract_type: contractType || undefined,
          weekly_hours: weeklyHours ? parseFloat(weeklyHours) : undefined,
          start_date: startDate || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Une erreur est survenue.')
        return
      }

      setInviteLink(data.inviteLink)
      setInvitedFullName(data.full_name ?? `${firstName.trim()} ${lastName.trim()}`)
    } catch {
      setError('Impossible de contacter le serveur. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/manager" className="text-sm text-gray-500 hover:text-gray-700">Tableau de bord</Link>
          <span className="text-gray-400">/</span>
          <Link href="/manager/employees" className="text-sm text-gray-500 hover:text-gray-700">Équipe</Link>
          <span className="text-gray-400">/</span>
          <span className="text-sm text-gray-700 font-medium">Inviter</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Inviter un membre</h1>
        <p className="text-gray-500 mt-1">
          Un lien d&apos;accès sera généré — partagez-le par SMS, WhatsApp ou email.
        </p>
      </div>

      {!inviteLink ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations du membre</CardTitle>
            <CardDescription>Renseignez les informations de votre nouveau collaborateur.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Identité */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identité</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name">Prénom *</Label>
                    <Input
                      id="first_name"
                      placeholder="Marie"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last_name">Nom *</Label>
                    <Input
                      id="last_name"
                      placeholder="Dupont"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="marie.dupont@exemple.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="06 12 34 56 78"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Rôle & Poste */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Rôle & Poste</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="role">Rôle *</Label>
                    <Select value={role} onValueChange={setRole} disabled={loading}>
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-gray-400">Détermine les permissions de l&apos;accès</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="position">Poste</Label>
                    <Select value={position} onValueChange={setPosition} disabled={loading}>
                      <SelectTrigger id="position">
                        <SelectValue placeholder="Sélectionner un poste" />
                      </SelectTrigger>
                      <SelectContent>
                        {postes.length > 0 ? (
                          postes.map(p => (
                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="_none" disabled>Aucun poste configuré</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contrat */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contrat</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contract_type">Type de contrat</Label>
                    <Select value={contractType} onValueChange={setContractType} disabled={loading}>
                      <SelectTrigger id="contract_type">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTRACT_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="weekly_hours">Volume horaire (h/sem.)</Label>
                    <Input
                      id="weekly_hours"
                      type="number"
                      min="1"
                      max="60"
                      step="0.5"
                      placeholder="35"
                      value={weeklyHours}
                      onChange={e => setWeeklyHours(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="mt-4 max-w-xs space-y-1.5">
                  <Label htmlFor="start_date">Date de début</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    disabled={loading}
                  />
                  {contractType && startDate && weeklyHours && (
                    <p className="text-[11px] text-green-600">Un contrat sera automatiquement créé dans la fiche employé.</p>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 border-t">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération…</>
                    : 'Générer le lien d\'invitation'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-700">✓ Compte créé</CardTitle>
            <CardDescription>
              Partagez ce lien avec <strong>{invitedFullName}</strong> — il lui permettra de définir son mot de passe et d&apos;accéder à son espace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500 mb-1.5 font-medium">Lien d&apos;invitation</p>
              <p className="text-xs text-gray-700 break-all font-mono leading-relaxed">{inviteLink}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCopy} className="flex-1 gap-2" variant={copied ? 'outline' : 'default'}>
                {copied
                  ? <><Check className="h-4 w-4 text-green-600" />Copié !</>
                  : <><Copy className="h-4 w-4" />Copier le lien</>}
              </Button>
              <Button variant="outline" size="icon" asChild title="Ouvrir le lien">
                <a href={inviteLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <p className="text-xs text-gray-400">
              Ce lien expire après 24 heures. Si besoin, utilisez &ldquo;Renvoyer le lien&rdquo; depuis la liste des employés.
            </p>

            <div className="pt-2 border-t">
              <Button variant="outline" className="w-full" onClick={() => router.push('/manager/employees')}>
                Retour à la liste des employés
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
