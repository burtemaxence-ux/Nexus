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

## Note sur les futures migrations

La prochaine migration sera nommée **034_xxx.sql**.
Ne pas réutiliser les numéros 017-021 — ils sont tous appliqués en prod.
