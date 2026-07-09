// Captures d'écran responsive des pages publiques — référence anti-régression.
//
// Usage :
//   1. Démarrer l'app :  npm run dev   (ou next start)
//   2. node scripts/responsive-screenshots.mjs [--base http://localhost:3000] [--out screenshots/responsive]
//
// Prérequis : playwright installé (npm i -D playwright, ou disponible globalement
// via NODE_PATH=$(npm root -g)). Les pages authentifiées ne sont pas couvertes :
// il faudrait un storageState avec une session Supabase valide.

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright'

const args = process.argv.slice(2)
function argValue(flag, fallback) {
  const i = args.indexOf(flag)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}

const BASE = argValue('--base', 'http://localhost:3000')
const OUT = argValue('--out', 'screenshots/responsive')

const VIEWPORTS = [
  { name: '360', width: 360, height: 780 },   // petit mobile (Android compact / iPhone SE ~375)
  { name: '768', width: 768, height: 1024 },  // tablette / bascule md:
  { name: '1280', width: 1280, height: 800 }, // desktop
]

const PAGES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
]

const browser = await chromium.launch()
await mkdir(OUT, { recursive: true })

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce', // captures stables (pas d'animations en vol)
  })
  const page = await context.newPage()
  for (const p of PAGES) {
    await page.goto(BASE + p.path, { waitUntil: 'networkidle' })
    const file = join(OUT, `${p.name}-${vp.name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`✓ ${file}`)
  }
  await context.close()
}

await browser.close()
