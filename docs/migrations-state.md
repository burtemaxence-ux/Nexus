# État des migrations Supabase

## Statut prod (dernier commit référence : ea5b275)

Les migrations **001 à 033** sont toutes appliquées en production.
La migration **021** a été appliquée après 017-020 sans erreur (voir ci-dessous).

---

## Rôle de 021_combined_017_to_020.sql

### Ce n'est PAS un doublon

`021_combined_017_to_020.sql` (28 Ko) couvre le même périmètre que 017-020 mais apporte
trois garanties supplémentaires qui la rendent **idempotente** :

| Problème dans 017-020 | Solution dans 021 |
|-----------------------|-------------------|
| `CREATE POLICY "name"` échoue si la policy existe déjà | `DROP POLICY IF EXISTS "name"` ajouté avant chaque `CREATE POLICY` |
| `CREATE TABLE` échoue si la table existe | `CREATE TABLE IF NOT EXISTS` partout |
| `ADD PRIMARY KEY` échoue si la PK existe déjà (`settings`, `week_status`) | `DROP CONSTRAINT IF EXISTS settings_pkey` + `ADD PRIMARY KEY` |

### Pourquoi elle a été créée

021 est une **migration de rattrapage** conçue pour les projets Supabase démarrés sans
017-020 (clone frais, backup partiel, ou projet de démo). Elle permet de rejoindre l'état
final de 020 en une seule migration, sans toucher aux projets qui ont déjà 017-020.

### Comportement selon le scénario

| Scénario | Résultat |
|----------|----------|
| DB prod avec 017-020 déjà appliqués puis 021 | ✅ Sûr — toutes les opérations sont idempotentes |
| Nouvelle DB exécutant 001→033 dans l'ordre | ✅ Sûr — 021 ré-applique 017-020 sans erreur |
| Nouvelle DB sautant 017-020 et appliquant directement 021 | ✅ Sûr — 021 couvre tout |
| DB en cours de migration avec 017-019 mais pas 020 | ✅ Sûr — 021 complète 020 |

---

## Marche à suivre pour les nouvelles installations

### Installation standard (recommandée)

```bash
supabase db push
# ou
supabase migration up
```

Supabase CLI applique toutes les migrations dans l'ordre numérique.
Les migrations 017-020 + 021 s'exécutent sans conflit.

### Installation depuis zéro (nouveau projet Supabase)

Si les migrations 017-020 n'ont pas encore été appliquées, vous pouvez :

**Option A** — Laisser le CLI appliquer tout dans l'ordre (recommandé) :
```bash
supabase migration up
```

**Option B** — Appliquer uniquement 021 si 017-020 sont manquants :
```sql
-- Exécuter directement dans Supabase SQL editor
\i supabase/migrations/021_combined_017_to_020.sql
```

---

## Tableau complet des migrations

| # | Fichier | Contenu | Statut prod |
|---|---------|---------|-------------|
| 001 | initial.sql | Profiles, UUID ext | ✅ |
| 002 | add_employee_fields.sql | Champs employé | ✅ |
| 003 | shifts.sql | Planning shifts | ✅ |
| 004 | postes.sql | Postes de travail | ✅ |
| 005 | week_status.sql | Publication semaine | ✅ |
| 006 | leave_requests.sql | Congés | ✅ |
| 007 | presences.sql | Pointage | ✅ |
| 008 | presences_break.sql | Pauses pointage | ✅ |
| 009 | break_settings.sql | Config pauses | ✅ |
| 010 | employee_enriched.sql | Profil enrichi | ✅ |
| 011 | postes_extended.sql | Postes étendu | ✅ |
| 012 | invite_enriched.sql | Invitations | ✅ |
| 013 | lateness_records.sql | Retards | ✅ |
| 014 | contracts_enriched.sql | Contrats | ✅ |
| 015 | is_manager_and_indexes.sql | Fonction is_manager + index | ✅ |
| 016 | settings_defaults.sql | Table settings | ✅ |
| 017 | audit_log.sql | Journal d'audit | ✅ |
| 018 | soft_deletes.sql | Soft deletes | ✅ |
| 019 | establishments.sql | Table establishments | ✅ |
| 020 | multi_tenant.sql | Multi-tenant RLS complet | ✅ |
| **021** | **combined_017_to_020.sql** | **Rattrapage idempotent 017-020** | **✅ (appliqué après 020)** |
| 022 | fix_handle_new_user.sql | Correction trigger user | ✅ |
| 023 | multi_site.sql | Multi-sites | ✅ |
| 024 | employee_documents.sql | Documents employé | ✅ |
| 025 | push_subscriptions.sql | Notifications push | ✅ |
| 026 | shift_exchanges.sql | Échanges de shifts | ✅ |
| 027 | webhook_logs_api_tokens.sql | API externe + webhooks | ✅ |
| 028 | marketplace.sql | Marketplace créneaux | ✅ |
| 029 | notifications.sql | Notifications in-app | ✅ |
| 030 | compliance_alerts.sql | Alertes conformité | ✅ |
| 031 | replacement_requests.sql | SOS remplacement | ✅ |
| 032 | rls_audit.sql | Config RLS audit | ✅ |
| 033 | performance_indexes.sql | Index performance | ✅ |

---

## Migrations 034 → 053 — état vérifié en prod (2026-06-16)

Vérification directe sur le projet prod (`euvvibqzrhbleztqfdbu`) via inspection du schéma
(`pg_policies`, `pg_proc`, `information_schema.columns`) le 2026-06-16 :

| # | Fichier | Contenu | Statut prod |
|---|---------|---------|-------------|
| 035 | storage_buckets.sql | Buckets stockage | ✅ |
| 036 | stripe_subscriptions.sql | Abonnements Stripe | ✅ (`referrals`/subs OK) |
| 037 | rls_replacement_requests_fix.sql | Fix RLS remplacements | ✅ |
| 038 | establishments_is_active.sql | `establishments.is_active` | ✅ |
| 039 | fix_pin_column.sql | Type PIN | ✅ |
| 040 | fix_rls_establishments.sql | Fix RLS établissements | ✅ |
| 041 | referrals.sql | Table `referrals` | ✅ (table présente) |
| 042 | fix_api_tokens_policy.sql | Scoping `api_tokens` | ✅ (`managers_read_own_tokens` présent) |
| 043 | fix_storage_policies.sql | Policies logos | ✅ |
| 044 | fix_settings_rls.sql | RLS `settings` read/write | ✅ (`settings_read/write/update/delete`) |
| 045 | fix_user_establishments_rls.sql | RLS `user_establishments` | ✅ (`managers_manage_own_memberships`) |
| 046 | harden_functions_and_webhook_logs.sql | Durcissement fonctions | ✅ |
| 047 | logos_bucket_no_listing.sql | Bucket logos no-listing | ✅ |
| 048 | ai_usage.sql | Table `ai_usage` + `consume_ai_credit`/`get_ai_usage` | ✅ (table + fonctions présentes) |
| 049 | presence_needs_review.sql | `presences.needs_review` | ✅ (colonne présente) |
| 050 | referrals_activation.sql | `referrals.first_month_granted` | ✅ (colonne présente) |
| 051 | perf_indexes.sql | Index performance | ✅ (présumé — fonctions/colonnes liées OK) |
| 052 | harden_ai_functions.sql | Durcissement fonctions IA | ✅ |
| **053** | **shift_exchanges_tenant_isolation.sql** | **`establishment_id` + RLS scopées sur `shift_exchanges`** | **✅ appliquée le 2026-06-16 (col NOT NULL, 3 policies scopées, trigger)** |
| **054** | **referrals_abuse_flag.sql** | **`referrals.flagged` + `flag_reason` (anti-abus vélocité)** | **✅ appliquée le 2026-06-16 (colonnes additives)** |
| **055** | **fk_indexes.sql** | **17 index sur clés étrangères non couvertes (advisor perf)** | **✅ appliquée le 2026-06-16 (0 FK non indexée restante)** |

> Note : 034 n'existe pas (saut 033 → 035, numéro non utilisé).
> Les migrations 042/044/045 (sécurité), 048 (quota IA) et 049/050 sont **confirmées appliquées** en prod.

## Vérification automatisée « APPLY MANUALLY » (2026-06-19)

Script : `npm run check:migrations` (`scripts/check-migrations.ts`, nécessite
`SUPABASE_DB_URL`). Sonde `pg_policies` / `pg_indexes` / `information_schema`
pour un objet représentatif de chaque migration marquée `-- APPLY MANUALLY`.

État vérifié le **2026-06-19** sur `euvvibqzrhbleztqfdbu` :

| Migration (APPLY MANUALLY) | Objet sondé | État |
|---|---|---|
| 042_fix_api_tokens_policy | policy `managers_read_own_tokens` | ✅ |
| 043_fix_storage_policies | policies `logos_manager_*` ×3 | ✅ |
| 044_fix_settings_rls | policies `settings_*` ×4 | ✅ |
| 045_fix_user_establishments_rls | policy `managers_manage_own_memberships` | ✅ |
| 048_ai_usage | table `ai_usage` + fn `consume_ai_credit` | ✅ |
| 049_presence_needs_review | colonne `presences.needs_review` | ✅ |
| 050_referrals_activation | colonne `referrals.first_month_granted` + index | ✅ |
| 051_perf_indexes | index `idx_profiles_id_establishment`, `idx_marketplace_slots_establishment_status` | ✅ |
| 052_harden_ai_functions | `anon` privé d'EXECUTE sur `consume_ai_credit` | ✅ |
| 060_ai_usage_per_feature | colonne `ai_usage.feature` + `consume_ai_credit` 2-arg | ✅ appliquée le 2026-06-19 (via MCP) |

> 060 appliquée et vérifiée : `consume_ai_credit` n'a plus qu'une signature (2-arg),
> `anon` privé d'EXECUTE, quota chat IA actif.

## 061_merge_permissive_policies.sql — APPLIQUÉE (2026-06-19)

Fusion des policies RLS permissives multiples (advisor `multiple_permissive_policies`
×149 sur 19 tables) en une policy par (table, action). `auth_rls_initplan` est
déjà à 0 (corrigé en 059). Testée par double dry-run transactionnel (structure +
accès runtime, 0 différence), puis **appliquée en prod via `apply_migration` le
2026-06-19**. Advisor post-application : **`multiple_permissive_policies` = 0**
(restent uniquement `unused_index` INFO et `duplicate_index` WARN, hors périmètre).
Voir la note sécurité sur `push_subscriptions` dans l'en-tête du fichier.

## 062_push_security_and_dup_indexes.sql — APPLIQUÉE (2026-06-19)

Hors-périmètre audit, post-corrections : (1) `push_subscriptions_select` restreinte
de `USING (true)` à `USING (auth.uid() = user_id)` — l'envoi de notifs passe par
service role (RLS bypassée), donc aucune régression ; (2) drop des 2 index dupliqués
sur `subscriptions` (advisor `duplicate_index`). Les `unused_index` (INFO) sont
**conservés** : ce sont majoritairement les index FK de la migration 055, « unused »
= trafic pré-lancement et non inutiles. Appliquée via `apply_migration`.

## Note sur les futures migrations

La prochaine migration sera nommée **063_xxx.sql** (056→062 appliquées).
Ne pas réutiliser les numéros 017-021 ni 053-062 — tous appliqués en prod.
