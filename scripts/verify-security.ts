/**
 * verify-security.ts — vérifie EN BASE que les correctifs de sécurité sont
 * réellement appliqués.
 *
 * Raison d'être : les migrations 083 et 084 sont présentes dans le dépôt,
 * marquées faites, et n'ont aucun effet (REVOKE sur `anon` alors que le
 * privilège est détenu par PUBLIC ; REVOKE de colonne face à un GRANT de
 * table). Un correctif de sécurité n'est clos que lorsque sa sonde ci-dessous
 * renvoie `ok` sur la base cible — jamais parce que le fichier SQL existe.
 *
 * Chaque sonde renvoie une unique colonne booléenne `ok`.
 *
 * Requiert : SUPABASE_DB_URL (chaîne Postgres avec droit de lecture du catalogue).
 *
 * Run:  SUPABASE_DB_URL="postgres://..." npx tsx scripts/verify-security.ts
 * Exit: 0 si toutes les sondes passent, 1 sinon.
 */
import { Client } from 'pg'

type Probe = { id: string; label: string; sql: string }

const PROBES: Probe[] = [
  // ── Bloquants (audit 2026-07-25) ──────────────────────────────────────────
  {
    id: 'B1',
    label: "handle_new_user n'utilise plus les métadonnées client (role / establishment_id)",
    sql: `SELECT pg_get_functiondef(oid) NOT LIKE '%raw_user_meta_data->>''role''%'
             AND pg_get_functiondef(oid) NOT LIKE '%raw_user_meta_data->>''establishment_id''%' AS ok
          FROM pg_proc WHERE proname = 'handle_new_user'`,
  },
  {
    id: 'B1b',
    label: 'attach_invited_user existe et est réservée au service_role',
    sql: `SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'attach_invited_user')
             AND NOT has_function_privilege('authenticated',
                   'public.attach_invited_user(uuid,uuid,text)', 'EXECUTE') AS ok`,
  },
  {
    id: 'B2',
    label: 'profiles : INSERT et DELETE fermés à authenticated',
    sql: `SELECT NOT has_table_privilege('authenticated', 'public.profiles', 'INSERT')
             AND NOT has_table_privilege('authenticated', 'public.profiles', 'DELETE') AS ok`,
  },
  {
    id: 'B2b',
    label: 'garde profiles armée sur INSERT + UPDATE + DELETE',
    // tgtype : bit 2 = INSERT (4), bit 3 = DELETE (8), bit 4 = UPDATE (16) → 28
    sql: `SELECT COALESCE(bool_and(tgtype & 28 = 28), false) AS ok
          FROM pg_trigger WHERE tgname = 'guard_profiles_privileged_columns'`,
  },
  {
    id: 'B3',
    label: 'subscriptions : écritures fermées et identifiants Stripe masqués',
    sql: `SELECT NOT has_table_privilege('authenticated', 'public.subscriptions', 'UPDATE')
             AND NOT has_table_privilege('authenticated', 'public.subscriptions', 'INSERT')
             AND NOT has_column_privilege('authenticated', 'public.subscriptions',
                   'stripe_customer_id', 'SELECT')
             AND has_column_privilege('authenticated', 'public.subscriptions', 'plan', 'SELECT') AS ok`,
  },

  // ── Critiques ─────────────────────────────────────────────────────────────
  {
    id: 'C1',
    label: "establishments : aucune policy FOR ALL ouverte à tout le tenant",
    sql: `SELECT NOT EXISTS(
            SELECT 1 FROM pg_policies
            WHERE tablename = 'establishments' AND cmd = 'ALL'
              AND qual LIKE '%current_establishment_id()%') AS ok`,
  },
  {
    id: 'C3',
    label: "presences : un employé ne peut pas supprimer ses pointages",
    // La policy actuelle contient `is_manager()` ET la branche `employee_id` :
    // tester la seule présence de `is_manager()` donnerait un faux vert.
    sql: `SELECT COALESCE(bool_and(qual LIKE '%is_manager()%' AND qual NOT LIKE '%employee_id%'), false) AS ok
          FROM pg_policies WHERE tablename = 'presences' AND cmd = 'DELETE'`,
  },
  {
    id: 'C5',
    label: 'planning_signatures : isolée par établissement',
    sql: `SELECT EXISTS(SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='planning_signatures'
                          AND column_name='establishment_id')
             AND COALESCE((SELECT bool_and(qual LIKE '%current_establishment_id()%')
                           FROM pg_policies
                           WHERE tablename='planning_signatures' AND cmd='SELECT'), false) AS ok`,
  },

  // ── Majeurs ───────────────────────────────────────────────────────────────
  {
    id: 'M1',
    label: 'helpers RLS non exécutables par PUBLIC / anon (083 était inopérante)',
    sql: `SELECT NOT has_function_privilege('anon', 'public.is_manager()', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.current_establishment_id()', 'EXECUTE') AS ok`,
  },
  {
    id: 'M4',
    label: 'webhook_logs réservé aux managers (la policy ne vérifiait pas le rôle)',
    sql: `SELECT COALESCE(bool_and(qual LIKE '%is_manager()%'), false) AS ok
          FROM pg_policies WHERE tablename = 'webhook_logs' AND cmd IN ('SELECT', 'ALL')`,
  },
  {
    id: 'M5',
    label: 'api_tokens : expiration et révocation exploitables',
    sql: `SELECT COUNT(*) = 2 AS ok FROM information_schema.columns
          WHERE table_schema='public' AND table_name='api_tokens'
            AND column_name IN ('expires_at', 'revoked_at')`,
  },
  {
    id: 'M20',
    label: 'settings : les clés lisibles par un employé sont une liste blanche',
    sql: `SELECT COALESCE(bool_and(qual LIKE '%key = ANY%' OR qual LIKE '%key IN %'), false) AS ok
          FROM pg_policies WHERE tablename = 'settings' AND cmd = 'SELECT'`,
  },

  // ── Invariants globaux ────────────────────────────────────────────────────
  {
    id: 'RLS',
    label: 'aucune table du schéma public sans RLS activée',
    sql: `SELECT COUNT(*) = 0 AS ok
          FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`,
  },
  {
    id: 'ANON',
    label: "anon n'a aucun privilège d'écriture sur le schéma public",
    sql: `SELECT COUNT(*) = 0 AS ok
          FROM information_schema.role_table_grants
          WHERE table_schema = 'public' AND grantee = 'anon'
            AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')`,
  },
]

async function main() {
  const url = process.env.SUPABASE_DB_URL
  if (!url) {
    console.error('❌ SUPABASE_DB_URL manquant.\n   SUPABASE_DB_URL="postgres://..." npx tsx scripts/verify-security.ts')
    process.exit(2)
  }

  const client = new Client({ connectionString: url })
  await client.connect()

  let failed = 0
  console.log('\n🔐 Vérification des correctifs de sécurité (état réel en base)\n')

  for (const probe of PROBES) {
    let ok = false
    let detail = ''
    try {
      const res = await client.query(probe.sql)
      ok = res.rows[0]?.ok === true
      if (res.rows.length === 0) detail = ' (aucune ligne — objet absent ?)'
    } catch (e) {
      detail = ` (${e instanceof Error ? e.message : 'erreur SQL'})`
    }
    if (!ok) failed++
    console.log(`${ok ? '✅' : '❌'} [${probe.id}] ${probe.label}${ok ? '' : detail}`)
  }

  await client.end()

  console.log(
    failed === 0
      ? `\n✅ ${PROBES.length}/${PROBES.length} sondes au vert.\n`
      : `\n❌ ${failed} sonde(s) en échec sur ${PROBES.length} — le correctif correspondant n'est PAS appliqué sur cette base.\n`
  )
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('❌ verify-security a échoué :', e instanceof Error ? e.message : e)
  process.exit(2)
})
