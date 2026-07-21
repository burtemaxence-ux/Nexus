/**
 * smoke.mjs — smoke test HTTP du parcours public (audit 2026-07-21, P1-4).
 *
 * Vérifie que l'app démarrée (`next start`) sert les pages critiques sans
 * erreur serveur : landing, login, register, une page SEO publique et le
 * manifest PWA. Attrape les régressions que les tests unitaires ne voient
 * pas (middleware qui crashe, page qui 500, redirect cassé).
 *
 * Usage :  BASE_URL=http://localhost:3000 node scripts/smoke.mjs
 * Requiert NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY au
 * démarrage de l'app (le middleware crée un client Supabase par requête).
 * Sortie : code 0 si tout passe, 1 sinon.
 */

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

// [chemin, fragment attendu dans le HTML]
const CHECKS = [
  ['/', 'Quartzbase'],
  ['/login', 'Quartzbase'],
  ['/register', 'Quartzbase'],
  ['/code-du-travail', 'Code du travail'],
  ['/manifest.webmanifest', 'Quartzbase'],
]

// Une route protégée doit rediriger vers /login, pas crasher.
const PROTECTED = '/manager'

let failed = 0

async function check(path, marker) {
  try {
    const res = await fetch(BASE + path, { redirect: 'follow' })
    const body = await res.text()
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (marker && !body.includes(marker)) throw new Error(`fragment « ${marker} » absent`)
    console.log(`✅ ${path}`)
  } catch (e) {
    console.error(`❌ ${path} — ${e.message}`)
    failed++
  }
}

for (const [path, marker] of CHECKS) await check(path, marker)

// Route protégée : on suit la redirection et on doit atterrir sur /login.
try {
  const res = await fetch(BASE + PROTECTED, { redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (!res.url.includes('/login')) throw new Error(`pas de redirection vers /login (final : ${res.url})`)
  console.log(`✅ ${PROTECTED} → redirigé vers /login`)
} catch (e) {
  console.error(`❌ ${PROTECTED} — ${e.message}`)
  failed++
}

if (failed > 0) {
  console.error(`\n${failed} vérification(s) en échec.`)
  process.exit(1)
}
console.log('\nSmoke test OK.')
