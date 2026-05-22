'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const CONTRACT_TYPES = ['CDI 35h', 'CDI 28h', 'CDD', 'CDD Saisonnier', 'Extra']
const POSITIONS = [
  'Serveur', 'Serveuse', 'Cuisinier', 'Cuisinière', 'Chef de rang',
  'Barman', 'Barmaid', 'Plongeur', 'Plongeuse', 'Hôte d\'accueil',
  'Hôtesse d\'accueil', 'Chef de cuisine', 'Sous-chef', 'Commis de cuisine',
]

export default function EditEmployeePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')
  const [contractType, setContractType] = useState('')
  const [weeklyHours, setWeeklyHours] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { setError('Employé introuvable'); setLoading(false); return }
      setFullName(data.full_name ?? '')
      setPosition(data.position ?? '')
      setContractType(data.contract_type ?? '')
      setWeeklyHours(data.weekly_hours?.toString() ?? '')
      setEmail(data.email)
      setLoading(false)
    })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          position: position.trim() || null,
          contract_type: contractType || null,
          weekly_hours: weeklyHours ? parseFloat(weeklyHours) : null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      router.push('/manager/employees?success=2')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin h-6 w-6 text-gray-400" /></div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/manager" className="text-sm text-gray-500 hover:text-gray-700">Tableau de bord</Link>
          <span className="text-gray-400">/</span>
          <Link href="/manager/employees" className="text-sm text-gray-500 hover:text-gray-700">Équipe</Link>
          <span className="text-gray-400">/</span>
          <span className="text-sm text-gray-700 font-medium">Modifier</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Modifier un employé</h1>
        <p className="text-gray-500 mt-1">{email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations</CardTitle>
          <CardDescription>Modifiez les informations de l&apos;employé.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nom complet</Label>
              <Input id="full_name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Prénom Nom" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="position">Poste</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger id="position">
                  <SelectValue placeholder="Sélectionner un poste" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract">Type de contrat</Label>
              <Select value={contractType} onValueChange={setContractType}>
                <SelectTrigger id="contract">
                  <SelectValue placeholder="Sélectionner un contrat" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="weekly_hours">Volume horaire contractuel (h/semaine)</Label>
              <Input id="weekly_hours" type="number" min="0" max="60" step="0.5" value={weeklyHours} onChange={e => setWeeklyHours(e.target.value)} placeholder="Ex : 35" />
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</> : 'Enregistrer'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>Annuler</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
