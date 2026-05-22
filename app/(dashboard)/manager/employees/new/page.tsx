'use client'

import { useState } from 'react'
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
import { Loader2, ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react'

const POSITIONS = [
  'Serveur', 'Serveuse', 'Cuisinier', 'Cuisinière', 'Chef de rang',
  'Barman', 'Barmaid', 'Plongeur', 'Plongeuse', 'Hôte d\'accueil',
  'Hôtesse d\'accueil', 'Chef de cuisine', 'Sous-chef', 'Commis de cuisine',
]

export default function NewEmployeePage() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim() || !email.trim() || !position) {
      setError('Veuillez remplir tous les champs.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), full_name: fullName.trim(), position }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Une erreur est survenue.')
        return
      }

      setInviteLink(data.inviteLink)
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
        <h1 className="text-3xl font-bold text-gray-900">Inviter un employé</h1>
        <p className="text-gray-500 mt-1">
          Un lien d&apos;accès sera généré — partagez-le par SMS, WhatsApp ou email.
        </p>
      </div>

      {!inviteLink ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations de l&apos;employé</CardTitle>
            <CardDescription>Renseignez les informations de votre nouvel employé.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nom complet *</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Ex : Marie Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="marie.dupont@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="position">Poste *</Label>
                <Select value={position} onValueChange={setPosition} disabled={loading}>
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Sélectionner un poste" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((pos) => (
                      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération…</> : 'Générer le lien d\'invitation'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                  <ArrowLeft className="h-4 w-4 mr-2" />Retour
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
              Partagez ce lien avec <strong>{fullName}</strong> — il lui permettra de définir son mot de passe et d&apos;accéder à son espace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500 mb-1.5 font-medium">Lien d&apos;invitation</p>
              <p className="text-xs text-gray-700 break-all font-mono leading-relaxed">{inviteLink}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCopy} className="flex-1 gap-2" variant={copied ? 'outline' : 'default'}>
                {copied ? <><Check className="h-4 w-4 text-green-600" />Copié !</> : <><Copy className="h-4 w-4" />Copier le lien</>}
              </Button>
              <Button variant="outline" size="icon" asChild title="Ouvrir le lien">
                <a href={inviteLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <p className="text-xs text-gray-400">
              Ce lien expire après 24 heures. Si besoin, utilisez &quot;Renvoyer le lien&quot; depuis la liste des employés.
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
