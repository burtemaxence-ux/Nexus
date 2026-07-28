/**
 * audit-gate.mjs — garde-fou CI sur les vulnérabilités de dépendances.
 *
 * `npm audit --audit-level=high` ne convient pas ici : next@14 traîne des avis
 * `high` que seule la montée en next@16 (semver major) corrige. Un tel seuil
 * rendrait la CI rouge en permanence, donc ignorée — l'inverse du but.
 *
 * Règles appliquées :
 *   • toute vulnérabilité CRITICAL (prod ou dev) → échec ;
 *   • toute vulnérabilité HIGH sur une dépendance de PRODUCTION → échec,
 *     sauf paquet listé dans ACCEPTED ci-dessous ;
 *   • les `high` purement dev (chaîne ESLint) sont rapportés, pas bloquants :
 *     ils ne s'exécutent jamais en production.
 *
 * Toute exception doit porter une raison ET une condition de sortie. Une
 * NOUVELLE vulnérabilité high en production casse le build — c'est le point.
 *
 * Run: node scripts/audit-gate.mjs
 */
import { execSync } from 'node:child_process'

const ACCEPTED = {
  next: {
    reason:
      "avis high résiduels sur la ligne 14.x (DoS Server Components, SSRF Server Actions/rewrites, " +
      "bypass middleware i18n Pages Router — ce projet est 100 % App Router). " +
      "La CVE CRITICAL GHSA-f82v-jwr5-mffw est corrigée depuis 14.2.35.",
    until: 'montée en Next.js 16 — semver major, décision produit à part entière',
  },
}

/** npm audit sort en code non-nul dès qu'il trouve quelque chose : on tolère. */
function audit(args) {
  try {
    return JSON.parse(execSync(`npm audit --json ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
  } catch (e) {
    return JSON.parse(e.stdout)
  }
}

const all = audit('')
const prod = audit('--omit=dev')

const failures = []
const accepted = []

for (const [name, v] of Object.entries(all.vulnerabilities ?? {})) {
  if (v.severity === 'critical') failures.push(`CRITICAL · ${name} (${v.range})`)
}
for (const [name, v] of Object.entries(prod.vulnerabilities ?? {})) {
  if (v.severity !== 'high') continue
  if (ACCEPTED[name]) accepted.push(`${name} — ${ACCEPTED[name].until}`)
  else failures.push(`HIGH (prod) · ${name} (${v.range})`)
}

const devHigh = Object.entries(all.vulnerabilities ?? {})
  .filter(([n, v]) => v.severity === 'high' && !prod.vulnerabilities?.[n]).length

console.log('── Garde-fou audit dépendances ──\n')
console.log(`prod : ${JSON.stringify(prod.metadata.vulnerabilities)}`)
console.log(`total: ${JSON.stringify(all.metadata.vulnerabilities)}`)
if (devHigh) console.log(`\nℹ️  ${devHigh} high dev-only (non bloquants — jamais exécutés en prod).`)
if (accepted.length) console.log(`\n⚠️  Exceptions acceptées :\n${accepted.map(a => `   • ${a}`).join('\n')}`)

if (failures.length) {
  console.error(`\n❌ ${failures.length} vulnérabilité(s) bloquante(s) :`)
  failures.forEach(f => console.error(`   • ${f}`))
  console.error('\nCorriger, ou ajouter une exception motivée dans scripts/audit-gate.mjs.')
  process.exit(1)
}
console.log('\n✅ Aucune vulnérabilité bloquante.')
