# AUDIT COMPLET — QUARTZBASE (repo `Nexus`)

**Date :** 6 juillet 2026
**Méthode :** audit de A à Z ancré dans le code réel du repo, lecture seule (aucune modification du produit). Signaux objectifs mesurés : typecheck, lint, suite de tests, build de production, greps exhaustifs, lecture des modules critiques (auth, RLS, Stripe, crons, IA, conformité).
**Référence :** cet audit succède à `docs/2026-06-16-audit-complet-quartzbase.md` et à son plan de correction. Il vérifie ce qui a réellement été corrigé et ce qui a bougé depuis (≈ 40 commits, refonte landing, moteur conformité ×17 règles, back-office opérateur, dashboard manager refait).

---

## RÉSUMÉ EXÉCUTIF

**Verdict : la base technique est saine et nettement au-dessus de la moyenne d'un SaaS solo. Les corrections critiques de l'audit de juin sont réelles et vérifiables dans le code. Un seul problème client-visible notable a été RÉINTRODUIT par la refonte de la landing : l'incohérence « 14 jours / 30 jours » d'essai, présente à 7 endroits du site public.** Le reste des constats est de la dette documentaire et des points de vigilance, pas des failles.

| Signal objectif | Résultat |
|---|---|
| `npx tsc --noEmit` | ✅ 0 erreur |
| `npm run lint` (ESLint) | ✅ 0 warning, 0 erreur |
| `npm run test` (Vitest) | ✅ 21 fichiers, **191/191 tests passent** (5 s) |
| `npm run build` (prod) | ✅ succès (exit 0), middleware 151 kB, First Load JS partagé 153 kB |
| Résidus « Nexus » visibles client | ✅ 0 (restent des identifiants internes inoffensifs) |
| Migrations sécurité (042/044/045/053…) | ✅ certifiées appliquées en prod (doc + script `check:migrations`) |

---

## 1. QUALITÉ DU CODE & CHAÎNE DE BUILD — 🟢 très bon

### 1.1 Typecheck & lint
TypeScript strict passe sans erreur sur l'ensemble du projet (~250 fichiers source). ESLint (config `eslint-config-next`) est vert. C'est rare à ce stade et ça se voit dans le code : types domaine centralisés (`types/index.ts`), validation Zod systématique des inputs API (`lib/validations.ts`), pas de `any` sauvage constaté dans les modules lus.

### 1.2 Tests — 191 verts, couverture concentrée là où ça compte
- **Conformité** (`lib/compliance/rules.test.ts`) : 48 assertions sur les 17 règles — le module au cœur de la promesse commerciale est le mieux testé. Cohérent.
- **Planning** : solveur, pipeline de génération, réparation, formulaire shift — tests bout-en-bout du pipeline algorithmique, y compris le non-dépassement des heures contractuelles et une régression verrouillée sur le fix `tool_result` IA.
- **Argent & accès** : `stripe.test.ts`, `subscription.test.ts`, `plan-guard.test.ts`, `referral.test.ts`, tests de route sur checkout/webhook Stripe et endpoints admin. La logique de facturation est la deuxième zone la mieux couverte. Bon choix de priorités.
- **Limite réaliste :** la couverture reste concentrée (compliance, planning, billing, referral, webhook, validations + 2 tests DOM). L'essentiel des ~80 routes API et de l'UI n'a pas de test. Ce n'est pas anormal pour la taille de l'équipe, mais toute refonte des routes CRUD se fera sans filet.

### 1.3 Hygiène générale
- Erreurs capturées vers Sentry (`@sentry/nextjs` + `instrumentation.ts`, configs client/edge/server présentes).
- `logger.ts` centralise la capture ; endpoint `/api/health` expose l'état de database/ai/email/push/slack.
- Rendu Markdown de l'IA passé par `rehype-sanitize` (pas d'injection HTML via les réponses du modèle).
- Conventions CSS documentées et suivies (tokens CSS, pas de migration de masse).

### 1.4 Build de production
`npm run build` **passe** (exit 0, variables Supabase factices — le build ne dépend d'aucun secret réel). Tailles saines : First Load JS partagé 153 kB, middleware 151 kB, l'essentiel des pages en rendu dynamique serveur comme attendu pour une app authentifiée.

---

## 2. ARCHITECTURE — 🟢 solide, dimensionnée honnêtement

Next.js 14 App Router + Supabase (Postgres, Auth, RLS, Storage) + Vercel + Stripe + Resend + Anthropic + web-push + Twilio (optionnel). Server Components par défaut, client components réservés à l'interactif. Multi-tenant par `establishment_id` + RLS sur toutes les tables, fonction `current_establishment_id()` pour le multi-site.

Points notables :
- **Séparation des clients Supabase** propre (browser / server / middleware / admin-service-role) ; le client admin n'est utilisé que côté serveur pour les opérations système.
- **Le moteur de conformité** (`lib/compliance/rules.ts`, 654 lignes) est du pur TypeScript déterministe et testé : 17 règles avec référence légale précise (dont 5 règles mineurs, temps partiel, moyenne 44 h/12 semaines, amplitude 13 h, repos hebdo 35 h). `RULE_COUNT` est **dérivé du code** et injecté dans la landing/FAQ — le chiffre marketing ne peut plus diverger du moteur. Excellent réflexe.
- **La génération de planning** est passée d'« IA seule » à un pipeline *compliant-by-construction* : solveur déterministe + réparation + IA (Sonnet, tool use, 12 itérations max), avec respect des règles mineurs/contrat dans les moteurs. Les shifts sont validés (appartenance de l'employé vérifiée) avant insertion.
- **Le quota IA** est en Postgres, atomique et fail-closed (`consume_ai_credit`, migrations 048/052/060), débité **après** génération réussie seulement. Le rate-limit horaire est sur Vercel KV avec fallback in-memory documenté et assumé comme best-effort. Bonne hiérarchie : la limite qui compte (mensuelle, payante) est incontournable.
- **Prévision CA / productivité** (`lib/forecast.ts`) : délibérément déterministe (moyenne pondérée par récence, cibles sectorielles coût MO/CA). Pas de ML cosmétique. Honnête.

---

## 3. SÉCURITÉ — 🟢 bon niveau, 3 points de vigilance mineurs

### Ce qui est bien fait (vérifié dans le code)
- **Contrôle d'accès serveur basé sur la base**, pas sur le client : `requireManager`/`requireEmployee` (`lib/api-auth.ts`) relisent le rôle depuis `profiles` (protégé RLS) à chaque requête. `/api/auth/set-role` refuse explicitement l'élévation d'un profil `employee` existant.
- **Back-office `/admin`** : double barrière (middleware + layout serveur) sur liste d'emails `OPERATOR_EMAILS`, fail-closed si la variable est absente.
- **Crons** : Bearer `CRON_SECRET` comparé en temps constant (`timingSafeEqual`), **rejet systématique si le secret n'est pas configuré**.
- **Stripe** : signature de webhook vérifiée (`constructEvent`), idempotence en base (migration 058), contraintes plan/status alignées code↔schéma (066), le webhook gère churn filleul **et** churn parrain.
- **Secrets** : plus aucun secret par défaut dans le code — `CALENDAR_SECRET` est désormais requis (l'ancien fallback `nexus-calendar-2024` relevé en juin a disparu). Tokens API v1 hachés SHA-256, affichés une seule fois.
- **RLS** : l'isolation tenant de `shift_exchanges` (faille relevée en juin) est fermée (migration 053 : colonne `establishment_id NOT NULL`, policies scopées, trigger). Les passes advisor Supabase (`initplan`, policies permissives multiples, index FK) ont été traitées (059/061/055) et le doc de migrations trace les vérifications prod datées.
- **Anti-abus parrainage** : anti-auto-parrainage, anti-doublon, flag vélocité (054), remise plafonnée −30 %.

### Points de vigilance (aucun bloquant)
1. 🟡 **`user_metadata.role` pilote le routage du middleware.** Les métadonnées user sont modifiables par le client (`auth.updateUser`) : un employé pourrait se donner `role: manager` et *atteindre les pages* `/manager`. Les données restent protégées (RLS + `requireManager` en base) — c'est un problème d'expérience/défense en profondeur, pas une fuite. Recommandation : lire le rôle depuis `profiles` dans le middleware, ou synchroniser `app_metadata` (non modifiable client) au lieu de `user_metadata`.
2. 🟡 **Token iCal sans révocation** : `HMAC(employeeId)` tronqué à 64 bits, stable à vie. Non devinable, mais un lien partagé/fuité expose le planning pour toujours. Une rotation par secret versionné ou un token stocké révocable serait plus propre. Impact faible (données planning uniquement).
3. 🟡 **Rate-limit horaire in-memory en l'absence de KV** : documenté et assumé, mais à confirmer que `KV_REST_API_URL` est bien posée en prod (le warning de démarrage le dira).

---

## 4. BASE DE DONNÉES & MIGRATIONS — 🟠 le point faible actuel : la traçabilité

Le contenu des migrations est de bonne qualité (idempotence réfléchie, cf. 021 ; durcissements successifs documentés). **Mais la discipline de numérotation et de documentation a décroché depuis le 19 juin :**

1. 🟠 **6 numéros de migration en collision** : `042`, `043`, `044`, `045`, `046` et `071` existent chacun en **deux fichiers différents** (ex. `042_fix_api_tokens_policy.sql` + `042_support_reports.sql` ; `071_home_task_completions.sql` + `071_planning_conformity_alerts.sql`). Le CLI Supabase applique par ordre de nom de fichier donc ça « marche », mais c'est exactement le genre d'ambiguïté qui provoque un drift prod/repo — le problème qui a coûté cher en juin. (`034` est en revanche un saut assumé et documenté.)
2. 🟠 **`docs/migrations-state.md` est périmé** : il déclare « la prochaine migration sera 063 » alors que 064→071 existent déjà (8 migrations non tracées : vapid, schema drift subscriptions, champs admin, revenus, rémunération contrats, archived_at, tâches home, alertes conformité planning). L'état prod de ces 8+ migrations n'est certifié nulle part. Le script `npm run check:migrations` existe — il faut le faire tourner et remettre le doc à jour.
3. 🟡 Le doc d'état des corrections dit « cron `weekly-summary-employee` retiré », or il est **toujours planifié dans `vercel.json`** (vendredi 18h) et la route appelle bien l'API Anthropic. Soit il a été réactivé volontairement (alors mettre à jour le doc), soit c'est un oubli qui brûle du crédit IA chaque semaine.

> Ces trois points sont du même type : **le code avance plus vite que sa documentation d'état**. Rien n'est cassé aujourd'hui ; c'est le terreau classique du prochain incident.

---

## 5. COHÉRENCE PRODUIT ↔ MARKETING — 🟠 une régression réelle à corriger

1. 🔴 **L'incohérence « 14 jours / 30 jours » est revenue avec la refonte de la landing.** Le code donne 30 jours (`TRIAL_DAYS = 30`, Stripe `trial_period_days`), la page d'inscription et le login affichent « 30 jours », la FAQ dit « 30 jours complets »… mais **7 occurrences « 14 jours gratuits »** subsistent sur le site public :
   - `components/public/hero-section.tsx:116` (badge sous le CTA principal)
   - `app/page.tsx:22,26,36` (description SEO + OpenGraph + JSON-LD — ce que Google affiche)
   - `components/public/content-page.tsx:107` (CTA par défaut des pages publiques)
   - `app/(public)/guide-demarrage/page.tsx:52` et `app/(public)/code-du-travail/page.tsx:58`
   - `components/public/faq.tsx:16` (« Que se passe-t-il après les 14 jours d'essai ? »)
   C'était le point n°1 « incohérence visible client » de l'audit de juin, corrigé côté app, puis réintroduit par les commits de refonte landing. Correction triviale (chaînes de texte), idéalement en dérivant l'affichage de `TRIAL_DAYS` comme ça a été fait pour `RULE_COUNT`.
2. 🟡 **« Ils reçoivent leur planning par SMS »** (FAQ) : l'envoi SMS est un no-op silencieux si Twilio n'est pas configuré (`lib/sms.ts` retourne `false`). La promesse est vraie *si et seulement si* `TWILIO_*` sont posées en prod — à vérifier avant de laisser cette phrase.
3. 🟢 Le reste est bien aligné : 17 règles (chiffre dérivé du code), −30 % parrainage max (constantes code = copie marketing), « sans carte bancaire » exact (checkout en trial sans CB), plans/limites (3/10/25/illimité employés ; 3 générations IA/mois en Essentiel, illimité en Pro) cohérents entre `plan-guard.ts`, `stripe.ts` et la grille tarifaire publique.

---

## 6. FONCTIONNEL — 🟢 périmètre large, réellement câblé

Vérifié par lecture (pas de test manuel possible en environnement isolé) : planning (4 vues + print + copie semaine + publication), badgeuse PIN avec pauses, clôture inter-jour et flag `needs_review` + clôture forcée par cron, congés bout-en-bout avec emails/push/SMS, échanges de shifts avec isolation tenant, marketplace de remplacement, SOS remplacement avec scoring, 17 règles de conformité branchées partout (grille, modal shift, solveur, IA, journal horodaté, notification temps réel des infractions critiques), brief hebdo manager IA « humanisé », rapports PDF (dont rapport paie), exports CSV, API v1 lecture seule, webhooks/Slack/iCal, PWA + push, multi-établissements avec entitlement propriétaire (045/f516ba2), back-office opérateur complet (KPIs, MRR estimé, relances, santé services, signalements), centre de commande support documenté (`docs/COMMAND_CENTER.md` — playbooks par symptôme, modèles de réponse).

Réserves honnêtes :
- Tout cela reste **peu éprouvé en conditions réelles** (trafic pré-lancement — les index « unused » de l'advisor le confirment). La solidité au premier vrai mois d'usage est plausible mais non prouvée.
- La règle `part_time_split` porte un commentaire `[À VÉRIFIER JURIDIQUEMENT]` (limites CCN HCR) — à faire valider avant d'en faire un argument.
- 8 crons Vercel : tous authentifiés, mais leur coût IA cumulé (brief manager + résumé employé + compliance) mérite un œil sur la facture Anthropic dès les premiers dizaines de clients.

---

## 7. DETTE DOCUMENTAIRE INTERNE — 🟡

- `CLAUDE.md` exige la lecture de `.claude/COMMON_MISTAKES.md`, `.claude/QUICK_START.md`, `.claude/ARCHITECTURE_MAP.md` — **ces trois fichiers n'existent pas** dans le repo (`.claude/` ne contient que `hooks/` et `settings.json`).
- `docs/ARCHITECTURE.md` date d'avant la refonte : « 28 migrations » (il y en a 77 fichiers), 7 règles de conformité (17), pas de mention des plans/billing/admin. Bon document, à rafraîchir.
- `docs/migrations-state.md` : cf. §4.
- Email support `assistance.quartzbase@mail.fr` (domaine `mail.fr`, différent de `quartzbase.fr`) dans le runbook : fonctionnel peut-être, mais peu confiant vu du client — à vérifier si c'est voulu.

---

## 8. SYNTHÈSE DES CONSTATS PAR PRIORITÉ

| # | Constat | Gravité | Effort |
|---|---|---|---|
| 1 | « 14 jours gratuits » ×7 sur le site public vs 30 jours réels (hero, SEO/OG/JSON-LD, CTA, FAQ) | 🔴 incohérence client-visible, régression | ~30 min (dériver de `TRIAL_DAYS`) |
| 2 | `docs/migrations-state.md` périmé : migrations 063→071 non certifiées en prod | 🟠 risque de drift prod/repo | 1 h (`check:migrations` + doc) |
| 3 | Collisions de numéros de migrations (042-046, 071 en double) | 🟠 ambiguïté d'application | renommer à la prochaine migration + règle d'or |
| 4 | Cron `weekly-summary-employee` actif dans `vercel.json` alors que documenté « retiré » | 🟡 coût IA + doc fausse | 5 min (trancher : couper ou documenter) |
| 5 | Routage middleware sur `user_metadata.role` (modifiable client) | 🟡 défense en profondeur | ½ j (lire `profiles` ou `app_metadata`) |
| 6 | Promesse « planning par SMS » conditionnée à Twilio configuré | 🟡 à vérifier en prod | vérif env |
| 7 | Token iCal non révocable | 🟡 faible impact | plus tard |
| 8 | `part_time_split` non validée juridiquement | 🟡 avant d'en faire un argument | validation externe |
| 9 | Docs internes (`.claude/*` manquants, ARCHITECTURE.md daté) | 🟢 confort | au fil de l'eau |

### Verdict global
Le produit est **techniquement prêt à vendre** : les fondations (sécurité, facturation, conformité, tests sur les zones critiques) sont vérifiables et solides, et les corrections de l'audit de juin sont réelles — pas cosmétiques. Les faiblesses actuelles sont de la **discipline d'état** (docs de migrations, cohérence des chaînes marketing après refonte), pas de la qualité de code. Corriger le point n°1 avant toute campagne d'acquisition : c'est la seule chose qu'un prospect peut voir.

---

*Audit réalisé le 6 juillet 2026 — lecture seule, ancré dans le code, sans complaisance ni catastrophisme.*
