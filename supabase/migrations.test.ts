import { describe, it, expect } from 'vitest'
import { readdirSync } from 'fs'
import { join } from 'path'

// Garde-fou anti-collision (audit 2026-07-06, constat #3) : deux migrations
// avec le même préfixe numérique rendent l'ordre d'application ambigu et
// provoquent du drift prod/repo. Un numéro = un fichier, pour toujours.
describe('supabase/migrations', () => {
  const files = readdirSync(join(__dirname, 'migrations')).filter(f => f.endsWith('.sql'))

  it('chaque migration a un préfixe numérique à 3 chiffres', () => {
    const bad = files.filter(f => !/^\d{3}_[a-z0-9_]+\.sql$/.test(f))
    expect(bad, `Fichiers mal nommés : ${bad.join(', ')}`).toEqual([])
  })

  it('aucun numéro de migration en double', () => {
    const seen = new Map<string, string>()
    const dups: string[] = []
    for (const f of files) {
      const num = f.slice(0, 3)
      const prev = seen.get(num)
      if (prev) dups.push(`${num} : ${prev} + ${f}`)
      seen.set(num, f)
    }
    expect(dups, `Numéros en collision — renuméroter le nouveau fichier :\n${dups.join('\n')}`).toEqual([])
  })
})
