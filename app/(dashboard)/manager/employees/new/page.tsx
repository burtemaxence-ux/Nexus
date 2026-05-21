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
import { Loader2, ArrowLeft } from 'lucide-react'

const POSITIONS = [
  'Serveur',
  'Serveuse',
  'Cuisinier',
  'Cuisinière',
  'Chef de rang',
  'Barman',
  'Barmaid',
  'Plongeur',
  'Plongeuse',
  'Hôte d\'accueil',
  'Hôtesse d\'accueil',
  'Chef de cuisine',
  'Sous-chef',
  'Commis de cuisine',
]

export default function NewEmployeePage() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      router.push('/manager/employees?success=1')
    } catch {
      setError('Impossible de contacter le serveur. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/manager"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Tableau de bord
          </Link>
          <span className="text-gray-400">/</span>
          <Link
            href="/manager/employees"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Équipe
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-sm text-gray-700 font-medium">Inviter</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Inviter un employé</h1>
        <p className="text-gray-500 mt-1">
          L&apos;employé recevra un email avec un lien pour définir son mot de passe.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations de l&apos;employé</CardTitle>
          <CardDescription>
            Renseignez les informations de votre nouvel employé.
          </CardDescription>
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
              <Select
                value={position}
                onValueChange={setPosition}
                disabled={loading}
              >
                <SelectTrigger id="position">
                  <SelectValue placeholder="Sélectionner un poste" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
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
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  'Envoyer l\'invitation'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
