# Quick Start

```bash
npm run dev               # dev local (http://localhost:3000)
npx tsc --noEmit          # typecheck strict — doit être vert avant commit
npm run lint              # ESLint (next lint)
npm run test              # Vitest — 200+ tests, inclut le garde-fou migrations
npm run build             # build prod (fonctionne avec des env factices)
npm run check:migrations  # sonde la prod (nécessite SUPABASE_DB_URL)
```

- **Avant de committer** : tsc + lint + test verts.
- **Nouvelle migration** : numéro « prochaine migration » de
  `docs/migrations-state.md`, jamais un numéro déjà pris.
- **Incident / support** : suivre `docs/COMMAND_CENTER.md`.
- **Env minimum dev** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (cf. README pour le reste).
