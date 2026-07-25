# Plan d'action — audit du 25 juillet 2026

Plan dérivé de `docs/2026-07-25-audit-pre-lancement-quartzbase.md`.
**Objectif** : lancement commercial le **lundi 24 août 2026**, avec une semaine de marge avant l'échéance
de septembre. **Charge totale avant lancement : 82 h**, dont **14 h bloquantes** (plus 15 h de v2.0
renvoyées après l'ouverture).

---

## 0. Principes de travail (à lire avant la première ligne de code)

Quatre règles tirées directement de ce qui a échoué lors des corrections précédentes.

**R1 — Un correctif de sécurité n'est clos que par une requête de vérification en base.**
Les migrations 083 et 084 sont dans le dépôt, marquées faites, et ne font rien. Chaque lot ci-dessous
fournit sa requête de vérification. Tant qu'elle ne renvoie pas `ok`, le correctif n'existe pas.

**R2 — En SQL, on révoque à `PUBLIC`, pas à `anon`, et on révoque la table avant de granter la colonne.**
C'est l'erreur commune de 083 et 084. `REVOKE ... FROM anon` ne retire rien tant que `PUBLIC` détient le
privilège ; `REVOKE UPDATE (col)` ne retire rien face à un `GRANT UPDATE` de table. L'ordre correct est
toujours : `REVOKE <priv> ON <table> FROM PUBLIC, anon, authenticated;` puis `GRANT <priv> (<colonnes>) TO authenticated;`

**R3 — Le sens de la défaillance doit être « accès refusé », jamais « accès élargi ».**
Si un correctif échoue partiellement, l'utilisateur doit se retrouver enfermé, pas promu. Cette règle
tranche plusieurs arbitrages de conception ci-dessous (notamment L1-1).

**R4 — On ne corrige que ce que l'audit a prouvé.**
Pas de refactor opportuniste dans les mêmes commits. Les 34 index « inutilisés » ne sont pas touchés, la
migration des styles inline n'est pas relancée, `is_manager()` n'est pas scindé avant la v2.0. Chaque
commit doit se relire ligne à ligne contre un finding numéroté.

---

## 1. Calendrier

| Semaine | Lot | Contenu | Charge | Jalon |
|---|---|---|---|---|
| **S31** — 28/07 → 01/08 | LOT 0 + LOT 1 | Pre-flight, puis les 5 bloquants | 14 h | **Vendredi 01/08 : les 5 vérifications R1 passent en prod** |
| **S32** — 04/08 → 08/08 | LOT 2 | 6 critiques, dont le harnais de tests RLS et la remise à plat des migrations | 22 h 30 | **Vendredi 08/08 : `npm run verify:security` vert en CI** |
| **S33** — 11/08 → 15/08 | LOT 3, passes A-B-C | Majeurs privilèges, argent, surface externe | 28 h | 15/08 férié — semaine de 4 jours, la plus chargée du plan |
| **S34** — 18/08 → 22/08 | LOT 3, passes D-E | Majeurs conformité + RGPD, puis revue d'attaque | 17 h 30 | **Jeudi 21/08 : go / no-go** |
| **S35** — 25/08 → 29/08 | — | Gel fonctionnel, lancement, surveillance | — | **Lundi 24/08 : ouverture commerciale** |

**Chemin critique non technique, à lancer lundi 28/07 au plus tard** : la validation juridique de M7 et M8
(coupure > 2 h, plafonds d'heures complémentaires) suppose un conseil en droit social. En France, le mois
d'août est mort. **Prendre le rendez-vous cette semaine, pas en S34** — sinon le lancement se fait avec un
moteur de conformité dont deux règles n'ont pas été relues par un juriste, ce qui est le risque de
responsabilité le plus lourd du produit.

---

## LOT 0 — Pre-flight (2 h, à faire avant toute modification)

Trois vérifications qui conditionnent la suite. Aucune n'est optionnelle.

### T0-1 — Prouver le comportement actuel des 3 chemins d'inscription (1 h)

Le correctif L1-1 réécrit `handle_new_user`. Avant de la toucher, il faut savoir ce qu'elle produit
aujourd'hui, parce que la donnée de production est ambiguë : sur 15 employés, **1 seul** a `invited_at`
renseigné, et le seul manager Google en base possède `user_metadata.role` — probablement écrit *a posteriori*
par `set-role`, pas à l'inscription.

Sur un projet Supabase de test (ou une branche), exécuter les trois parcours et relever, pour chacun,
`profiles.role`, `profiles.establishment_id`, `establishments.owner_id`, `user_establishments`, et le
statut HTTP de `/api/auth/set-role` :

1. inscription email/mot de passe depuis `/register` ;
2. inscription Google depuis `/register` ;
3. invitation d'un employé depuis `/api/employees/invite`, puis activation via `/auth/set-password`.

**Hypothèse à confirmer ou infirmer** : au parcours 2, le trigger pose `role='employee'` (le `COALESCE`
n'a rien à lire dans les métadonnées Google), puis `set-role` renvoie **403** sur son propre garde
`if (existingProfile?.role === 'employee')` — l'utilisateur reste employé de son propre établissement,
`is_manager()` est faux, et le tableau de bord manager reste vide indéfiniment.
La production ne montre aucun cas (`propriétaires non managers = 0`), donc soit le parcours n'est pas
exercé, soit quelque chose compense. **À trancher par le test, pas par la lecture.**
Si l'hypothèse se confirme, c'est un bug produit P0 indépendant de la sécurité — et L1-1 le corrige au
passage, ce qui rend le correctif doublement rentable.

### T0-2 — Figer une base de référence du schéma (30 min)

```bash
supabase link --project-ref euvvibqzrhbleztqfdbu
supabase db dump --schema public  --file supabase/baseline/2026-07-25_public.sql
supabase db dump --schema public --data-only --file /dev/null   # vérifie l'accès, ne pas versionner de données
psql "$SUPABASE_DB_URL" -c "\copy (select tablename,policyname,cmd,qual,with_check from pg_policies where schemaname='public' order by 1,2) to 'supabase/baseline/2026-07-25_policies.csv' csv header"
```

Ce dump est l'état « avant » : toute vérification post-correctif se fait par diff contre lui. Il sert aussi
de point de départ à L2-4 (remise à plat des migrations).

### T0-3 — Créer l'environnement de test (30 min)

`supabase branches create audit-fix` (ou un second projet gratuit). **Aucun correctif de ce plan ne
s'applique directement en production sans être passé par cette branche.** Les lots 1 et 2 touchent
l'authentification et la facturation : une erreur y est plus coûteuse que deux jours de retard.

---

## LOT 1 — Bloquants (12 h) · semaine du 28/07

> **État au 25/07 : écrit et validé côté dépôt, NON APPLIQUÉ en base.**
> Les migrations `086`, `087`, `088` et les diffs applicatifs correspondants sont commités.
> `npx tsc --noEmit`, `npm run lint`, `npm run build` et les 266 tests passent.
> Il reste à : (1) exécuter T0-1 sur une branche Supabase, (2) y appliquer les 3 migrations,
> (3) rejouer les 3 parcours d'inscription et la suppression d'un employé, (4) `npm run verify:security`,
> (5) appliquer en production. **Aucune migration ne doit partir en prod sans (1) à (4).**

Ordre imposé : L1-4 en premier (indépendant, débloque la CI), puis L1-1 → L1-2 → L1-3 (couche
authentification, du plus profond au plus superficiel), L1-5 en parallèle (code applicatif, sans lien).

### L1-4 — Next.js 14.2.5 → 14.2.35 (B4) — 2 h

```bash
npm i next@14.2.35 eslint-config-next@14.2.35
npm audit fix              # postcss, brace-expansion, minimatch (transitifs)
npm audit --omit=dev --json | jq '.metadata.vulnerabilities.critical'   # doit valoir 0
npx tsc --noEmit && npm run lint && npm test && npm run build
```

**⚠️ Constat fait à l'exécution — 14.2.35 est le dernier patch de la ligne 14.2.x.**
La CVE critique disparaît bien (objectif de B4 atteint : 0 critique sur les dépendances de
production). Mais il **reste 2 entrées HIGH** en production, et la lecture des plages de correction
est sans appel : toutes indiquent `fix: … <15.5.x`. Autrement dit, **Next 14 ne recevra plus de
correctif pour ces advisories** — elles ne sont réparées que sur la ligne 15.5.

Conséquences, à intégrer plutôt qu'à subir :

1. **Le gate CI ne peut pas être `--audit-level=high`** comme initialement écrit dans ce plan : il
   serait rouge en permanence, et un gate toujours rouge est pire que pas de gate — on cesse de le
   lire. Gate retenu : `npm audit --omit=dev --audit-level=critical`, doublé d'une revue trimestrielle
   des HIGH restantes.
2. **Les 2 HIGH restantes sont acceptables à court terme**, mais la décision doit être écrite, pas
   implicite. Les advisories concernent : `postcss` embarqué dans Next (build-time uniquement, entrée
   CSS non contrôlée par un tiers) ; côté Next, du DoS et des SSRF conditionnés à des configurations
   que cette application n'utilise pas (i18n Pages Router — l'app est 100 % App Router ; serveur
   custom — l'app est sur Vercel ; upgrades WebSocket — non utilisés).
3. **Nouvelle ligne au backlog : migration vers Next 15.5.21+.** C'est un projet à part entière
   (APIs de requête asynchrones, ruptures App Router), à cadrer après le lancement — mais à cadrer.
   Rester sur une ligne majeure sans support sécurité est tenable 6 mois, pas 2 ans.
4. **Cela contraint M9** (CSP avec nonces) : l'advisory GHSA-ffhc-5mcf-pf4q, « XSS in App Router
   applications using CSP nonces », n'est corrigée qu'à partir de 15.5.16. Introduire des nonces sur
   14.2.35 **ajouterait** un vecteur XSS. M9 est donc bloquée par la migration Next 15 — ce que le
   plan initial ne voyait pas.

Patch dans la même ligne 14.2.x : aucune rupture d'API attendue. Vérifier tout de même après build :
le rendu des 3 pages publiques, `/login` → redirection, un cycle complet manager (planning, publication),
et le webhook Stripe en test local (`stripe listen --forward-to localhost:3000/api/stripe/webhook`).

**Vérification (R1)** : `node -e "console.log(require('next/package.json').version)"` → `14.2.35`, et
`npm audit --json | jq '.metadata.vulnerabilities.critical'` → `0`.
**Rollback** : `git revert` du commit de lockfile. Aucune migration, aucun état persistant.

### L1-1 — `handle_new_user` ne fait plus confiance aux métadonnées client (B1) — 4 h

*(Estimation revue de 3 h à 4 h : le correctif naïf « ignorer les métadonnées » casse le rattachement des
employés invités, qui transite précisément par ce canal. Le correctif ci-dessous est le seul qui ferme la
faille sans casser l'invitation.)*

**Discriminants écartés, et pourquoi** — ils paraissent évidents et ne fonctionnent pas ici :
- `current_user` : GoTrue écrit toujours en tant que `supabase_auth_admin`, que l'appel vienne de
  l'API admin ou de l'inscription publique. Aucune discrimination.
- `NEW.invited_at` : mesuré en production, renseigné sur **1 employé sur 15**. Inutilisable.
- `raw_app_meta_data` : non modifiable par le client, mais `admin.generateLink()` n'accepte que `data`
  (→ `user_metadata`). On ne peut rien y écrire au moment où le trigger s'exécute.

**Conception retenue** : le trigger ne décide plus jamais du tenant. Tout compte naît **isolé**, manager de
son propre établissement. Le rattachement à un tenant existant devient une opération explicite du
service-role, postérieure à la création, dans une fonction atomique. Le navigateur n'a plus aucune prise.
Conforme à R3 : si le rattachement échoue, l'invité est manager d'un établissement vide — inutile, mais
sans aucun accès aux données d'autrui.

**Migration `086_handle_new_user_no_metadata_trust.sql`**

```sql
-- 086 — Le trigger d'inscription ne lit plus ni `role` ni `establishment_id`
-- dans raw_user_meta_data : ce champ est écrit par le navigateur
-- (supabase.auth.signUp({ options: { data } })), donc il n'est pas une source
-- d'autorité. Tout compte naît manager de son propre établissement ; le
-- rattachement à un tenant existant passe par attach_invited_user(), réservée
-- au service_role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_est_id UUID;
BEGIN
  INSERT INTO public.establishments (name, owner_id)
  VALUES ('Mon établissement', NEW.id)
  RETURNING id INTO v_est_id;

  INSERT INTO public.profiles (id, email, full_name, role, establishment_id, active_establishment_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), ''),
    'manager',
    v_est_id,
    v_est_id
  );

  -- La bascule d'établissement lit user_establishments.role : la ligne d'origine
  -- doit exister dès la création, sinon le multi-site casse pour les comptes
  -- créés après cette migration (set-role ne l'écrit plus, cf. court-circuit).
  INSERT INTO public.user_establishments (user_id, establishment_id, role)
  VALUES (NEW.id, v_est_id, 'manager')
  ON CONFLICT (user_id, establishment_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Rattachement d'un invité à un tenant existant. Atomique : soit l'invité est
-- entièrement transféré, soit rien. Exécutable uniquement par le service-role.
CREATE OR REPLACE FUNCTION public.attach_invited_user(
  p_user_id UUID, p_establishment_id UUID, p_role TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_orphan UUID;
BEGIN
  IF p_role NOT IN ('employee', 'supervisor', 'manager') THEN
    RAISE EXCEPTION 'Rôle invalide: %', p_role;
  END IF;

  SELECT establishment_id INTO v_orphan FROM public.profiles WHERE id = p_user_id;

  UPDATE public.profiles
     SET role = p_role,
         establishment_id = p_establishment_id,
         active_establishment_id = p_establishment_id
   WHERE id = p_user_id;

  DELETE FROM public.user_establishments
   WHERE user_id = p_user_id AND establishment_id = v_orphan;

  IF p_role IN ('manager', 'supervisor') THEN
    INSERT INTO public.user_establishments (user_id, establishment_id, role)
    VALUES (p_user_id, p_establishment_id, p_role)
    ON CONFLICT (user_id, establishment_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  -- L'établissement auto-créé n'a plus aucun membre : on le supprime.
  DELETE FROM public.establishments
   WHERE id = v_orphan AND owner_id = p_user_id
     AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.establishment_id = v_orphan);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.attach_invited_user(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.attach_invited_user(UUID, UUID, TEXT) TO service_role;
```

**Diff applicatif `app/api/employees/invite/route.ts`** — après le `generateLink` (ligne ~61), une fois
`data.user.id` disponible :

```ts
// Le tenant et le rôle ne transitent plus par les métadonnées (lues par le
// navigateur au signup) : on rattache explicitement, côté serveur.
const { error: attachErr } = await supabaseAdmin.rpc('attach_invited_user', {
  p_user_id: data.user!.id,
  p_establishment_id: estId,
  p_role: role,
})
if (attachErr) {
  await supabaseAdmin.auth.admin.deleteUser(data.user!.id)   // pas d'invité orphelin
  return NextResponse.json({ error: "Impossible de rattacher l'invité" }, { status: 500 })
}
```

Les clés `role` et `establishment_id` restent dans `options.data` sans dommage (elles ne sont plus lues par
personne), mais autant les retirer : elles induiraient le prochain lecteur en erreur.

**Diff `app/api/auth/set-role/route.ts`** — le court-circuit ligne 28-36 doit désormais garantir la ligne
`user_establishments` avant de retourner, sinon les comptes créés après 086 n'ont pas de bascule d'établissement :

```ts
if (ownedEst) {
  await supabaseAdmin.from('user_establishments')
    .upsert({ user_id: user.id, establishment_id: existingProfile.establishment_id, role: 'manager' },
            { onConflict: 'user_id,establishment_id' })
  return NextResponse.json({ role: 'manager', already_setup: true })
}
```

**Vérification (R1)** — depuis un navigateur, avec la clé anon publique, en tant qu'utilisateur non inscrit :

```js
await supabase.auth.signUp({ email:'attaquant@test.fr', password:'…',
  options:{ data:{ role:'manager', establishment_id:'<uuid d’un autre tenant>' } } })
```
puis en base :
```sql
select p.role, p.establishment_id = '<uuid autre tenant>' as a_capture_le_tenant
from public.profiles p join auth.users u on u.id=p.id where u.email='attaquant@test.fr';
-- attendu : role='manager', a_capture_le_tenant = false
```

**Tests à écrire** : 3 tests d'intégration, un par parcours de T0-1, plus le parcours d'attaque ci-dessus.
**Rollback** : `CREATE OR REPLACE` de l'ancienne fonction (conservée dans le dump T0-2). Les comptes créés
entre-temps restent valides.

### L1-2 — Garde `profiles` étendue à INSERT et DELETE (B2) — 2 h

Le trigger 085 est `BEFORE UPDATE` : `DELETE` puis `INSERT` de sa propre ligne le contourne entièrement.
Vérifié : `authenticated` détient bien les `GRANT INSERT/DELETE`, et **aucun code applicatif n'insère ni ne
supprime `profiles` via le client utilisateur** (la seule suppression, `app/api/employees/[id]/route.ts:83`,
passe par `supabaseAdmin.auth.admin.deleteUser` → cascade depuis `auth.users`). Le verrouillage ne casse donc rien.

**Migration `087_profiles_guard_all_ops.sql`**

```sql
CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO ''
AS $$
BEGIN
  -- Le service-role, le trigger d'inscription (SECURITY DEFINER, donc
  -- current_user = propriétaire) et la cascade depuis auth.users
  -- (current_user = supabase_auth_admin) ne sont pas concernés.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Création de profil non autorisée' USING ERRCODE = 'insufficient_privilege';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Suppression de profil non autorisée' USING ERRCODE = 'insufficient_privilege';
  ELSIF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.establishment_id IS DISTINCT FROM OLD.establishment_id THEN
    RAISE EXCEPTION 'Modification de role/establishment_id non autorisée' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profiles_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profiles_privileged_columns
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_privileged_columns();

-- Défense en profondeur : la RLS n'ouvre plus ces chemins (cf. R2 pour l'ordre).
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
REVOKE INSERT, DELETE, TRUNCATE ON public.profiles FROM PUBLIC, anon, authenticated;
```

**Point de vigilance à tester explicitement** : la suppression d'un employé
(`DELETE /api/employees/[id]`) passe par une cascade FK depuis `auth.users`. Le `current_user` y est
`supabase_auth_admin`, donc la garde ne se déclenche pas — **mais c'est une subtilité, pas une certitude
de lecture : elle doit figurer dans les tests de non-régression.**

**Vérification (R1)** — connecté comme employé, depuis le navigateur :
```js
await supabase.from('profiles').delete().eq('id', myId)              // attendu : 42501 / 0 ligne
await supabase.from('profiles').insert({ id: myId, role:'manager' }) // attendu : 42501
await supabase.from('profiles').update({ role:'manager' }).eq('id', myId) // attendu : insufficient_privilege
```

### L1-3 — Verrouillage des écritures sur `subscriptions` (B3) — 2 h

Vérifié : **seul le webhook Stripe écrit cette table**, via le service-role
(`app/api/stripe/webhook/route.ts:67` et `:98`). Aucune écriture applicative côté utilisateur.

Attention au SELECT : `app/(dashboard)/layout.tsx:100` appelle `getSubscription()` **en contexte employé**
(layout partagé). Restreindre le SELECT aux managers casserait le tableau de bord employé. La bonne
granularité est donc **colonne**, pas ligne — et cela demande l'ordre de R2, sinon le `REVOKE` est sans effet.

**Migration `088_lock_subscriptions_writes.sql`**

```sql
DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_delete" ON public.subscriptions;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.subscriptions FROM PUBLIC, anon, authenticated;

-- Les identifiants Stripe n'ont aucune raison d'être lisibles par un salarié.
-- REVOKE de table PUIS GRANT de colonnes (l'inverse est sans effet — cf. 084).
REVOKE SELECT ON public.subscriptions FROM PUBLIC, anon, authenticated;
GRANT  SELECT (id, establishment_id, user_id, plan, status, trial_end,
               current_period_end, cancel_at_period_end, updated_at)
  ON public.subscriptions TO authenticated;
```

**Diff `lib/subscription.ts:25-26`** — retirer les deux colonnes Stripe du `select` (sinon PostgREST renvoie
42501 pour tout le monde, y compris les managers) :

```ts
.select('id, plan, status, current_period_end, cancel_at_period_end, trial_end')
```
et retirer `stripe_customer_id` / `stripe_subscription_id` du type `SubscriptionRow`.

**Diffs `app/api/stripe/checkout/route.ts:46-50` et `app/api/stripe/portal/route.ts:15-19`** — ces deux
routes ont besoin de l'identifiant client Stripe ; elles sont déjà protégées par `requireManager()`.
Remplacer `supabase` par `supabaseAdmin` sur ces deux lectures **en conservant le filtre
`.eq('establishment_id', estId)`** (le filtre est ce qui remplace la RLS, cf. la règle du service-role).

Vérifier aussi `components/compliance/compliance-options-panel.tsx:104`, qui lit `subscriptions` depuis le
navigateur : la requête doit se limiter aux colonnes accordées.

**Vérification (R1)** — connecté comme manager :
```js
await supabase.from('subscriptions').update({ plan:'multisite', status:'active' }).eq('establishment_id', est) // 42501
await supabase.from('subscriptions').select('stripe_customer_id')                                              // 42501
await supabase.from('subscriptions').select('plan,status')                                                     // ok
```

### L1-5 — `rest_daily` : exclure les coupures intra-journée (B5) — 1 h 30

**Diff `lib/compliance/rules.ts:562`**

```diff
-      // Only check if shifts are on different days or same-day with gap > 0
-      if (gapMin >= 0 && gapMin < 660) {
+      // L3131-1 encadre le repos entre deux JOURNÉES de travail. Une coupure
+      // intra-journée (service midi + service soir) n'est pas un défaut de
+      // repos quotidien : elle relève de l'amplitude (amplitude_max) et, pour
+      // les temps partiels, de la coupure (part_time_split). Même garde que
+      // minor_rest_daily ci-dessous.
+      if (next.date !== curr.date && gapMin >= 0 && gapMin < 660) {
```

**Tests à ajouter dans `lib/compliance/rules.test.ts`** :

| Cas | Attendu |
|---|---|
| `11:00-14:30` + `18:30-23:00` le même jour | **aucune** violation `rest_daily` |
| `18:00-23:00` J, puis `06:00-11:00` J+1 (7 h de repos) | `rest_daily` déclenchée |
| `22:00-02:00` J (overnight), puis `10:00-15:00` J+1 (8 h) | `rest_daily` déclenchée |
| `11:00-14:30` + `18:30-23:00` J, puis `11:00` J+1 (12 h) | aucune violation `rest_daily` |

**Vérification (R1)** : sur un jeu de plannings réels en pré-production, `GET /api/compliance` ne renvoie
plus aucune `rest_daily` sur les journées à deux services, et `POST /api/week-status { published: true }`
ne renvoie plus `compliance_blocked` sur une semaine de coupures midi/soir légale.

### Sortie de LOT 1 — critère d'acceptation

Le script `scripts/verify-security.ts` (créé en L2-6, mais dont les 5 premières sondes s'écrivent ici)
renvoie 5 × `ok`. **Sans ce script, le lot n'est pas terminé** : c'est exactement le contrôle qui a manqué
en juillet et qui a laissé passer 083 et 084.

---

## LOT 2 — Critiques (22 h 30) · semaine du 04/08

### L2-6 — `scripts/verify-security.ts` + gate CI (3 h) — **à faire en premier**

Un fichier, une commande, exécutée en CI et manuellement après chaque déploiement. Il transforme R1 en
automatisme. Modèle calqué sur `scripts/check-migrations.ts` (déjà présent, même connexion `SUPABASE_DB_URL`).

```ts
const PROBES: { id: string; label: string; sql: string }[] = [
  { id: 'B1', label: 'handle_new_user ignore les métadonnées client',
    sql: `select pg_get_functiondef(oid) not like '%raw_user_meta_data->>''role''%'
             and pg_get_functiondef(oid) not like '%raw_user_meta_data->>''establishment_id''%' as ok
          from pg_proc where proname='handle_new_user'` },
  { id: 'B2', label: 'profiles : INSERT/DELETE fermés à authenticated',
    sql: `select not has_table_privilege('authenticated','public.profiles','INSERT')
             and not has_table_privilege('authenticated','public.profiles','DELETE') as ok` },
  { id: 'B2b', label: 'garde profiles active sur INSERT/UPDATE/DELETE',
    sql: `select count(*)=1 as ok from pg_trigger
          where tgname='guard_profiles_privileged_columns' and tgtype & 28 = 28` },
  { id: 'B3', label: 'subscriptions : écritures fermées, ids Stripe masqués',
    sql: `select not has_table_privilege('authenticated','public.subscriptions','UPDATE')
             and not has_column_privilege('authenticated','public.subscriptions','stripe_customer_id','SELECT') as ok` },
  { id: 'C1', label: 'establishments : pas de policy FOR ALL ouverte au tenant',
    sql: `select not exists(select 1 from pg_policies
          where tablename='establishments' and cmd='ALL' and qual like '%current_establishment_id()%') as ok` },
  { id: 'M1', label: 'helpers RLS non exécutables par PUBLIC',
    sql: `select not has_function_privilege('anon','public.is_manager()','EXECUTE')
             and not has_function_privilege('anon','public.current_establishment_id()','EXECUTE') as ok` },
  { id: 'M4', label: 'webhook_logs réservé aux managers',
    sql: `select qual like '%is_manager()%' as ok from pg_policies
          where tablename='webhook_logs' and cmd='SELECT'` },
  { id: 'RLS', label: 'aucune table publique sans RLS',
    sql: `select count(*)=0 as ok from pg_class c join pg_namespace n on n.oid=c.relnamespace
          where n.nspname='public' and c.relkind='r' and not c.relrowsecurity` },
]
```

Chaque lot suivant **ajoute sa sonde ici**. Étape CI (voir L3-CI) exécutée contre la branche de test à
chaque PR, et contre la production après chaque déploiement.

### L2-1 — RLS `establishments` : lecture large, écriture au propriétaire (C1) — 1 h 30

**Migration `089_establishments_write_scope.sql`**

```sql
DROP POLICY IF EXISTS "establishments_scoped_manager" ON public.establishments;

CREATE POLICY "establishments_select" ON public.establishments FOR SELECT TO authenticated
USING (
  owner_id = (SELECT auth.uid())
  OR id = (SELECT public.current_establishment_id())
  OR EXISTS (SELECT 1 FROM public.user_establishments ue
             WHERE ue.user_id = (SELECT auth.uid()) AND ue.establishment_id = establishments.id)
);

CREATE POLICY "establishments_update" ON public.establishments FOR UPDATE TO authenticated
USING      (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

REVOKE INSERT, DELETE, TRUNCATE ON public.establishments FROM PUBLIC, anon, authenticated;

-- owner_id et is_active sont des données d'exploitation : même le propriétaire
-- ne les modifie pas depuis le navigateur.
CREATE OR REPLACE FUNCTION public.guard_establishment_admin_columns()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF current_user IN ('authenticated','anon')
     AND (NEW.owner_id IS DISTINCT FROM OLD.owner_id
       OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    RAISE EXCEPTION 'Colonne réservée' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS guard_establishment_admin_columns ON public.establishments;
CREATE TRIGGER guard_establishment_admin_columns BEFORE UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.guard_establishment_admin_columns();
```

`handle_new_user` et `set-role` insèrent des établissements en SECURITY DEFINER / service-role : le `REVOKE
INSERT` ne les affecte pas. `PATCH /api/establishments/[id]` écrit déjà via `supabaseAdmin` après
vérification d'appartenance : inchangé.

### L2-2 — Codes promo écrasés (C2) — 2 h

**Diff `lib/referral.ts`, fonction `applyReferralDiscount`** — ne jamais envoyer `discounts: []` en aveugle :

```ts
const sub = await stripe.subscriptions.retrieve(subId, { expand: ['discounts'] })
const foreign = (sub.discounts ?? [])
  .filter(d => !(typeof d === 'object' && d.coupon?.id?.startsWith('qz-referral-')))

if (pct <= 0) {
  // Ne retirer QUE nos coupons de parrainage : un code promo saisi au checkout
  // par le client lui appartient et doit survivre au webhook.
  const ours = (sub.discounts ?? []).length - foreign.length
  if (ours > 0) {
    await stripe.subscriptions.update(subId, {
      discounts: foreign.map(d => ({ discount: typeof d === 'string' ? d : d.id })),
    })
  }
  return
}
```

**Test** (`lib/referral.test.ts`, Stripe mocké) : abonnement portant un code promo `LAUNCH20` + parrain sans
filleul actif → après `applyReferralDiscount`, `LAUNCH20` est toujours présent. Et : parrain à 1 filleul
actif → coupon `qz-referral-15pct` ajouté, `LAUNCH20` conservé si Stripe l'autorise, sinon décision
documentée (Stripe n'empile pas deux coupons sur une même souscription — le cas doit être tranché
explicitement, pas subi).

**Décision produit à prendre avant de coder** : que se passe-t-il quand un client cumule code promo et
parrainage ? Recommandation : le meilleur des deux, et une ligne dans les CGV. Sans cette décision, le code
n'a pas de spécification.

### L2-3 — Immutabilité des pointages (C3) — 3 h

**Migration `090_presences_employee_write_scope.sql`**

```sql
DROP POLICY IF EXISTS "presences_update" ON public.presences;
DROP POLICY IF EXISTS "presences_delete" ON public.presences;

-- L'employé ne peut écrire que sur son pointage en cours : la journée du jour
-- ou la veille (service de nuit clôturé après minuit), et tant que la sortie
-- n'est pas enregistrée.
CREATE POLICY "presences_update" ON public.presences FOR UPDATE TO authenticated
USING (
  establishment_id = (SELECT public.current_establishment_id())
  AND ((SELECT public.is_manager())
       OR (employee_id = (SELECT auth.uid())
           AND date >= (CURRENT_DATE - 1)
           AND clock_out IS NULL))
)
WITH CHECK (
  establishment_id = (SELECT public.current_establishment_id())
  AND ((SELECT public.is_manager()) OR employee_id = (SELECT auth.uid()))
);

-- La suppression d'un décompte horaire est un acte de gestion (art. L3171-3 :
-- l'employeur doit pouvoir produire les décomptes). Jamais l'employé.
CREATE POLICY "presences_delete" ON public.presences FOR DELETE TO authenticated
USING (establishment_id = (SELECT public.current_establishment_id()) AND (SELECT public.is_manager()));

-- L'heure d'entrée et la date ne sont pas réécrivables par l'employé.
CREATE OR REPLACE FUNCTION public.guard_presence_employee_edits()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_manager()
     AND (NEW.clock_in IS DISTINCT FROM OLD.clock_in OR NEW.date IS DISTINCT FROM OLD.date) THEN
    RAISE EXCEPTION 'Heure d''entrée non modifiable' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS guard_presence_employee_edits ON public.presences;
CREATE TRIGGER guard_presence_employee_edits BEFORE UPDATE ON public.presences
  FOR EACH ROW EXECUTE FUNCTION public.guard_presence_employee_edits();
```

**Le piège à ne pas manquer** : `date >= CURRENT_DATE - 1`. Sans cette tolérance d'un jour, un employé qui
badge à 22 h et débadge à 2 h du matin **ne peut plus clôturer son service** — régression fonctionnelle
immédiate en restauration. Les 4 routes concernées (`clock-in`, `clock-out`, `break-start`, `break-end`)
utilisent le client utilisateur, donc la RLS s'applique : les tester toutes les quatre, dont un service
de nuit à cheval sur minuit.

Toute correction de pointage devient un acte manager. Le champ `needs_review` (migration 049) existe déjà
pour matérialiser la demande de correction côté employé : le brancher plutôt que d'inventer un mécanisme.

### L2-4 — Remise à plat des migrations et du PRA (C4) — 4 h

*(Estimation revue de 6 h à 4 h : reconstituer 078, 079 et `planning_signatures` à l'identique est plus
long et moins fiable que de repartir d'une base de référence.)*

L'état actuel — 2 migrations appliquées sans fichier, 1 table hors migration, 6 numéros dupliqués,
`034` manquant — ne se répare pas fichier par fichier. On repart d'un instantané :

```bash
# 1. Base de référence = la production, seule source de vérité aujourd'hui
supabase db dump --schema public --file supabase/migrations/000_baseline_2026-07-25.sql

# 2. Les 85 fichiers historiques deviennent de la documentation, pas de l'exécutable
mkdir -p supabase/migrations/_archive && git mv supabase/migrations/0*.sql supabase/migrations/_archive/
git mv supabase/migrations/_archive/000_baseline_2026-07-25.sql supabase/migrations/

# 3. Reprise de la numérotation à 086 (les migrations du LOT 1 sont les premières
#    de la nouvelle ère, appliquées par-dessus la baseline)

# 4. Preuve de reconstructibilité, à rejouer en CI
supabase db reset --db-url "$STAGING_DB_URL"       # baseline + 086..09x sur base vierge
supabase db diff  --db-url "$STAGING_DB_URL" --schema public   # doit être VIDE
```

**Critère d'acceptation** : `supabase db diff` entre une base reconstruite de zéro et la production ne
renvoie rien. Tant que ce diff n'est pas vide, le PRA documenté dans `docs/deployment.md` est une fiction —
et il faut alors corriger `docs/deployment.md`, qui affirme le contraire.

Ajouter la règle dans `CLAUDE.md` : **aucune écriture de schéma via le SQL editor.** C'est le comportement
qui a produit la dérive.

### L2-5 — `planning_signatures` : isolation par établissement (C5) — 1 h

**Migration `091_planning_signatures_tenant.sql`**

```sql
ALTER TABLE public.planning_signatures
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;

UPDATE public.planning_signatures ps
   SET establishment_id = p.establishment_id
  FROM public.profiles p
 WHERE p.id = ps.employee_id AND ps.establishment_id IS NULL;

ALTER TABLE public.planning_signatures ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_planning_signatures_establishment
  ON public.planning_signatures(establishment_id);

DROP TRIGGER IF EXISTS set_establishment_id_planning_signatures ON public.planning_signatures;
CREATE TRIGGER set_establishment_id_planning_signatures BEFORE INSERT ON public.planning_signatures
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

DROP POLICY IF EXISTS "planning_signatures_select" ON public.planning_signatures;
CREATE POLICY "planning_signatures_select" ON public.planning_signatures FOR SELECT TO authenticated
USING (
  establishment_id = (SELECT public.current_establishment_id())
  AND (employee_id = (SELECT auth.uid()) OR (SELECT public.is_manager()))
);
```

Même schéma exact que la correction 053 de `shift_exchanges`. Le fait de devoir la refaire à l'identique
sur une autre table est la démonstration de l'utilité de L2-7.

### L2-7 — Harnais de tests RLS (C6) — 8 h

Le seul investissement de ce plan qui empêche les bloquants de réapparaître. Sans lui, chaque `CREATE
POLICY` futur est un pari.

**Conception** — `tests/rls/` avec de **vrais JWT** et la clé anon (jamais le service-role : il contourne
précisément ce qu'on teste).

```
tests/rls/
  seed.ts       # 2 établissements × {manager, superviseur, employé} + 1 shift, 1 contrat,
                # 1 pointage, 1 document par tenant ; idempotent
  clients.ts    # createClient(anonKey) + signInWithPassword → 6 clients typés
  matrix.test.ts        # lecture croisée : pour chaque table, tenant A ne voit rien de B
  escalation.test.ts    # les 4 scénarios d'attaque prouvés par l'audit
  entitlement.test.ts   # écriture subscriptions, establishments, presences
```

`matrix.test.ts` est générique et couvre les 34 tables :

```ts
const TABLES = ['profiles','shifts','presences','contracts','leave_requests','employee_documents',
  'lateness_records','availabilities','postes','settings','week_status','audit_log','compliance_alerts',
  'planning_signatures','shift_exchanges','marketplace_slots','marketplace_applications',
  'replacement_requests','notifications','push_subscriptions','subscriptions','api_tokens',
  'webhook_logs','referrals','revenues','support_reports','deletion_requests','user_establishments',
  'establishments','home_task_completions','ai_usage','ai_batch_jobs','rate_limit_hits','stripe_webhook_events']

describe.each(TABLES)('%s — étanchéité inter-tenant', (table) => {
  it('le manager du tenant A ne lit aucune ligne du tenant B', async () => {
    const { data } = await clients.managerA.from(table).select('*')
    expect((data ?? []).filter(r => r.establishment_id === EST_B)).toHaveLength(0)
  })
})
```

`escalation.test.ts` fige les quatre attaques prouvées — **ce sont des tests de non-régression sur des
failles réelles, pas des cas théoriques** :

1. inscription publique avec `{role:'manager', establishment_id:<tenant B>}` → profil isolé (B1) ;
2. employé : `delete` puis `insert` de sa propre ligne `profiles` → refusé (B2) ;
3. manager : `update subscriptions {plan:'multisite'}` → refusé (B3) ;
4. employé : `update establishments {owner_id: self}` → refusé (C1) ;
5. employé : `update presences {clock_in:'06:00'}` sur un pointage clos → refusé (C3).

**Exécution** : sur une branche Supabase éphémère en CI (`supabase branches create ci-$GITHUB_SHA`,
détruite en fin de job). Coût : quelques minutes par PR. À comparer au coût d'une fuite inter-tenant.

---

## LOT 3 — Majeurs (45 h 30) · semaines du 11/08 et du 18/08

Regroupés en passes cohérentes : une migration par passe, un commit par passe, une sonde de vérification
par passe.

### Passe A — RLS et privilèges (migration `092`, 6 h) — M1, M4, M13, M20, M21 + durcissement

```sql
-- M1 : le REVOKE de 083 était sans effet — le privilège est détenu par PUBLIC.
REVOKE EXECUTE ON FUNCTION public.is_manager()               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_establishment_id() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_manager()               TO authenticated;
GRANT  EXECUTE ON FUNCTION public.current_establishment_id() TO authenticated;

-- M4 : la policy s'appelle « managers view own logs » et ne vérifie pas le rôle.
DROP POLICY IF EXISTS "managers view own logs" ON public.webhook_logs;
CREATE POLICY "webhook_logs_manager_select" ON public.webhook_logs FOR SELECT TO authenticated
USING (establishment_id = (SELECT public.current_establishment_id()) AND (SELECT public.is_manager()));

-- M20 : liste blanche au lieu de liste noire — les secrets ne doivent pas
-- dépendre de la mémoire du prochain développeur.
DROP POLICY IF EXISTS "settings_read" ON public.settings;
CREATE POLICY "settings_read" ON public.settings FOR SELECT TO authenticated
USING (
  establishment_id = (SELECT public.current_establishment_id())
  AND ((SELECT public.is_manager())
       OR key IN ('establishment_name','convention_collective','timezone','week_start',
                  'break_auto_minutes','break_auto_threshold','logo_url',
                  'alert_night_work','alert_sunday_work','alert_part_time_split','alert_hours_avg_weekly'))
);

-- Durcissement : `anon` n'a aucun usage légitime sur les tables RH.
-- PRÉ-REQUIS : vérifier qu'aucune page publique ne lit une table sans session
-- (`/api/push/vapid-key` lit une variable d'env, pas la base — à re-confirmer).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM authenticated;
```

Sur la liste blanche `settings` : **la construire à partir des clés réellement lues côté employé**, pas de
mémoire — `grep -rn "from('settings')" app components | grep -v api/` puis relever les `.eq('key', …)`.
Une clé oubliée casse une fonctionnalité employé ; c'est le sens de défaillance acceptable (R3).

M21 est déjà traité par le `GRANT` de colonnes de L1-3.

**M13 — escalade superviseur → manager (2 h).** `user_establishments_insert` exige `is_manager()`, qui
renvoie vrai pour un superviseur : celui-ci s'insère une ligne `role='manager'` sur son propre
établissement, puis `POST /api/establishments/switch` écrit `profiles.role = membership.role` **via le
service-role**, contournant la garde 087.

```sql
DROP POLICY IF EXISTS "user_establishments_insert" ON public.user_establishments;
DROP POLICY IF EXISTS "user_establishments_update" ON public.user_establishments;
-- Seul un manager strict gère les rattachements, et jamais le sien.
CREATE POLICY "user_establishments_insert" ON public.user_establishments FOR INSERT TO authenticated
WITH CHECK (
  establishment_id = (SELECT public.current_establishment_id())
  AND user_id <> (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles p
              WHERE p.id = (SELECT auth.uid()) AND p.role = 'manager')
);
CREATE POLICY "user_establishments_update" ON public.user_establishments FOR UPDATE TO authenticated
USING (
  establishment_id = (SELECT public.current_establishment_id())
  AND user_id <> (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles p
              WHERE p.id = (SELECT auth.uid()) AND p.role = 'manager')
)
WITH CHECK (establishment_id = (SELECT public.current_establishment_id()));
```

Et dans `app/api/establishments/switch/route.ts:29-31`, ne jamais élever : conserver le rôle le plus
restrictif entre celui du profil et celui de la ligne d'appartenance.

### Passe B — Argent (6 h) — M11, M12, M14

- **M11** — `app/api/stripe/checkout/route.ts:54-67` : persister le client Stripe immédiatement
  (`upsert` sur `establishment_id` via `supabaseAdmin`) au lieu d'attendre le webhook. Une ligne
  `subscriptions` avec `status='incomplete'` est préférable à un client Stripe orphelin par checkout abandonné.
- **M12** — ajouter `event_created BIGINT` à `stripe_webhook_events`, et ignorer tout event dont
  `created` est antérieur au dernier appliqué pour la même souscription. Supprimer le `delete` du marqueur
  d'idempotence (`webhook/route.ts:135`) : rendre chaque effet de bord idempotent est plus sûr que de
  rejouer l'ensemble (`markFirstMonthGranted` l'est déjà par sa clause `.eq('first_month_granted', false)`).
- **M14** — `lib/referral.ts:147` : ajouter `.eq('flagged', false)` dans `getPendingFirstMonth`.

### Passe C — Surface externe (16 h) — M2, M3, M5, M6, M22

- **M2 (3 h)** — nouveau `lib/integrations/url-guard.ts`, appelé à l'enregistrement du réglage **et** avant
  chaque envoi :

```ts
import { lookup } from 'dns/promises'
const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^192\.168\./,
                    /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./]

export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  const u = new URL(raw)
  if (u.protocol !== 'https:') throw new Error('URL_SCHEME')
  if (/^(localhost|.*\.localhost|.*\.internal|metadata\..*)$/i.test(u.hostname)) throw new Error('URL_HOST')
  for (const a of await lookup(u.hostname, { all: true })) {
    const ip = a.address.toLowerCase()
    if (a.family === 6) {
      if (ip === '::1' || /^(fc|fd|fe80|::ffff:)/.test(ip)) throw new Error('URL_PRIVATE')
    } else if (PRIVATE_V4.some(r => r.test(ip))) throw new Error('URL_PRIVATE')
  }
  return u
}
```
  et dans `deliver()` (`lib/integrations/webhook.ts:76`) : `fetch(url, { …, redirect: 'manual', signal: AbortSignal.timeout(5000) })`.
  *Limite assumée à documenter* : la résolution DNS de la vérification et celle du `fetch` sont distinctes
  (fenêtre de DNS rebinding). Le risque résiduel est accepté ; le fermer imposerait un agent HTTP à IP
  épinglée, hors proportion ici. Appliquer le même garde-fou à `lib/integrations/slack.ts` (M5 mineur inclus).

- **M3 (2 h)** — les deux sérialiseurs CSV (`app/api/exports/route.ts:14-19`, `app/api/rgpd/export/route.ts:4-20`) :

```ts
function escape(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s   // neutralise l'injection de formule Excel
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
```
  Un test par exportateur, avec `full_name = '=HYPERLINK("http://x","clic")'`. Vérifier aussi
  `lib/exports/dsn.ts:40`.

- **M5 (4 h)** — `expires_at` (défaut 1 an) et `revoked_at` sur `api_tokens`, filtrés dans
  `validateApiToken` (`lib/api-token.ts:17-22`) ; colonne `scopes TEXT[]` vérifiée par route ;
  `checkRateLimit({ key: 'apiv1:'+tokenId, limit: 120, windowMs: 60_000 })` sur les 3 routes `/api/v1/*` ;
  retirer `phone` de la réponse par défaut de `/api/v1/employees` (minimisation).

- **M6 (3 h)** — `calendar_token_version INT NOT NULL DEFAULT 1` sur `profiles` (la migration `079`
  appliquée en base l'a peut-être déjà créée : **vérifier avant d'ajouter**) ; HMAC calculé sur
  `employeeId + ':' + version` ; bouton « régénérer mon lien » qui incrémente ; rate limit par IP sur la route.

- **M22 (4 h)** — wrapper `withRateLimit(handler, { limit, windowMs, keyBy })` dans
  `lib/rate-limit.ts`, appliqué à `/api/stripe/checkout` (10/h/utilisateur), `/api/rgpd/export` (5/h),
  `/api/exports/*` (20/h), `/api/health` (60/min/IP), `/api/calendar/[token]` (60/h/IP).
  L'infrastructure durable existe déjà (migration 081) : c'est du câblage.

### Passe D — Conformité légale (8 h 30) — M7, M8, M10, M17

**À faire relire par le conseil en droit social** (cf. chemin critique du calendrier).

- **M17 (30 min)** — `lib/compliance/rules.ts:355` : `totalNet > 360` → `totalNet >= 360`
  (L3121-16 : la pause est due **dès** 6 h). Vérifier le même opérateur sur les autres bornes légales
  (`:339` 10 h, `:427` 8 h mineurs, `:438` 4 h 30, `:472` 48 h, `:494` 35 h mineurs) et ajouter un test au
  seuil exact pour chacune.

- **M7 (2 h)** — `lib/compliance/rules.ts:410`, ajouter le test d'interruption > 2 h :

```ts
if (alertPartTimeSplit && isPartTime && dayShifts.length >= 2) {
  const day = [...dayShifts].sort((a, b) => parseTimeMin(a.startTime) - parseTimeMin(b.startTime))
  let maxGap = 0
  for (let i = 0; i < day.length - 1; i++) {
    const s = parseTimeMin(day[i].startTime)
    let e = parseTimeMin(day[i].endTime); if (e <= s) e += 1440
    maxGap = Math.max(maxGap, parseTimeMin(day[i + 1].startTime) - e)
  }
  if (day.length > 2 || maxGap > 120) {
    violations.push({ ruleId: 'part_time_split', employeeId: empId, date,
      description: day.length > 2
        ? `${day.length} créneaux dans la journée (> 1 coupure) pour un temps partiel`
        : `Coupure de ${fmtH(maxGap)} pour un temps partiel (max 2h sauf accord de branche)`,
      suggestedFix: 'Réduire la coupure à 2h ou vérifier la contrepartie prévue par la convention' })
  }
}
```
  Retirer le `[À VÉRIFIER JURIDIQUEMENT]` du `legalRef` (`:161`) **une fois la relecture juridique faite**,
  pas avant.

- **M8 (3 h)** — `contract_hours_exceeded` (`:483`) : calculer le dépassement en pourcentage de la durée
  contractuelle, déclencher `critical` au-delà du plafond applicable (1/10 par défaut, 1/3 si accord de
  branche — nouveau réglage `settings`), et émettre une alerte distincte au franchissement des 35 h
  (requalification en temps plein). Le cron `compliance-check` porte déjà le type `requalification_risk` :
  le réutiliser plutôt que d'en créer un.

- **M10 (3 h)** — aligner la fenêtre de `lib/compliance/persist.ts:43-50`
  sur 84 jours comme `app/api/compliance/route.ts:52`, en ne persistant que les violations de la semaine
  éditée plus celles datées en fin de fenêtre. Alternative plus simple, à préférer si le temps manque :
  supprimer la persistance depuis `syncPlanningConformity` et laisser le cron `compliance-check` (qui charge
  bien 84 jours) seul maître de `compliance_alerts`. **Un seul chemin d'écriture vaut mieux que deux
  cohérents.**

### Passe E — RGPD et intégrité (9 h) — M15, M16, M18, M19

- **M15 (4 h)** — restreindre les colonnes journalisées par `log_audit_event` (liste blanche : exclure
  `hourly_rate`, `monthly_gross_salary`, `birth_date`, `pin_hash`) ; purge `audit_log` à 24 mois via
  `pg_cron` ; job de suppression réel branché sur `deletion_requests` avec horodatage de preuve.
  Sans ce dernier point, l'engagement des CGU (`app/legal/cgu/page.tsx:102` — suppression à 30 jours) reste
  déclaratif.
- **M16 (2 h)** — `app/api/rgpd/export/route.ts:37` : `active_establishment_id ?? establishment_id` ;
  ajouter un export self-service employé limité à ses propres données (art. 15 et 20) ; journaliser chaque
  export dans `audit_log`.
- **M18 (1 h)** — CI : `npm audit --audit-level=high` bloquant ; rendre l'absence des variables du smoke
  test un échec et non un `skip`.
- **M19 (2 h)** — trigger de validation des transitions sur `shift_exchanges` : l'employé ne peut que
  `open → cancelled` (proposeur) ou `open → pending_approval` (accepteur) ; `approved`/`rejected` sont
  réservés au manager.
- **M23 (1 h) — découvert pendant l'exécution du LOT 1.** `app/api/employees/invite/route.ts:34`
  utilise `managerProfile.establishment_id` au lieu de `active_establishment_id ?? establishment_id`,
  contrairement au reste du code. Un manager multi-site qui invite un salarié en opérant depuis
  l'établissement B le rattache en réalité à l'établissement A. Même classe que M16, même correctif.
  *Volontairement non corrigé dans le commit du LOT 1* : la valeur a été passée telle quelle à
  `attach_invited_user()` pour ne pas mêler un changement de comportement à un correctif de sécurité
  (règle R4).

### Modification CI (incluse dans M18)

```yaml
      # --omit=dev : les vulnérabilités de la chaîne eslint ne partent pas en
      # production. --audit-level=critical : les 2 HIGH restantes ne sont
      # corrigées que sur la ligne Next 15 (cf. L1-4) ; un gate rouge en
      # permanence cesse d'être lu.
      - name: Audit dépendances
        run: npm audit --omit=dev --audit-level=critical

      - name: Vérifications de sécurité (base)
        if: ${{ github.event_name == 'pull_request' }}
        env:
          SUPABASE_DB_URL: ${{ secrets.STAGING_DB_URL }}
        run: npx tsx scripts/verify-security.ts

      - name: Tests RLS (branche éphémère)
        env:
          SUPABASE_DB_URL: ${{ secrets.STAGING_DB_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_ANON_KEY }}
        run: npx vitest run tests/rls

      - name: Smoke test HTTP
        # plus de `if:` conditionnel — l'absence de configuration doit échouer
        run: |
          npx next start -p 3100 & echo $! > /tmp/next.pid
          for i in $(seq 1 30); do curl -sf http://localhost:3100/login -o /dev/null && break; sleep 1; done
          BASE_URL=http://localhost:3100 node scripts/smoke.mjs
          kill "$(cat /tmp/next.pid)" || true
```

---

## LOT 4 — v2.0, après le lancement (15 h)

Aucun élément de ce lot ne justifie de retarder l'ouverture commerciale.

| ID | Sujet | Charge | Déclencheur |
|---|---|---|---|
| m10 | Activer la protection des mots de passe compromis (Supabase → Auth → Passwords) | 15 min | **à faire maintenant** : une case à cocher, aucun code |
| **NEW** | **Migration Next 15.5.21+** | à cadrer | **bloque M9** ; Next 14 ne reçoit plus de correctif de sécurité (cf. L1-4) |
| M9 | CSP bloquante avec nonces, sans `unsafe-eval` | 3 h | **après** la migration Next 15 : GHSA-ffhc-5mcf-pf4q rend les nonces vulnérables au XSS avant 15.5.16 |
| m3 | Scinder `is_manager()` / `is_supervisor()` | 3 h | quand un client demandera un vrai rôle superviseur |
| m8, m9 | Middleware : rôle lu depuis `profiles`, liste blanche de routes testée | 4 h | avant d'ajouter une nouvelle zone de routes |
| m2, m11 | Unifier les 3 implémentations de `getWeekMonday` sur `lib/utils/dates.ts` (UTC) | 4 h | au premier bug de date signalé |
| m1 | `/api/health` : réduire la surface publique | 1 h | — |
| m4 | Rendre le choix de CCN obligatoire à l'onboarding | 1 h | — |
| m6, K1-K3 | Résidus « Nexus » (clé `localStorage` + page cookies) | 1 h 30 | — |
| m7 | Index inutilisés | 0 h | **ne rien faire avant 3 mois d'exploitation réelle** — la base est vide, « inutilisé » ne veut rien dire aujourd'hui |

---

## 4. Go / no-go du 21 août

Critères binaires. Un seul `non` = report d'une semaine, pas de dérogation.

| # | Critère | Mesure |
|---|---|---|
| 1 | Les 5 bloquants sont fermés | `npm run verify:security` → 5/5 `ok` **en production** |
| 2 | Les 4 scénarios d'escalade échouent | `vitest run tests/rls/escalation.test.ts` vert |
| 3 | Aucune CVE critique ou haute | `npm audit --audit-level=high` sans sortie |
| 4 | La base est reconstructible | `supabase db diff` entre base neuve et prod = vide |
| 5 | Le moteur ne bloque plus un planning légal | publication d'une semaine de coupures midi/soir sans `compliance_blocked` |
| 6 | Les 3 parcours d'inscription fonctionnent | test manuel email, Google, invitation — dans cet ordre |
| 7 | Le cycle de paiement est intact | checkout, code promo, webhook, portail, résiliation — en mode test Stripe |
| 8 | Les règles M7 et M8 sont relues par un juriste | avis écrit, même bref |

---

## 5. Registre des risques du plan lui-même

| Risque | Probabilité | Parade |
|---|---|---|
| L1-1 casse un parcours d'inscription non identifié | moyenne | T0-1 fait *avant* d'écrire le correctif ; les 3 parcours rejoués après |
| L1-2 bloque la suppression d'un employé (cascade `auth.users`) | moyenne | test de non-régression explicite dans L1-2 ; `current_user` y est `supabase_auth_admin`, pas `authenticated` |
| L1-3 casse le tableau de bord employé (lecture `subscriptions`) | **élevée** | `getSubscription` amaigri **dans le même commit** que le `GRANT` de colonnes ; sinon 42501 pour tout le monde |
| L2-3 empêche le débadgeage d'un service de nuit | **élevée** | la tolérance `date >= CURRENT_DATE - 1` est dans la policy ; tester un service 22 h → 2 h |
| L2-4 (baseline) fait diverger un environnement de dev | faible | les 85 fichiers sont archivés, pas supprimés ; la baseline est un dump vérifié |
| Passe A (`REVOKE ... FROM anon`) casse une page publique | moyenne | pré-requis de vérification listé dans la passe ; rollback = un `GRANT` |
| Indisponibilité du conseil juridique en août | **élevée** | prise de rendez-vous dès le 28/07 — c'est le seul point du plan qui ne dépend pas de vous |

---

## 6. Ce qu'il ne faut pas faire pendant ces 5 semaines

- **Aucune nouvelle fonctionnalité.** Le produit a 17 règles de conformité, un solveur, un marketplace, du
  parrainage, des exports DSN et une PWA. Il n'a pas besoin d'une 18ᵉ règle avant d'avoir un premier client.
- **Ne pas toucher aux 34 index** signalés `unused_index` : la base est vide, la mesure n'a aucun sens.
- **Ne pas relancer de migration de styles** (tokens CSS inline vs Tailwind) : `CLAUDE.md` l'interdit déjà,
  et un diff de masse pendant un durcissement sécurité rend les revues impossibles.
- **Ne pas « améliorer » le moteur de conformité au-delà de M7, M8 et M17.** Les plafonds durs sont justes ;
  y toucher sans besoin, c'est risquer une régression sur la partie qui fonctionne.
- **Ne pas corriger `package.json:2` (`"name": "nexus"`) avant le lancement.** C'est cosmétique et ça
  invalide les caches de build pour rien.

---

*Plan établi le 25 juillet 2026, dérivé des 47 findings de `docs/2026-07-25-audit-pre-lancement-quartzbase.md`.
Charge : 2 h de pre-flight + 12 h bloquantes + 22 h 30 critiques + 45 h 30 majeurs = **82 h avant lancement**,
plus 15 h renvoyées en v2.0. Ouverture commerciale visée : 24 août 2026.*
