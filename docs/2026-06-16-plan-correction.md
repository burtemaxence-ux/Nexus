# PLAN DE CORRECTION — QUARTZBASE

**Date :** 16 juin 2026
**Base :** audit du 16 juin (`docs/2026-06-16-audit-complet-quartzbase.md`) + vérification du code réel.
**Principe :** chaque item = problème → fichier:ligne → correction exacte → vérification → effort → qui.
**Légende qui :** 🤖 = je peux le coder maintenant · 🧑 = décision/action de Maxence · 🤝 = décision Maxence puis code par moi.

> ⚠️ **Mise à jour vs audit du 13 juin :** les « Nexus » des emails sont **déjà corrigés**. L'état réel est moins large qu'annoncé côté branding, mais plus grave côté migrations (034→052 non tracées) et billing (double essai).

---

## VAGUE 0 — CRITIQUE / À FAIRE CETTE SEMAINE

### T1 — Certifier l'état des migrations 034→052 en prod 🤝 — **BLOQUANT**
**Problème :** `docs/migrations-state.md` ne documente que 001→033. Les migrations 034→052 ne sont tracées nulle part. Trois sont des correctifs de sécurité (`042_fix_api_tokens_policy`, `044_fix_settings_rls`, `045_fix_user_establishments_rls`), une est **fonctionnellement vitale** (`048_ai_usage` : sans elle, `consume_ai_credit` n'existe pas → tout appel IA en plan Essentiel renvoie 503). Statut prod = inconnu.
**Correction :**
1. Lister les migrations réellement appliquées en prod : via Supabase MCP `list_migrations`, ou SQL :
   ```sql
   select * from supabase_migrations.schema_migrations order by version;
   -- + vérif des policies sensibles :
   select policyname, tablename from pg_policies
   where tablename in ('api_tokens','settings','user_establishments') order by tablename;
   select proname from pg_proc where proname in ('consume_ai_credit','get_ai_usage');
   ```
2. Appliquer celles qui manquent (`supabase db push` ou SQL editor pour les `APPLY MANUALLY`).
3. **Mettre à jour `migrations-state.md`** : ajouter le tableau 034→052 avec statut prod réel.
**Vérification :** les 3 policies scoped (042/044/045) présentes + `consume_ai_credit` existe + état doc à jour.
**Effort :** 1 h. **Note :** numérotation : 034 est absente (saut 033→035) — documenter ou renommer.

### T2 — Fuite inter-tenant `shift_exchanges` 🤖 — **BLOQUANT multi-site**
**Problème :** `supabase/migrations/026_shift_exchanges.sql` — la table n'a **pas** de `establishment_id`. Les 3 policies RLS reposent sur `role + auth.uid()`. Un manager de l'établissement A peut lire/valider les échanges de B.
**Correction :** nouvelle migration `053_shift_exchanges_tenant_isolation.sql` :
```sql
alter table public.shift_exchanges
  add column if not exists establishment_id uuid references public.establishments(id) on delete cascade;

update public.shift_exchanges se
set establishment_id = s.establishment_id
from public.shifts s
where se.shift_id = s.id and se.establishment_id is null;

alter table public.shift_exchanges alter column establishment_id set not null;
create index if not exists idx_shift_exchanges_establishment
  on public.shift_exchanges(establishment_id);

-- auto-remplissage à l'insert (même mécanisme que les autres tables tenant)
drop trigger if exists set_establishment_id_shift_exchanges on public.shift_exchanges;
create trigger set_establishment_id_shift_exchanges
  before insert on public.shift_exchanges
  for each row execute function public.auto_set_establishment_id();

drop policy if exists "employees see relevant exchanges" on public.shift_exchanges;
drop policy if exists "employees create exchanges" on public.shift_exchanges;
drop policy if exists "employees and managers update exchanges" on public.shift_exchanges;

create policy "exchanges_select_scoped" on public.shift_exchanges for select
  using (establishment_id = current_establishment_id()
    and (status = 'open' or auth.uid() = proposer_id or auth.uid() = acceptor_id or is_manager()));
create policy "exchanges_insert_scoped" on public.shift_exchanges for insert
  with check (establishment_id = current_establishment_id() and auth.uid() = proposer_id);
create policy "exchanges_update_scoped" on public.shift_exchanges for update
  using (establishment_id = current_establishment_id()
    and (auth.uid() = proposer_id or auth.uid() = acceptor_id or is_manager()));
```
Puis vérifier que la route API de création d'échange n'envoie pas un `establishment_id` erroné (laisser le trigger faire).
**Vérification :** test à 2 établissements — le manager A ne voit aucun échange de B (requête directe + UI).
**Effort :** 1 h.

### T3 — Double essai filleul (~60 j gratuits) 🤝
**Problème :** `app/api/stripe/checkout/route.ts:86` applique `trial_period_days: 30` **et** (ligne 74-75) le coupon `qz-referral-firstmonth` (100 % off once). Le filleul cumule 30 j trial + 30 j coupon. Le marketing dit « 1er mois offert ».
**Décision (Maxence) :** veut-on que « 1er mois offert » = 1 mois (recommandé) ou 2 mois ?
**Correction recommandée (1 mois exact) :** ligne 86, ne pas donner de trial quand le coupon filleul s'applique :
```ts
// avant
...(isFirstSubscription ? { trial_period_days: TRIAL_DAYS } : {}),
// après
...(isFirstSubscription && !firstMonth ? { trial_period_days: TRIAL_DAYS } : {}),
```
**Vérification :** un filleul → abonnement Stripe sans trial + coupon 100 %-once = exactement 1 mois gratuit ; un non-filleul → trial 30 j.
**Effort :** 10 min.

### B1 — Essai affiché 14 j ≠ 30 j Stripe 🤖
**Problème :** `app/(dashboard)/manager/settings/billing/page.tsx:23` hardcode 14 j depuis `created_at`, alors que `TRIAL_DAYS = 30` est la source de vérité.
**Correction (rapide) :** importer `TRIAL_DAYS` (ligne 2) et remplacer ligne 23 :
```ts
const trialEnd = new Date(new Date(user.created_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
```
**Correction robuste (recommandée, supprime le double-essai pour TOUS) :** au checkout, ne pas redonner 30 j pleins mais le **reste** de la fenêtre d'essai entamée à l'inscription :
```ts
// checkout: ajouter created_at au fetch profil, puis
const elapsed = (Date.now() - new Date(user.created_at).getTime()) / 86400000
const remaining = Math.max(0, Math.ceil(TRIAL_DAYS - elapsed))
// trial_period_days: remaining > 0 ? remaining : undefined
```
→ un seul compteur de 30 j, continu, de l'inscription à la 1ère facture.
**Vérification :** un compte de 5 jours affiche « 25 jours restants » ; s'abonner ne réinitialise pas l'essai.
**Effort :** 15 min (rapide) / 45 min (robuste).

### R1 — CGU de non-responsabilité conformité 🧑 (rédaction) + 🤖 (intégration)
**Problème :** le « blocage doux » (commit `fe13cda`) signale mais laisse publier un planning non conforme. Si redressement, responsabilité ambiguë.
**Correction :** clause dans `/legal` : *« Quartzbase fournit une aide à la décision basée sur des règles automatisées ; il ne constitue pas un conseil juridique. L'employeur reste seul responsable de la conformité de ses plannings et contrats. »* + case à cocher à la 1ère publication contournant une alerte.
**Vérification :** clause publiée + log d'acceptation à l'override.
**Effort :** rédaction 1 h + intégration 1 h.

### R2 — Continuité post-gendarmerie (septembre 2026) 🧑 — **EXISTENTIEL**
**Problème :** fondateur solo qui part dans 3 mois ; aucun plan annoncé aux (futurs) clients.
**Décision à écrire :** vendre (acqui-hire) avant sept. / transmettre à un associé / mode maintenance minimal documenté. Tout le reste (GTM, valo) en dépend.
**Vérification :** décision écrite et datée +, si maintenance, runbook + accès + procédure de restauration documentés.
**Effort :** décision (à trancher) + 1 j de documentation.

---

## VAGUE 1 — IMPORTANT / 2 SEMAINES

### N1 — Titre push « Nexus » 🤖
**Problème :** `public/sw.js:70` → `const title = data.title ?? 'Nexus'` (fallback visible dans les notifications push). Ligne 1 = commentaire (non visible).
**Correction :** remplacer `'Nexus'` par `'Quartzbase'` (ligne 70) + commentaire (ligne 1).
**Vérification :** `grep -n "Nexus" public/sw.js` → seules occurrences acceptées ; push de test affiche « Quartzbase ».
**Effort :** 5 min.

### N2 — Headers `X-Nexus-Event` 🤝
**Problème :** `lib/integrations/webhook.ts:89,106` envoient l'en-tête HTTP `X-Nexus-Event` aux webhooks clients.
**Décision :** renommer en `X-Quartzbase-Event` **casse** les intégrations clientes existantes. Recommandation : **émettre les deux** en-têtes pendant une transition, ou laisser tel quel (header technique non visible). Ne pas renommer sans préavis.
**Effort :** 15 min si double en-tête.

### N3 — Doc interne « Nexus → Quartzbase » 🤖 (cosmétique)
**Fichiers :** `README.md:1`, `docs/ARCHITECTURE.md:1,3,36`, `docs/api-v1.md:1`, `supabase/README.md:1,3`. Non livré aux clients → faible priorité, mais à uniformiser.
**Effort :** 15 min.

### B2 / A3 — Churn du parrain non géré 🤖
**Problème :** quand le parrain résilie, ses filleuls gardent leur lien indéfiniment ; pas de nettoyage. `lib/referral.ts` gère le churn filleul (`churnReferral`) mais pas le sens inverse.
**Correction :** dans le webhook Stripe (`subscription.deleted` du parrain), marquer ses referrals actifs comme `suspended` (et les réactiver s'il se réabonne), ou au minimum logguer. Décision mineure sur le statut cible.
**Vérification :** parrain résilie → ses filleuls ne comptent plus comme remise active.
**Effort :** 1 h.

### A2 — Anti-abus comptes fictifs 🤖
**Problème :** `lib/referral.ts` bloque l'auto-parrainage (l.87) et les doublons (l.90-96), mais rien contre N faux comptes (trial gratuit → abus gratuit).
**Correction :** alerte/flag si un même `referrer_id` génère > 3 filleuls en < 14 j, ou même empreinte (IP/email domain) ; mettre ces referrals en revue manuelle avant activation par le cron.
**Vérification :** scénario 4 inscriptions rapides même parrain → flaggées, non activées automatiquement.
**Effort :** 2-3 h.

### Marketing parrainage : −75 % → −30 % 🧑
**Problème :** le discours commercial annonce encore −75 % (×5) ; le code plafonne à −30 % (×2). Promesse non tenable.
**Correction :** aligner landing/FAQ/dashboard sur −15 %/filleul, max −30 % (×2), et « 1er mois offert » (cf. T3).
**Effort :** 30 min (copy).

### E1 — Pointage : fermeture forcée après relance 🤖
**Problème :** le cron `check-missing-clockout` (23h) **notifie** mais ne **clôt pas**. Un oubli persistant laisse le pointage ouvert et fausse les heures (le flag `needs_review` ne se déclenche qu'au clock-out).
**Correction :** étendre le cron — si un pointage est ouvert > X h après la fin du shift et après relance, auto-clôturer sur l'heure de fin de shift + `needs_review = true` (à valider par le manager).
**Vérification :** pointage oublié → clôturé auto le lendemain, marqué à vérifier.
**Effort :** 1-2 h.

### Landing — corrections à fort levier 🤝
- **L1** Réécrire le hero autour de la conformité (cf. wording audit P3). 🤝
- **L2** CTA → « Tester 30 jours, sans carte bancaire ». 🤖
- **L5** Durcir/sourcer ou retirer le comparatif Skello (risque juridique). 🤝
**Effort :** 2 h copy + intégration.

---

## VAGUE 2 — UX / PRODUIT / 3-6 SEMAINES

| ID | Item | Qui | Effort |
|----|------|-----|--------|
| M1 | Wizard d'onboarding manager (établissement → employés → 1er planning) | 🤝 | 2-3 j |
| M2 | KPI « coût masse salariale prévisionnel de la semaine » au dashboard | 🤖 | 1 j |
| M3 | Regrouper les ~14 écrans de settings en ~5 | 🤝 | 1-2 j |
| M4 | Couper (ou mettre en option) le cron `weekly-summary-employee` | 🤖 | 30 min |
| E2 | Push à la publication du planning + rappel shift J-1 | 🤖 | 1 j |
| E3 | Invitation employé par **SMS + lien magique** (sans mot de passe) | 🤝 | 1-2 j |
| N4 | Thème **clair par défaut** (dark en option) + accent plus institutionnel | 🤝 | 2-3 j |
| N5 | Vérifier/ajuster WCAG des teintes #FFB347 / #00D4AA en texte | 🤖 | 2 h |
| L3 | Vidéo démo 60 s « planning conforme en 2 min » | 🧑 | — |
| L4 | Garantie remboursement 30 j + badge hébergement France/RGPD | 🤝 | 2 h |

---

## VAGUE 3 — SOLIDITÉ / RISQUE / CONTINU

| ID | Item | Qui | Effort |
|----|------|-----|--------|
| TS1 | Tests sur chemins critiques : checkout, webhook Stripe, activation/churn parrainage, isolation RLS (multi-tenant) | 🤖 | 2-3 j |
| R3 | Support formalisé : FAQ étendue + canal (WhatsApp Business ?) + délais annoncés | 🧑 | 1 j |
| R4 | RGPD : registre de traitement, durées de conservation, base légale documentés | 🧑 | 1 j |
| R5 | Continuité services tiers : sauvegardes Supabase planifiées + procédure de restauration testée | 🤝 | 1 j |
| TS2 | CI : lancer `vitest` + `next build` + `grep Nexus` à chaque push (GitHub Action) | 🤖 | 2 h |

---

## SÉQUENÇAGE RECOMMANDÉ

1. **Aujourd'hui (≈ 3 h de code + 2 décisions) :** T2, T3, B1, N1 (code) ; T1 (vérif migrations) ; décisions R2 + T3.
2. **Cette semaine :** R1 (CGU), A2/B2 (parrainage), E1 (pointage), copy parrainage.
3. **2 semaines :** Landing (L1/L2/L5), N2/N3.
4. **Ensuite :** Vagues 2 et 3 selon la décision R2 (inutile d'investir en UX si revente acqui-hire avant septembre).

**Garde-fou stratégique (rappel de l'audit) :** ne pas repartir en mode « features ». Les vagues 0-1 protègent (sécu, légal, cohérence) et débloquent la vente ; au-delà, ne coder que ce que la décision R2 justifie.

---

## CE QUE JE PEUX FAIRE TOUT DE SUITE 🤖
Sans aucune décision préalable : **T2** (migration isolation tenant), **B1** (essai 30 j), **N1** (push title), **M4** (couper cron), **N3** (doc), **N5** (WCAG).
Avec une décision rapide : **T3** (1 ou 2 mois ?), **N2** (renommer header ?), **R2** (trajectoire).
