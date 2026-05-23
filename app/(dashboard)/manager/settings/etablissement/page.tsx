'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Check } from 'lucide-react'

export default function EtablissementPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle().then(({ data }) => {
      setName(data?.value ?? '')
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('settings').upsert({ key: 'establishment_name', value: name.trim() || 'Mon établissement' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Établissement</h2>
        <p className="text-sm text-muted-foreground mt-1">Informations affichées dans l&apos;application et les emails.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nom de l&apos;établissement</CardTitle>
          <CardDescription>Affiché dans la sidebar et les emails envoyés aux employés.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex : Le Bistrot du Port"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
            {saving ? 'Enregistrement…' : saved ? 'Enregistré !' : 'Enregistrer'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
