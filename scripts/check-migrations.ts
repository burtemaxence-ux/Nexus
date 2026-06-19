/**
 * check-migrations.ts — verify that the DB objects created by each
 * "APPLY MANUALLY" migration actually exist in the target database.
 *
 * These migrations are flagged "APPLY MANUALLY" (run by hand in the Supabase
 * SQL editor), so nothing guarantees they were applied on a fresh environment.
 * This script probes pg_catalog / information_schema for a representative
 * object of each one and prints a clear ✅ / ❌ report.
 *
 * Requires: SUPABASE_DB_URL (Postgres connection string with enough rights to
 * read the catalog — the service-role / direct DB URL from Supabase settings).
 *
 * Run:  SUPABASE_DB_URL="postgres://..." npx tsx scripts/check-migrations.ts
 * Exit: 0 if all probes pass, 1 if any object is missing.
 */
import { Client } from 'pg'
import { readdirSync } from 'fs'
import { join } from 'path'

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations')

// One probe per "APPLY MANUALLY" migration. Each query must return a single
// row with a boolean column `ok` = true when the migration is applied.
const PROBES: { migration: string; sql: string }[] = [
  { migration: '042_fix_api_tokens_policy',
    sql: `SELECT EXISTS(SELECT 1 FROM pg_policies WHERE policyname='managers_read_own_tokens') AS ok` },
  { migration: '043_fix_storage_policies',
    sql: `SELECT (SELECT count(*) FROM pg_policies WHERE policyname IN('logos_manager_upload','logos_manager_update','logos_manager_delete'))=3 AS ok` },
  { migration: '044_fix_settings_rls',
    sql: `SELECT (SELECT count(*) FROM pg_policies WHERE policyname IN('settings_read','settings_write','settings_update','settings_delete'))=4 AS ok` },
  { migration: '045_fix_user_establishments_rls',
    sql: `SELECT EXISTS(SELECT 1 FROM pg_policies WHERE policyname='managers_manage_own_memberships') AS ok` },
  { migration: '048_ai_usage',
    sql: `SELECT (EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_usage')
              AND EXISTS(SELECT 1 FROM pg_proc WHERE proname='consume_ai_credit')) AS ok` },
  { migration: '049_presence_needs_review',
    sql: `SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='presences' AND column_name='needs_review') AS ok` },
  { migration: '050_referrals_activation',
    sql: `SELECT (EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='referrals' AND column_name='first_month_granted')
              AND EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_referrals_referred')) AS ok` },
  { migration: '051_perf_indexes',
    sql: `SELECT (EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_profiles_id_establishment')
              AND EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_marketplace_slots_establishment_status')) AS ok` },
  { migration: '052_harden_ai_functions',
    sql: `SELECT NOT has_function_privilege('anon','public.consume_ai_credit(integer)','EXECUTE')
              AND NOT has_function_privilege('anon','public.consume_ai_credit(integer,text)','EXECUTE') AS ok` },
  { migration: '060_ai_usage_per_feature',
    sql: `SELECT (EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ai_usage' AND column_name='feature')
              AND EXISTS(SELECT 1 FROM pg_proc WHERE proname='consume_ai_credit' AND pronargs=2)) AS ok` },
]

async function main() {
  const url = process.env.SUPABASE_DB_URL
  if (!url) {
    console.error('❌ SUPABASE_DB_URL manquant. Exemple :\n   SUPABASE_DB_URL="postgres://..." npx tsx scripts/check-migrations.ts')
    process.exit(2)
  }

  const probed = new Set(PROBES.map(p => p.migration))
  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()

  const client = new Client({ connectionString: url })
  await client.connect()

  let missing = 0
  console.log('── État des migrations "APPLY MANUALLY" ──\n')
  for (const probe of PROBES) {
    let ok = false
    try {
      const { rows } = await client.query(probe.sql)
      ok = rows[0]?.ok === true
    } catch (e) {
      console.error(`⚠️  ${probe.migration} : erreur de sonde — ${(e as Error).message}`)
    }
    if (!ok) missing++
    console.log(`${ok ? '✅' : '❌'} ${probe.migration}`)
  }

  // Migrations présentes dans le dossier mais sans sonde (gérées automatiquement).
  const unprobed = files.map(f => f.replace(/\.sql$/, '')).filter(m => !probed.has(m))
  console.log(`\nℹ️  ${unprobed.length} migration(s) sans sonde (non "APPLY MANUALLY", non vérifiées ici).`)

  await client.end()
  console.log(missing === 0
    ? '\n✅ Toutes les migrations critiques sont appliquées.'
    : `\n❌ ${missing} migration(s) critique(s) manquante(s) — voir ci-dessus.`)
  process.exit(missing === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
