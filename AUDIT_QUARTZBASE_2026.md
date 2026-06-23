# QUARTZ AUDIT GROUP — « THE GRANDMASTER AUDIT »
## Audit pré-lancement de Quartzbase — Édition Juin 2026

> **Note méthodologique majeure.** Contrairement à un audit « sur dossier », ce rapport a été produit **avec accès au code source réel** (dépôt `nexus`, branche de travail). Beaucoup d'affirmations sont donc **[VÉRIFIÉ]** par lecture directe du code, exécution de la suite de tests (140 tests / 14 fichiers, **tous verts**), et calcul des ratios de contraste WCAG. Là où la vérification exige la prod (délivrabilité email, latence réelle, état des migrations en base), nous marquons **[À TESTER]** avec le protocole exact.
>
> **Le brief fourni est en partie obsolète vis-à-vis du code réel.** Trois écarts factuels majeurs, tous en faveur du produit :
> 1. **45 migrations annoncées → 70 réelles** ; **6 crons annoncés → 8 réels**.
> 2. **Parrainage « -75 % max » → en réalité plafonné à -30 %** dans le code, avec un commentaire explicite : *« The previous -75% cap was financially unsustainable »*. Le fondateur a **déjà corrigé** la faille économique que le brief décrit comme un risque.
> 3. **Essai « 14 jours » → 30 jours** (`TRIAL_DAYS = 30`, confirmé sur landing + email welcome).
>
> Catégories : **[VÉRIFIÉ]** (confirmé dans le code) · **[DÉDUIT]** (raisonnement pro à valider) · **[À TESTER]** (exige prod/accès externe, protocole fourni).

---

# 1. SYNTHÈSE EXÉCUTIVE

| | |
|---|---|
| **Note finale** | **71 650 / 100 000** |
| **Sur 100** | **71,7 / 100** |
| **Lettre** | **B** (barème : A+ ≥95 · A 85-94 · B 70-84 · C 55-69 · D 40-54 · F <40) |
| **Décision lancement** | **GO CONDITIONNEL** |

**Verdict en 5 lignes.** Quartzbase n'est pas un MVP : c'est un produit B2B **techniquement abouti, sécurisé et testé** — au-dessus du niveau d'ingénierie de 90 % des SaaS pré-seed français. Il peut être **lancé dès maintenant** moyennant 5 corrections bloquantes (toutes à effort faible). Sa valeur de **revente aujourd'hui est faible (5–25 k€)** non par défaut technique mais parce qu'il a **0 client et un fondateur qui part en gendarmerie en septembre 2026** — c'est-à-dire un actif logiciel de qualité sans distribution ni continuité humaine. La question n'est pas « est-ce bien construit ? » (oui), mais « qui le fait vivre après septembre ? ».

**3 forces majeures**
1. **Ingénierie de sécurité de niveau senior** [VÉRIFIÉ] — RLS multi-tenant exhaustif (196 policies, ~30 tables), webhook Stripe signé + idempotent, secret cron en comparaison *timing-safe*, PIN bcrypt, quota IA *DB-backed* (non contournable), 140 tests verts.
2. **Moteur de planning hybride solveur + IA avec filet déterministe** [VÉRIFIÉ] — l'IA ne peut pas livrer un planning illégal : un `repairPlan` déterministe nettoie la sortie, et un **moteur algorithmique gratuit** existe en repli si l'API Anthropic tombe ou pour économiser le coût.
3. **Positionnement marketing chirurgical et honnête** [VÉRIFIÉ] — angle « le planning qui vous protège des prud'hommes », **aucun faux témoignage** (manifeste d'honnêteté assumé), comparatif qui **ne nomme jamais Skello** (risque de publicité comparative neutralisé).

**3 dangers majeurs**
1. **Risque fondateur = existentiel** [VÉRIFIÉ/DÉDUIT] — un développeur solo qui quitte le projet à temps partiel en septembre. Sans plan de continuité, l'astreinte « badgeuse en panne à 5h du matin » n'existe pas. C'est LE facteur qui plafonne la valeur.
2. **0 client = 0 preuve de tout l'aval** [VÉRIFIÉ] — product-market fit, conversion, churn, LTV/CAC, délivrabilité email réelle : tout est théorique. Le produit est prouvé, le *marché* ne l'est pas.
3. **Dérive de migrations en prod + CSP non bloquante** [VÉRIFIÉ/À TESTER] — la doc interne ne certifie l'état prod que jusqu'à la migration 033 (sur 70) ; la migration 066 corrige explicitement une « schema drift ». La CSP est en `Report-Only` (observation, pas protection).

---

# 2. TABLEAU DE BORD DES 10 DOMAINES

| # | Domaine | Sous-total /10 000 | Statut | Top fix |
|---|---------|--------------------|--------|---------|
| 1 | Architecture & qualité de code | **7 350** | 🟢 | Plan de continuité + figer l'état des migrations prod |
| 2 | Sécurité & conformité technique | **7 970** | 🟢 | Passer la CSP de `Report-Only` à enforce ; étendre Zod |
| 3 | Fonctionnalités cœur | **7 330** | 🟢 | Export paie/variables ; combler le gap POS |
| 4 | IA & algorithmes | **8 090** | 🟢 | Suivi des coûts par appel ; tests adversariaux du prompt |
| 5 | Emails & communications | **7 110** | 🟡 | **Vérifier SPF/DKIM/DMARC** (bloquant délivrabilité) |
| 6 | Landing page & conversion | **7 450** | 🟢 | Obtenir 1–2 vrais pilotes pour preuve sociale |
| 7 | Branding & identité | **7 010** | 🟡 | Tester nom + dark mode sur la vraie cible 40-55 ans |
| 8 | UX & parcours | **7 130** | 🟡 | Contraste bouton CTA (4,32:1 < AA) ; tests utilisateurs |
| 9 | Business, pricing & monétisation | **7 120** | 🟡 | Valider marges réelles ; instrumenter le funnel |
| 10 | Revente, risques & viabilité | **5 090** | 🔴 | **Plan de continuité fondateur** (existentiel) |
| | **TOTAL** | **71 650 / 100 000** | **B** | |

Légende : 🟢 ≥ 7 300 · 🟡 6 000–7 299 · 🔴 < 6 000.

---

# 3. ANALYSE DÉTAILLÉE DES 100 CRITÈRES

## DOMAINE 1 — ARCHITECTURE & QUALITÉ DE CODE — *Sous-total : 7 350/10 000*

**[1.1] Pertinence du choix de stack — NOTE : 880/1000 — [VÉRIFIÉ]**
Next.js 14 (App Router) + Supabase (Postgres/Auth/RLS) + Vercel + Stripe est le stack canonique d'un SaaS B2B solo en 2026 : un seul langage (TS) du front au back, RLS qui externalise l'autorisation dans la base, hébergement zéro-ops. `package.json` confirme des versions à jour (Next 14.2.5, Stripe SDK 22, Zod 4, Supabase ssr 0.10). Pour un dev unique ciblant <10 000 établissements, c'est le choix qui minimise la surface à maintenir.
*Recommandation :* documenter le « pourquoi Supabase » dans `docs/ARCHITECTURE.md` pour un repreneur ; rien à corriger.

**[1.2] Multi-tenant via RLS : étanchéité — NOTE : 820/1000 — [VÉRIFIÉ + À TESTER]**
L'isolation repose sur `current_establishment_id()` / `is_manager()` côté Postgres, et 196 policies couvrent ~30 tables. Les migrations 053 (`shift_exchanges_tenant_isolation`), 056 (`scope_select_policies_to_establishment`) et 057 (`drop_cross_tenant_profiles_insert_policy`) montrent un durcissement *itératif et conscient* de l'étanchéité — preuve que la fuite inter-tenant a été traquée activement (cf. 032 qui corrige une fuite réelle sur `employee_documents`).
*Recommandation :* écrire un test d'intégration « tenant A ne voit jamais une ligne de tenant B » par table sensible ; lancer `get_advisors` Supabase en prod (voir checklist §5).

**[1.3] Organisation du code — NOTE : 850/1000 — [VÉRIFIÉ]**
Séparation nette : logique métier dans `lib/` (compliance, planning, referral, subscription…), routes API minces dans `app/api/`, composants par domaine. La logique pure (solveur, règles, scoring, validations) est extraite et testée unitairement — exactement la structure qui rend un code reprenable.
*Recommandation :* RAS. Éventuellement un `lib/README` listant les modules pour un repreneur.

**[1.4] Gestion des migrations SQL — NOTE : 600/1000 — [VÉRIFIÉ + À TESTER]**
70 migrations numérotées, idempotentes pour beaucoup (021 « combined », `DROP POLICY IF EXISTS`…). MAIS `docs/migrations-state.md` ne certifie l'état prod que **jusqu'à 033**, et la **066 corrige une « subscriptions schema drift »** : signe qu'un décalage code/prod s'est déjà produit. Un `scripts/check-migrations.ts` existe — bon réflexe — mais l'état réel 034→070 en prod n'est pas documenté.
*Recommandation :* exécuter `list_migrations` sur la prod, comparer au dossier, régénérer `migrations-state.md` à jour. **Bloquant léger** avant lancement.

**[1.5] Variables d'environnement & secrets — NOTE : 820/1000 — [VÉRIFIÉ]**
`.env.example` est exemplaire : chaque secret est documenté avec sa **conséquence en cas d'absence** (« sans CRON_SECRET les crons renvoient 401 silencieusement »). Service-role key strictement serveur, clés VAPID/Sentry/Stripe séparées. C'est de la doc opérationnelle de niveau senior.
*Recommandation :* ajouter une validation runtime au boot (ex. `zod` sur `process.env`) qui *fail-fast* si un secret obligatoire manque, plutôt que d'échouer silencieusement.

**[1.6] Typage TypeScript — NOTE : 800/1000 — [VÉRIFIÉ]**
TS strict (tsconfig), types partagés dans `types/`, `AuthResult`/`AuthProfile` explicites, schémas Zod qui infèrent les types d'entrée. Quelques `as unknown as` ponctuels sur les jointures Supabase (typage faible du SDK), acceptables.
*Recommandation :* générer les types Supabase (`generate_typescript_types`) et les committer pour supprimer les casts manuels sur les requêtes.

**[1.7] Gestion des erreurs & observabilité — NOTE : 780/1000 — [VÉRIFIÉ]**
Sentry est câblé (client/server/edge configs, `tracesSampleRate 0.1`, source maps masquées, monitors Vercel auto). Endpoint `/api/csp-report` pour les violations CSP. `lib/logger.ts` présent.
*Recommandation :* confirmer que `NEXT_PUBLIC_SENTRY_DSN` est bien renseigné en prod (sinon Sentry est inactif). La config edge n'a pas le garde `enabled: production` — uniformiser.

**[1.8] Dette technique (migration Nexus→Quartzbase) — NOTE : 700/1000 — [VÉRIFIÉ]**
Rebranding à ~95 % : 166 occurrences « Quartzbase » contre **8 résidus « Nexus »**, tous bénins ou intentionnels (clé localStorage `nexus-onboarding-step`, UID iCal, header webhook `X-Nexus-Event` **conservé volontairement** à côté de `X-Quartzbase-Event` pour rétrocompat). Le `package.json` (`"name": "nexus"`) et le README (titre « Nexus », `VAPID_EMAIL=admin@nexus-app.fr`) restent à toiletter.
*Recommandation :* renommer `package.json`, le titre README, l'email VAPID d'exemple. La clé localStorage `nexus-onboarding-step` : la laisser (la renommer ferait repartir l'onboarding des utilisateurs existants — non pertinent à 0 client, donc à faire **maintenant**).

**[1.9] Scalabilité — NOTE : 720/1000 — [DÉDUIT]**
Postgres + RLS + Vercel serverless tient sans souci jusqu'à plusieurs milliers d'établissements ; les migrations 033/051/055 ajoutent des index de perf et des index sur FK (bon réflexe anti-N+1). Limites probables : routes IA `maxDuration=60` (coût/temps), requêtes planning non paginées (`.limit(200)` employés). À 10 000 établissements, le goulet sera le pooler Postgres et le coût IA, pas l'archi.
*Recommandation :* activer le connection pooling Supabase (PgBouncer) ; surveiller les requêtes lentes via `get_advisors`.

**[1.10] Maintenabilité par un dev solo qui part — NOTE : 380/1000 — [DÉDUIT]**
Le code est *intrinsèquement* reprenable (tests, modules, doc). Mais « maintenabilité » ≠ « maintenu » : après septembre 2026, il n'y a **personne**. Un bug RLS, un changement d'API Stripe (`apiVersion: '2026-05-27.dahlia'` est figé), une rotation de clé Anthropic → personne pour réagir. La note basse sanctionne le **risque opérationnel humain**, pas la qualité du code.
*Recommandation :* voir 10.3/10.8 — c'est le sujet n°1 du produit.

## DOMAINE 2 — SÉCURITÉ & CONFORMITÉ TECHNIQUE — *Sous-total : 7 970/10 000*

**[2.1] Couverture RLS — NOTE : 820/1000 — [VÉRIFIÉ]**
33 `ENABLE ROW LEVEL SECURITY`, 196 `CREATE POLICY`, sur toutes les tables sensibles (profiles, shifts, contracts, presences, subscriptions, referrals, api_tokens, webhook_logs, ai_usage…). Les migrations 059 (`rls_initplan_wrap_auth_functions`) et 061 (`merge_permissive_policies`) optimisent ET durcissent — niveau rare chez un solo.
*Recommandation :* test automatisé d'étanchéité (cf. 1.2) + `get_advisors` Supabase (catégorie *security*) avant lancement.

**[2.2] Authentification — NOTE : 800/1000 — [VÉRIFIÉ]**
Supabase Auth via `@supabase/ssr`, sessions gérées en middleware (`updateSession`), `auth.getUser()` côté serveur (et non `getSession()` falsifiable). OAuth Google géré, routage du `code` OAuth robuste.
*Recommandation :* activer la 2FA managers (Supabase MFA) en option ; durcir la politique de mot de passe.

**[2.3] Sécurisation des API routes — NOTE : 820/1000 — [VÉRIFIÉ]**
`requireAuth` / `requireManager` / `requireEmployee` centralisés, lèvent 401/403, et **vérifient le rôle ET l'établissement actif**. Les routes IA, employés, compliance, revenues les utilisent systématiquement.
*Recommandation :* audit ligne par ligne des ~90 routes pour garantir qu'aucune n'oublie le garde (un linter custom serait idéal).

**[2.4] Validation des entrées (Zod) — NOTE : 680/1000 — [VÉRIFIÉ]**
40 schémas Zod (`lib/validations.ts`), `safeParse` sur checkout, shifts, leaves, invite, contracts… Mais seules ~9 routes sur ~90 valident explicitement ; le reste s'appuie sur RLS + typage. Acceptable (la majorité sont des GET ou protégées par RLS) mais la couverture POST/PATCH n'est pas exhaustive.
*Recommandation :* recenser les routes mutatives sans Zod et les couvrir. Effort faible, gain sécurité réel.

**[2.5] Sécurité du webhook Stripe — NOTE : 950/1000 — [VÉRIFIÉ]**
`constructEvent` avec signature obligatoire (rejet 400 si absente/invalide), filtre des event types, **idempotence via table `stripe_webhook_events`** (insertion `event_id`, court-circuit sur `23505`) — empêche la double-application de coupons/remises. Migration 058 dédiée. C'est l'implémentation de référence.
*Recommandation :* RAS. Tester en prod avec le Stripe CLI (checklist §5).

**[2.6] Sécurité des crons — NOTE : 920/1000 — [VÉRIFIÉ]**
`isAuthorizedCron` compare le Bearer en **`timingSafeEqual`** (anti timing-attack), rejette si `CRON_SECRET` absent. Tous les crons lus (trial-reminder…) appliquent le garde en tête.
*Recommandation :* RAS. Vérifier juste que `CRON_SECRET` est posé en prod (sinon crons muets — cf. `.env.example` qui l'avertit).

**[2.7] Stockage des données sensibles — NOTE : 820/1000 — [VÉRIFIÉ]**
PIN haché bcrypt (`hashPin`, cost 10), tokens API hachés (migration 027 + `api-token.ts`), clé VAPID privée à lecture restreinte (migration 065), settings sensibles restreints en lecture (064). Aucun secret en clair repéré.
*Recommandation :* bcrypt cost 10 sur un PIN 4 chiffres reste brute-forçable hors-ligne si la base fuit (10 000 combinaisons) — ajouter un *rate-limit* serveur sur la vérification PIN (anti-bruteforce en ligne).

**[2.8] Headers HTTP de sécurité — NOTE : 700/1000 — [VÉRIFIÉ]**
Présents : HSTS (1 an + subdomains), X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy. **Mais la CSP est en `Content-Security-Policy-Report-Only`** : elle observe, elle ne bloque pas. Et elle autorise `'unsafe-inline' 'unsafe-eval'` sur les scripts.
*Recommandation :* **bloquant léger** — après une période d'observation des rapports, basculer en `Content-Security-Policy` (enforce). Travailler à retirer `unsafe-eval`.

**[2.9] Protection contre les abus — NOTE : 720/1000 — [VÉRIFIÉ]**
`checkRateLimit` (KV Redis + fallback in-memory), appliqué sur les routes IA (10/h). Quota IA mensuel **DB-backed** (`consume_ai_credit`, migration 048) — autoritaire et non contournable entre instances serverless (le code documente explicitement pourquoi KV seul ne suffisait pas).
*Recommandation :* étendre le rate-limit aux endpoints d'auth (login, PIN, invite) ; **configurer Vercel KV en prod** (sinon rate-limit horaire best-effort uniquement).

**[2.10] Surface d'attaque & endpoints publics — NOTE : 740/1000 — [DÉDUIT]**
Le middleware whiteliste précisément les routes publiques (stripe, cron, calendar token, v1, health, vapid-key, csp-report). API v1 protégée par token signé. Endpoint `/api/calendar/[token]` = capability-URL (le token EST le secret) — correct si le token est long et non listable.
*Recommandation :* confirmer l'entropie du `CALENDAR_SECRET`/token iCal ; ajouter un rate-limit sur `/api/v1/*` (cf. 2.9).

## DOMAINE 3 — FONCTIONNALITÉS CŒUR — *Sous-total : 7 330/10 000*

**[3.1] Planning visuel hebdo (drag & drop) — NOTE : 800/1000 — [VÉRIFIÉ + À TESTER]**
`@dnd-kit/core` présent, composants `components/planning/`, copie de semaine (`shifts/copy-week`), export PDF (`@react-pdf/renderer`) et iCal. La logique de formulaire de shift est testée (`shift-form.test.ts`). L'ergonomie réelle (fluidité DnD mobile) n'est pas vérifiable sans la prod.
*Recommandation :* test utilisateur sur tablette/mobile (le secteur planifie souvent depuis un téléphone).

**[3.2] Conformité légale automatique — NOTE : 820/1000 — [VÉRIFIÉ]**
**9 règles** (pas 7) dans `lib/compliance/rules.ts`, chacune avec **référence légale réelle** (Art. L3131-1, L3121-18/20/16, L3132-1/2/3, L3122-2…), sévérité graduée, et **testées** (`rules.test.ts`). Couvre repos 11h, 10h/j, 48h/sem, pause, 6j consécutifs, repos hebdo 35h, nuit, amplitude 13h, dimanche.
*Recommandation :* ajouter les durées **conventionnelles** (HCR/boulangerie ont des seuils spécifiques, ex. 11h/j possible en HCR) — actuellement génériques. Préciser que l'outil ne remplace pas un conseil juridique (cf. 10.7).

**[3.3] Pointage clock-in/out : edge cases — NOTE : 720/1000 — [DÉDUIT + À TESTER]**
Routes clock-in/out + break-start/end, cron `check-missing-clockout` (détection oubli), migration 049 `presence_needs_review`. Bonne couverture des oublis. Restent à vérifier : double-pointage, fuseaux horaires (UTC vs Europe/Paris — risque sur les shifts overnight), pointage hors-site.
*Recommandation :* tester explicitement double clock-in, shift à cheval sur minuit, et changement d'heure (DST mars/octobre).

**[3.4] Gestion des congés — NOTE : 780/1000 — [VÉRIFIÉ]**
Workflow demande→validation (`/api/conges`, `lib/leaves.ts`), statuts pending/approved, email dédié, soldes estimés (README). Schéma Zod (`LeaveRequestSchema`) avec contrainte `end_date ≥ start_date`.
*Recommandation :* gérer les compteurs légaux (CP acquis/pris) et les jours fériés — actuellement « estimés ».

**[3.5] Shift exchange / marketplace — NOTE : 760/1000 — [VÉRIFIÉ]**
Deux mécaniques : échange direct entre employés (`exchanges/*` avec accept/approve/reject) ET marketplace ouverte (`marketplace/*` avec apply/confirm). Pertinent pour la restauration (remplacements de dernière minute). Isolation tenant durcie (migration 053).
*Recommandation :* s'assurer que tout échange repasse par la validation conformité (un échange ne doit pas créer une infraction 11h).

**[3.6] Gestion des employés — NOTE : 820/1000 — [VÉRIFIÉ]**
Invite (email + Zod), rôles manager/supervisor/employee, archivage (soft-delete), reset PIN, contrats, documents, disponibilités. Riche et scopé par établissement. Migration 067 ajoute des champs admin.
*Recommandation :* RAS notable.

**[3.7] Couverture multi-établissement — NOTE : 740/1000 — [VÉRIFIÉ]**
Tables `establishments` + `user_establishments`, switch d'établissement actif (`establishments/switch`), overview (`establishments/overview`), `active_establishment_id` propagé dans l'auth. Plan Multi-site cohérent.
*Recommandation :* tester le cas « manager de 3 sites » bout en bout (KPIs consolidés, bascule de contexte).

**[3.8] Cohérence planning/pointage/paie — NOTE : 650/1000 — [DÉDUIT]**
Le triptyque planifié→pointé→écart existe (presences vs shifts, `lateness_records`), et `revenues` alimente le copilote coût/CA. Mais il n'y a **pas d'export de variables de paie** (heures sup, majorations nuit/dimanche calculées pour la paie) — chaînon manquant vers le comptable.
*Recommandation :* prioriser un export « préparation paie » (CSV heures réelles + majorations) — c'est un argument de vente fort (cf. 3.10).

**[3.9] Complétude fonctionnelle vs Skello — NOTE : 640/1000 — [DÉDUIT]**
(Voir matrice §4.) Quartzbase égale Skello sur planning/conformité/pointage/congés et le **dépasse sur l'IA et la conformité légale embarquée**. Il est en retard sur : intégrations POS/caisse, module paie complet, gestion multi-conventions, app native (vs PWA), profondeur reporting.
*Recommandation :* assumer un positionnement « conformité-first » plutôt que « clone Skello moins cher ».

**[3.10] Fonctionnalités manquantes critiques — NOTE : 600/1000 — [DÉDUIT]**
Manques sectoriels notables : (a) **intégration caisse/POS** (Tiller, Zelty, L'Addition) pour piloter l'effectif sur le CA réel-temps ; (b) **export paie** ; (c) gestion fine des **conventions HCR/boulangerie** ; (d) coffre-fort bulletins. Le forecast CA interne compense partiellement (a).
*Recommandation :* une intégration POS (même une seule) ferait basculer la crédibilité « pilotage » — mais coûteux pour un solo.

## DOMAINE 4 — IA & ALGORITHMES — *Sous-total : 8 090/10 000*

**[4.1] Pertinence de l'usage de l'IA — NOTE : 820/1000 — [VÉRIFIÉ]**
L'IA résout un vrai point de douleur (générer un planning conforme en minutes vs heures). Choix intelligent : `claude-sonnet-4-6` pour le planning (raisonnement), `claude-haiku-4-5` pour briefs/résumés/chat/alertes (coût). Le `cache_control: ephemeral` sur le system prompt réduit le coût des itérations.
*Recommandation :* RAS — c'est un usage mûr de l'IA.

**[4.2] Prompt engineering de l'auto-planning — NOTE : 800/1000 — [VÉRIFIÉ]**
System prompt structuré : contexte établissement, employés (avec absences), postes, shifts existants, **section économique** (CA prévu + cible coût/CA) et **règles légales en dur** (« aucune infraction tolérée »). Boucle d'outil `propose_shift` (jusqu'à 16 itérations) — approche *tool-use* propre.
*Recommandation :* ajouter des *few-shot* d'exemples conformes ; tester l'injection de prompt via le champ `context` libre du manager.

**[4.3] Gestion du quota IA — NOTE : 880/1000 — [VÉRIFIÉ]**
`consume_ai_credit` (RPC Postgres, migration 048/060 par feature) : **autoritaire, persistant, atomique**. Le code documente explicitement avoir abandonné KV (contournable entre instances) pour la base. Essentiel = 3/mois ; Pro/Multi = illimité.
*Recommandation :* RAS. Modèle à citer en exemple.

**[4.4] L'IA peut-elle générer un planning illégal ? — NOTE : 850/1000 — [VÉRIFIÉ]**
Réponse rassurante : **non, par construction**. La sortie LLM passe par `repairPlan` (filet déterministe « zéro infraction actionnable »), et le moteur algo est conforme « par construction ». L'IA propose, le déterministe dispose. C'est exactement l'architecture défendable juridiquement.
*Recommandation :* journaliser les cas où `repairPlan` a dû corriger une sortie LLM (métrique de fiabilité du prompt).

**[4.5] Coût IA vs prix du plan — NOTE : 780/1000 — [DÉDUIT]**
Une génération = jusqu'à 16 appels Sonnet (≤8192 tokens) avec cache prompt. Estimation : **~0,05–0,20 €/génération** selon taille d'équipe (Sonnet ~3$/M input, ~15$/M output, cache ÷10 sur l'input répété). Essentiel à 3/mois → coût IA < 0,60 €/mois/client : marge IA non menacée. Pro illimité : risque théorique d'abus, borné par le rate-limit 10/h.
*Recommandation :* logger le coût réel par génération (tokens × tarif) pour confirmer la fourchette ; le moteur algo gratuit reste la soupape.

**[4.6] Fallback si Anthropic indisponible — NOTE : 880/1000 — [VÉRIFIÉ]**
Excellent : réglage `planning_engine` par établissement = `'ai'` ou `'algorithm'`. Le moteur **algorithmique déterministe** (`solvePlanning`, testé) génère un planning conforme **sans aucun appel IA** — gratuit, instantané, auditable. C'est à la fois un fallback de disponibilité ET un levier de marge.
*Recommandation :* en cas d'erreur 503 Anthropic, basculer automatiquement sur l'algo plutôt que d'échouer (fallback runtime, pas seulement réglage).

**[4.7] Algorithme de conformité : déterministe ? — NOTE : 880/1000 — [VÉRIFIÉ]**
100 % déterministe (`lib/compliance/rules.ts`, pur TS, 0 appel IA), testé unitairement. C'est le bon choix : la conformité légale ne doit JAMAIS dépendre d'un LLM probabiliste.
*Recommandation :* RAS. Maintenir cette séparation IA/déterministe.

**[4.8] Algo de suggestion de remplacements — NOTE : 780/1000 — [VÉRIFIÉ]**
`lib/replacement/score.ts` (scoring testé) + cron `check-replacements` + routes notify/confirm. Logique de matching basée sur des critères (dispo, conformité) plutôt que sur l'IA — robuste et explicable.
*Recommandation :* exposer le « pourquoi ce remplaçant » (transparence du score) au manager.

**[4.9] Latence & UX de la génération — NOTE : 700/1000 — [VÉRIFIÉ + À TESTER]**
`maxDuration=60` assumé et commenté (le code explique que 10s Hobby tronquait la réponse → « erreur réseau »). 30–60s sur une semaine vierge = long pour une UX, même si acceptable pour une tâche batch.
*Recommandation :* streamer la progression (« 12 shifts proposés… ») ou proposer l'algo (instantané) par défaut avec l'IA en option « affiner ».

**[4.10] Différenciation réelle IA vs algo classique — NOTE : 720/1000 — [DÉDUIT]**
L'IA apporte la **compréhension du langage naturel** (le manager écrit « renforce le samedi midi, Paul est en formation jeudi ») — ça, un solveur pur ne le fait pas. Mais pour un planning standard, l'algo gratuit donne 80 % du résultat. La vraie valeur IA est l'interface conversationnelle, pas l'optimisation.
*Recommandation :* marketer l'IA comme « planning en langage naturel », pas comme « meilleur planning » (où l'algo suffit).

## DOMAINE 5 — EMAILS & COMMUNICATIONS — *Sous-total : 7 110/10 000*

**[5.1] Email welcome — NOTE : 800/1000 — [VÉRIFIÉ]**
HTML propre (tables, responsive, header sombre brandé Quartzbase), ton clair, « 30 jours d'essai sans carte bancaire », 3 étapes de démarrage. Bonne première impression.
*Recommandation :* RAS, sinon ajouter un CTA unique très visible vers la 1ère action (créer l'équipe).

**[5.2] Email trial-ending — NOTE : 780/1000 — [VÉRIFIÉ]**
Cron `trial-reminder` quotidien (09h UTC) qui cible les abos `trialing` finissant sous 3 jours. Déclencheur correct, garde cron OK.
*Recommandation :* séquence en 2 temps (J-3 valeur + J-1 urgence) plutôt qu'un seul envoi ; A/B le CTA.

**[5.3] Email planning hebdo — NOTE : 740/1000 — [VÉRIFIÉ]**
`planning-email.ts` (envoi groupé, `send-planning-email` route, cron). Utile (l'employé reçoit son planning). Risque spam faible (hebdo, attendu).
*Recommandation :* préférence de fréquence côté employé ; lien « ajouter à mon agenda » (iCal existe déjà).

**[5.4] Email congés — NOTE : 760/1000 — [VÉRIFIÉ]**
`conges-email.ts` pour le workflow demande/validation. Clarté correcte.
*Recommandation :* inclure le solde restant et un lien d'action direct (valider/refuser pour le manager).

**[5.5] Email brief manager — NOTE : 780/1000 — [VÉRIFIÉ]**
Cron lundi 07h, généré par Haiku, résumé RH de la semaine. Vraie valeur ajoutée (proactif, fait gagner du temps).
*Recommandation :* garde-fou si l'IA n'a rien à dire (ne pas envoyer un brief vide) ; vérifier le coût Haiku × nb managers.

**[5.6] Délivrabilité Resend (SPF/DKIM/DMARC) — NOTE : 500/1000 — [À TESTER]**
**Non vérifiable depuis le code** — dépend de la config DNS du domaine `quartzbase.fr`. C'est le **risque silencieux n°1** des emails : sans DKIM/SPF/DMARC alignés, les welcome/trial-ending finissent en spam → conversion ruinée. Note conditionnelle basse tant que non prouvé.
*Recommandation :* **bloquant** — vérifier dans Resend que le domaine est « verified » et tester via mail-tester.com (cf. checklist §5).

**[5.7] Design & responsive des emails — NOTE : 780/1000 — [VÉRIFIÉ]**
HTML table-based, inline styles, viewport meta, palette claire (différente du dark de l'app — bon choix pour l'inbox). Compatible clients mail.
*Recommandation :* tester sur Outlook/Gmail/Apple Mail (Litmus/Email on Acid).

**[5.8] Cohérence branding emails — NOTE : 820/1000 — [VÉRIFIÉ]**
« Quartzbase » partout, expéditeur `noreply@quartzbase.fr`. **Aucun « Nexus » résiduel dans les emails** (les 8 résidus sont ailleurs et bénins).
*Recommandation :* RAS.

**[5.9] Conformité des emails — NOTE : 600/1000 — [DÉDUIT]**
Les emails sont majoritairement **transactionnels** (welcome, planning, congés) → désabonnement non légalement requis. Mais trial-ending/brief frôlent le marketing : un lien de préférence/désabonnement et l'adresse postale (mentions) seraient prudents.
*Recommandation :* ajouter footer avec mentions légales + lien préférences sur les emails non strictement transactionnels.

**[5.10] Séquences manquantes — NOTE : 550/1000 — [DÉDUIT]**
Présent : welcome, trial-ending, planning, congés, brief. **Absent** : onboarding multi-touch (J1/J3/J7), réactivation (manager inactif), win-back (post-churn), NPS/feedback. Pour un B2B à 0 client c'est secondaire, mais ça plafonne l'activation.
*Recommandation :* ajouter une séquence onboarding 3 emails (effort faible, gros impact activation).

## DOMAINE 6 — LANDING PAGE & CONVERSION — *Sous-total : 7 450/10 000*

**[6.1] Hero : clarté de la proposition — NOTE : 850/1000 — [VÉRIFIÉ]**
Titre meta/landing : **« Le planning qui vous protège des prud'hommes »** + « Générez vos plannings en 2 min et soyez alerté avant chaque infraction ». En 3 secondes on comprend le quoi (planning), le bénéfice (protection légale) et l'effort (2 min). Excellent angle douleur/peur, très B2B-restauration.
*Recommandation :* RAS — c'est le meilleur asset marketing du produit.

**[6.2] Hiérarchie des arguments — NOTE : 800/1000 — [VÉRIFIÉ]**
13 sections (navbar, réassurance, hero, problème, solution, how-it-works, coût, comparatif, preuve sociale, pricing, FAQ, CTA final, footer) — plus riche que les 7 annoncées. Ordre conforme à la méthode « problème→solution→preuve→prix ». Conformité mise en avant avant l'IA : bon choix (la peur vend mieux que la nouveauté).
*Recommandation :* RAS notable.

**[6.3] Force des CTA — NOTE : 780/1000 — [VÉRIFIÉ]**
« 30 jours gratuits, sans carte bleue » : réduit le risque perçu au maximum. CTA mobile flottant (`floating-mobile-cta`). Cohérent partout.
*Recommandation :* tester « Essayer gratuitement » vs « Protéger mon établissement » (angle bénéfice).

**[6.4] Crédibilité (témoignages, réassurance) — NOTE : 650/1000 — [VÉRIFIÉ]**
Choix **radicalement honnête** : `social-proof-section` affiche « pas un mur de 200 avis ici » et un manifeste d'engagement signé « Maxence, fondateur » — **zéro faux témoignage**. Éthiquement et juridiquement irréprochable, et différenciant. MAIS : à 0 client, l'absence de preuve sociale **réduit mécaniquement la conversion** (les gérants achètent ce que leurs pairs utilisent).
*Recommandation :* obtenir 1–2 **pilotes réels** (même gratuits) pour un vrai témoignage vidéo/photo avant de scaler l'acquisition. C'est le levier de conversion n°1.

**[6.5] Tableau comparaison — NOTE : 760/1000 — [VÉRIFIÉ]**
Astucieux : compare à **« outils traditionnels (~200€/mois) »** sans nommer Skello → **risque de publicité comparative trompeuse fortement réduit** (cf. 10.6). Met en avant IA, conformité auto, remplacement 1-clic, badgeuse, « dès 49€ », « économisez jusqu'à 1 812€/an ».
*Recommandation :* le « ~200€/mois » pour le « traditionnel » est **discutable** (Skello ≈ 40-50€/établissement) — risque de crédibilité si un prospect le sait. Sourcer ce chiffre (coût *complet* : licence + temps passé) ou l'adoucir.

**[6.6] Présentation du pricing — NOTE : 800/1000 — [VÉRIFIÉ]**
Toggle mensuel/annuel (2 mois offerts : 490/890/1490 = 10×mensuel), 3 plans lisibles, `pricing-section` (13 ko, soignée). Valorisation cohérente avec le code (`PLAN_META`).
*Recommandation :* ancrer la valeur en € économisés (1 procès prud'hommes ≈ 5–20k€) à côté du prix.

**[6.7] Gestion des objections (FAQ) — NOTE : 780/1000 — [VÉRIFIÉ]**
`faq.tsx` (7,4 ko) intégrée en bas de funnel. Bon emplacement.
*Recommandation :* couvrir explicitement « et si je pars / mes données ? », « migration depuis Excel/Skello », « RGPD » (objections B2B classiques).

**[6.8] Optimisation mobile — NOTE : 760/1000 — [DÉDUIT]**
CTA flottant mobile, `clamp()` sur les tailles, design responsive. Le code suggère une vraie attention mobile-first (README « mobile-first »).
*Recommandation :* valider Lighthouse mobile et l'ergonomie tactile réelle.

**[6.9] Vitesse & Core Web Vitals — NOTE : 720/1000 — [DÉDUIT + À TESTER]**
Next 14 + fonts self-hosted (`next/font`, pas de FOUT/domaine externe), Vercel CDN, Speed Insights + Analytics intégrés. Bons fondamentaux. Sections lourdes (`pricing` 13 ko, `navbar` 10 ko) en inline-styles → JS un peu gras.
*Recommandation :* mesurer CWV réels (PageSpeed) ; viser LCP < 2,5s.

**[6.10] Taux de conversion estimé — NOTE : 550/1000 — [DÉDUIT]**
Sans trafic réel, **fourchettes de marché B2B SaaS FR** : visiteur→essai **2–5 %** (landing soignée mais 0 preuve sociale → bas de fourchette au départ, ~2-3 %) ; essai→payant **10–25 %** (essai 30j sans CB → plutôt 8-15 %, le « sans CB » gonfle les essais peu qualifiés). Funnel chiffré au §4.
*Recommandation :* instrumenter chaque étape (analytics déjà là) ; capturer l'email tôt.

## DOMAINE 7 — BRANDING & IDENTITÉ VISUELLE — *Sous-total : 7 010/10 000*

**[7.1] Nom « Quartzbase » — NOTE : 620/1000 — [DÉDUIT]**
Prononçable en FR (« kouartz-baze »), évoque la solidité (quartz = minéral dur, fiable) et le tech (« base »). MAIS **aucune évocation boulangerie/restauration/RH** — c'est un nom de SaaS générique/tech, pas sectoriel. Code parrainage `QTZ-` cohérent.
*Recommandation :* assumer le nom (changer coûte cher) mais ancrer le secteur dans le tagline systématiquement.

**[7.2] Logo & identité — NOTE : 650/1000 — [À TESTER]**
Non inspectable précisément (assets dans `public/`, pas de SVG logo lu). `app/manifest.ts` + icônes PWA existent. Note conditionnelle.
*Recommandation :* fournir le logo pour audit ; vérifier déclinaisons (favicon, icône PWA maskable, OG image).

**[7.3] Palette & accessibilité WCAG — NOTE : 820/1000 — [VÉRIFIÉ — ratios calculés]**
Calculs sur fond #0a0a0f : **texte principal #f0f0f8 = 17,42:1 (AAA)** ; **secondaire #9090a8 = 6,34:1 (AA, AAA en grand)** ; vert #00D4AA = 10,34:1 ; jaune #FFB347 = 11,09:1 ; rouge #FF6B6B = 7,12:1 ; **accent violet #6C63FF = 4,58:1 (AA normal de justesse)**. Palette globalement très accessible.
*Recommandation :* éviter le violet #6C63FF comme **couleur de texte fin** (4,58:1 est limite) ; OK en aplat/bordure. Voir 8.7 pour le bouton.

**[7.4] Typographie Syne (titres) — NOTE : 700/1000 — [DÉDUIT]**
Syne (700/800) est une grotesque géométrique « arty/contemporaine » — premium et différenciante dans le tech/design, mais **clivante pour une cible gérants 40-55 ans** : elle peut paraître « trop stylée », moins rassurante qu'une Inter/Söhne. Bien chargée via `next/font` (perf OK).
*Recommandation :* A/B Syne vs une grotesque plus neutre sur le hero ; mesurer la perception « sérieux/fiable » auprès de la cible.

**[7.5] Typographie DM Sans (corps) — NOTE : 820/1000 — [VÉRIFIÉ]**
DM Sans (400/500) : lisible, neutre, professionnelle, excellent rendu écran à toutes tailles. Choix sûr et cohérent. Self-hosted.
*Recommandation :* RAS.

**[7.6] Dark mode vs cible 40-55 ans — NOTE : 600/1000 — [DÉDUIT]**
#0a0a0f est superbe et premium pour un œil tech, mais c'est un **pari sur une cible peu tech** : les gérants 40-55 ans plébiscitent souvent le clair (perçu « sérieux/médical/bancaire »), et le dark fatigue davantage à la lecture de tableaux denses (plannings). Désaccord d'experts assumé : la DA valide, le Growth Lead alerte.
*Recommandation :* offrir un **mode clair** dans l'app (au moins pour les vues planning/tableaux) — réduit le risque sans renier l'identité.

**[7.7] Premium vs startup générique — NOTE : 700/1000 — [DÉDUIT]**
L'exécution (dark soigné, Syne, animations count-up, micro-interactions) **dépasse** la moyenne « startup générique » et atteint un vrai niveau premium. Risque inverse : trop « product de SF », pas assez « outil du quotidien d'un boulanger ».
*Recommandation :* injecter des signaux « terrain » (photos réelles de fournil/cuisine, vocabulaire métier).

**[7.8] Différenciation visuelle vs Skello/Combo — NOTE : 780/1000 — [DÉDUIT]**
Skello/Combo sont clairs, bleus, « corporate-SaaS ». Le dark violet de Quartzbase **tranche radicalement** — mémorable, différenciant. C'est un actif (on s'en souvient) autant qu'un risque (cf. 7.6).
*Recommandation :* capitaliser sur la différence dans l'acquisition (« le seul planning qui ne ressemble pas à un logiciel comptable »).

**[7.9] Cohérence branding tous points de contact — NOTE : 760/1000 — [VÉRIFIÉ]**
App (dark violet), landing (idem), emails (clair mais brandés cohérents). Tokens CSS centralisés (`--accent`, `--bg-card`…), Tailwind aliasé (cf. CLAUDE.md). Cohérence forte.
*Recommandation :* aligner l'OG image et les icônes PWA sur l'identité.

**[7.10] Adéquation émotionnelle boulangerie/artisanat — NOTE : 560/1000 — [DÉDUIT]**
C'est le **point faible branding** : le dark futuriste violet évoque la fintech/crypto, **pas le pain chaud, le bois, le levain, l'artisanat**. Décalage émotionnel avec l'univers boulangerie. Acceptable si on cible « restauration moderne », risqué pour « boulangerie de quartier ».
*Recommandation :* nuancer l'iconographie/photographie vers le chaud/artisanal ; ou assumer une cible « resto/franchise moderne » plus alignée.

## DOMAINE 8 — UX & PARCOURS UTILISATEUR — *Sous-total : 7 130/10 000*

**[8.1] Onboarding manager — NOTE : 720/1000 — [VÉRIFIÉ + À TESTER]**
`onboarding-wizard.tsx` avec reprise d'étape (localStorage). Existe et structuré. Time-to-value réel non mesurable sans prod.
*Recommandation :* viser « 1er planning publié en < 10 min » comme métrique d'activation nord.

**[8.2] Onboarding employé non-tech — NOTE : 700/1000 — [DÉDUIT]**
Invitation par email + lien, PIN 4 chiffres pour pointer (low-friction, adapté aux non-tech). PWA installable.
*Recommandation :* QR code d'installation PWA affiché en cuisine ; tutoriel 30s au 1er login.

**[8.3] Clarté navigation manager/employé — NOTE : 760/1000 — [VÉRIFIÉ]**
Séparation nette `/manager` vs `/employee` au niveau middleware (redirection par rôle), espaces distincts. Architecture claire.
*Recommandation :* RAS notable.

**[8.4] Empty states — NOTE : 720/1000 — [DÉDUIT]**
Composants `onboarding/` et structure dashboard suggèrent une prise en charge, mais non vérifié écran par écran.
*Recommandation :* auditer chaque vue à données vides (planning vierge, 0 employé, 0 congé) → CTA clair vers la 1ère action.

**[8.5] Feedback utilisateur — NOTE : 800/1000 — [VÉRIFIÉ]**
`sonner` (toasts) câblé dans `app/layout.tsx` et utilisé (billing, marketplace…). États de chargement, gestion d'erreurs API standardisée (messages FR).
*Recommandation :* RAS notable.

**[8.6] Cohérence des interactions — NOTE : 740/1000 — [DÉDUIT]**
Radix UI (dialog, select, label) + `tailwindcss-animate` + `auto-animate` → interactions homogènes et accessibles par défaut (Radix gère ARIA).
*Recommandation :* maintenir Radix partout (pas de composants maison divergents).

**[8.7] Accessibilité — NOTE : 620/1000 — [VÉRIFIÉ]**
Radix apporte l'ARIA/clavier gratuitement, SVG avec `aria-label` (vu dans le comparatif). MAIS : **texte blanc sur bouton violet #6C63FF = 4,32:1**, soit **sous le seuil AA (4,5:1) pour le texte normal** (passe en grande taille). Le dark mode dense peut gêner la cible (cf. 7.6).
*Recommandation :* **fix rapide** — assombrir légèrement le violet des boutons (ex. #5B52E6 → ~5:1) OU grossir/épaissir le label CTA. Audit axe-core en CI.

**[8.8] Expérience mobile PWA — NOTE : 740/1000 — [VÉRIFIÉ]**
`app/manifest.ts`, service worker (`public/sw.js`), page `offline`, push web (VAPID), installable iOS/Android. Vraie PWA, pas un habillage.
*Recommandation :* tester l'offline réel (pointage sans réseau en cuisine = cas d'usage critique) et les push iOS (contraintes Apple).

**[8.9] Courbe d'apprentissage — NOTE : 680/1000 — [DÉDUIT]**
La densité fonctionnelle (planning, conformité, contrats, marketplace, intégrations…) est une force commerciale mais alourdit la prise en main pour un gérant pressé.
*Recommandation :* masquer la complexité (intégrations, API v1) derrière un mode « avancé » ; parcours guidé minimal par défaut.

**[8.10] Points de friction — NOTE : 650/1000 — [DÉDUIT]**
Frictions probables : latence IA 30-60s (4.9), saisie initiale des employés/contrats, configuration des horaires d'ouverture. Le « sans CB » réduit la friction d'entrée mais attire des essais peu engagés.
*Recommandation :* import CSV employés ; pré-remplissage intelligent ; algo instantané par défaut.

## DOMAINE 9 — BUSINESS, PRICING & MONÉTISATION — *Sous-total : 7 120/10 000*

**[9.1] Pricing vs valeur — NOTE : 760/1000 — [DÉDUIT]**
49/89/149€/mois pour un outil qui prévient un risque prud'hommes (5-20k€/litige) et fait gagner des heures/semaine : **ROI évident**, prix plutôt sous-évalué côté valeur. Aligné code/landing/Stripe (vérifié).
*Recommandation :* tester un Essentiel à 59-69€ — la cible compare à la valeur (procès évité), pas au coût.

**[9.2] Positionnement prix vs Skello — NOTE : 740/1000 — [DÉDUIT]**
49€ vs ~40-50€ Skello : **quasi-parité**, donc Quartzbase n'est PAS « le moins cher » — il doit gagner sur la **différenciation conformité+IA**, pas le prix. La landing l'a compris (comparatif « valeur » pas « prix pur »).
*Recommandation :* ne pas se présenter comme « Skello pas cher » (perdant) mais « le seul qui vous protège juridiquement ».

**[9.3] Structure des plans — NOTE : 780/1000 — [VÉRIFIÉ]**
Segmentation logique par taille (10/25/∞ employés) ET valeur (IA 3/mois → illimitée → multi-site). `PLAN_EMPLOYEE_LIMITS` et `getPlanTier` codés et testés. Le quota IA comme levier de montée en gamme est intelligent.
*Recommandation :* clarifier ce qui débloque Pro (IA illimitée + copilote CA premium — déjà gardé par `isPro`).

**[9.4] Viabilité du parrainage — NOTE : 820/1000 — [VÉRIFIÉ]**
**Le brief est obsolète** : le code plafonne à **-30 % (×2), pas -75 %**, précisément parce que -75 % était « financially unsustainable » (commentaire du code). Le fondateur a **déjà corrigé** la faille. Reste viable : -30 % max sur un client qui en a amené 2 payants = acquisition très rentable.
*Recommandation :* RAS sur l'économie ; vérifier juste que l'UI parrainage annonce bien -30 % (et pas -75 % résiduel).

**[9.5] Mécanique Stripe du parrainage — NOTE : 820/1000 — [VÉRIFIÉ]**
Robuste : 1er mois filleul = coupon 100%-off-once, remise parrain via coupons, activation à **30 jours** (`REFERRAL_ACTIVATION_DAYS`), **anti-abus** (flag si >3 filleuls/14j, anti self-referral, anti-duplicata, exclusion des filleuls churned via webhook). Idempotence webhook protège contre la double-application. Testé (`referral.test.ts`).
*Recommandation :* tester le cas « parrain qui churn » (le code gère, mais à valider bout-en-bout en prod).

**[9.6] Essai 14 jours suffisant ? — NOTE : 800/1000 — [VÉRIFIÉ]**
**En réalité 30 jours** (`TRIAL_DAYS=30`), pas 14. 30 jours = largement suffisant pour vivre un cycle de planning complet (4 semaines) et percevoir la valeur conformité. Mécanique « fenêtre depuis création de compte » bien pensée (anti re-trial par re-souscription).
*Recommandation :* RAS ; éventuellement un check-in email à mi-essai (J15).

**[9.7] Marge brute par plan — NOTE : 720/1000 — [DÉDUIT]**
Coûts/établissement/mois estimés : infra Vercel+Supabase mutualisée ~1-3€, IA <0,60€ (Essentiel) à ~2-5€ (Pro actif), Resend ~négligeable, Stripe ~1,5%+0,25€. **Marge brute ≈ 90-96 %** sur tous les plans — typique SaaS, excellent. (Détail §4.)
*Recommandation :* logger le coût IA réel par compte pour confirmer la marge Pro (illimité).

**[9.8] LTV/CAC — NOTE : 500/1000 — [DÉDUIT]**
**Inconnu (0 client)**. Théorie : si churn 3-5 %/mois → durée de vie ~20-33 mois → LTV Essentiel ~1000-1600€. CAC : SEO/contenu/bouche-à-oreille ~bas, mais sans budget pub ni équipe sales, l'acquisition est le **mur réel**. LTV/CAC potentiellement bon SI l'acquisition existe — or le fondateur part.
*Recommandation :* viser un seul canal (SEO local « planning boulangerie » + partenariats fédérations boulangers).

**[9.9] Churn & rétention — NOTE : 560/1000 — [DÉDUIT]**
Leviers de rétention présents (emails proactifs, brief hebdo, push, valeur conformité « collante »). Risque : SaaS SMB restauration = churn élevé (fermetures, saisonnalité, faible engagement tech). Pas de séquence win-back (5.10).
*Recommandation :* mesurer l'activation (1er planning publié) comme prédicteur de rétention ; séquence réactivation.

**[9.10] Expansion revenue — NOTE : 620/1000 — [DÉDUIT]**
Upsell naturel : Essentiel→Pro (IA illimitée + copilote CA), mono→Multi-site, add-ons potentiels (export paie, POS, SMS Twilio déjà câblé). Bonne assise pour du NRR > 100 %.
*Recommandation :* packager un add-on « paie » payant (forte demande, cf. 3.8).

## DOMAINE 10 — REVENTE, RISQUES & VIABILITÉ — *Sous-total : 5 090/10 000*

**[10.1] Attractivité acquéreur — NOTE : 500/1000 — [DÉDUIT]**
Profils : (a) **acqui-hire** (un concurrent FR — Combo/Skello — rachète le code + l'angle conformité IA, peu probable mais possible) ; (b) **micro-PE/searcher** sur place de marché (Acquire.fr, MicroAcquire) ; (c) éditeur RH adjacent. À **0 client + 0 ARR**, l'actif vendu est « du code propre + une marque + un angle », pas un business. Attractivité modérée-faible.
*Recommandation :* documenter (archi, déploiement, runbook) pour vendre un actif « repreneur-ready ».

**[10.2] Valorisation 0/10/25/50 clients — NOTE : 450/1000 — [DÉDUIT]**
(Tableau §4.) À 0 client : **5-25 k€** (valeur d'actif code/marque). À 10 (~8-10k€ ARR) : **15-40 k€** (multiple bas, dépendance fondateur). À 25 (~20-25k€ ARR) : **40-90 k€** (1,5-3× ARR). À 50 (~45-55k€ ARR) : **90-180 k€** (2-3,5× ARR si churn maîtrisé et transférable). Multiples bas-de-fourchette à cause du risque fondateur et de l'absence de moat.
*Recommandation :* chaque client réel multiplie la valeur bien plus que chaque feature.

**[10.3] Risque « fondateur solo qui part » — NOTE : 250/1000 — [VÉRIFIÉ/DÉDUIT]**
**Le risque existentiel du dossier.** Un dev unique, par ailleurs employé en boulangerie, qui rejoint la gendarmerie en septembre 2026. Après cette date : pas de roadmap, pas de support, pas de correctif sécurité, pas d'astreinte. Toute la qualité technique repose sur une seule personne qui s'en va. Pour un acheteur ou un client, c'est rédhibitoire sans plan.
*Recommandation :* **décision n°1** — soit (a) trouver un repreneur/associé technique avant septembre, soit (b) vendre l'actif maintenant, soit (c) mode « maintenance minimale » assumé et communiqué. Ne pas vendre un service qu'on ne pourra pas soutenir.

**[10.4] Dépendances tierces — NOTE : 650/1000 — [DÉDUIT]**
4 dépendances critiques (Supabase, Vercel, Anthropic, Stripe), toutes solides et standard. Concentration réelle mais risque faible à court terme. L'API Stripe est **figée** (`2026-05-27.dahlia`) et l'IA a un **fallback algo** (atout). Verrou : migrer hors Supabase serait lourd (RLS).
*Recommandation :* surveiller les deprecations Stripe/Anthropic ; le fallback algo réduit déjà le risque IA.

**[10.5] Conformité RGPD — NOTE : 680/1000 — [VÉRIFIÉ]**
Bases présentes : pages légales (mentions, CGU, confidentialité, cookies), **export RGPD** (`/api/rgpd/export`, `/api/rgpd/audit-log`), audit log, soft-deletes, restriction lecture des données sensibles (migrations 064/065). Les données de présence/pointage = données personnelles → traitées avec des droits d'accès. Manque probable : registre des traitements, DPA avec sous-traitants, politique de rétention documentée.
*Recommandation :* publier une politique de rétention, signer les DPA (Supabase/Vercel/Anthropic/Resend/Stripe), documenter la base légale (contrat/intérêt légitime).

**[10.6] Risque juridique du comparatif — NOTE : 780/1000 — [VÉRIFIÉ]**
**Bien géré** : le comparatif vise « outils traditionnels », **ne nomme jamais Skello/Combo**, donc la publicité comparative (art. L122-1 Code conso, qui exige objectivité/vérifiabilité quand on nomme un concurrent) est **largement neutralisée**. Seul point d'attention : le « ~200€/mois » doit être justifiable (6.5).
*Recommandation :* conserver l'anonymat concurrentiel ; sourcer/adoucir le chiffre de coût « traditionnel ».

**[10.7] Responsabilité si planning illégal validé — NOTE : 600/1000 — [DÉDUIT]**
Atténué techniquement (repair déterministe, 9 règles sourcées) mais **non nul juridiquement** : si l'outil « valide » un planning ensuite jugé non conforme (convention HCR spécifique non couverte), la responsabilité de l'éditeur peut être recherchée. Les règles sont génériques (Code du travail), pas conventionnelles.
*Recommandation :* **clause de non-garantie explicite** dans les CGU (« outil d'aide, ne se substitue pas à un conseil juridique »), et libellé produit « alerte/suggestion » plutôt que « conforme garanti ».

**[10.8] Continuité de service (support, SLA, astreinte 5h) — NOTE : 350/1000 — [DÉDUIT]**
Aujourd'hui : 1 personne. Une badgeuse en panne au coup de feu du matin, un webhook Stripe cassé, une fuite RLS → **personne en astreinte après septembre**. Pas de SLA tenable par un solo en gendarmerie. C'est le corollaire opérationnel de 10.3.
*Recommandation :* status page + monitoring d'alerte (Sentry déjà là) ; surtout, résoudre 10.3.

**[10.9] Barrières à l'entrée / moat — NOTE : 450/1000 — [DÉDUIT]**
Moat faible : pas d'effet réseau, pas de données propriétaires massives, fonctionnalités réplicables. Le seul moat naissant : **l'angle conformité légale codée + UX premium** — copiable par un acteur financé. À 0 client, aucun coût de switch.
*Recommandation :* construire le moat par la donnée (benchmarks coût/CA sectoriels anonymisés) et les intégrations POS (coût de switch).

**[10.10] Probabilité de survie à 12 mois — NOTE : 380/1000 — [DÉDUIT]**
Scénarios : **(A) Statu quo** (fondateur part, pas de relais) → ~15-25 % de survie active à 12 mois (le produit « tourne » mais meurt lentement faute de support/acquisition). **(B) Associé/repreneur trouvé** → 50-65 %. **(C) Vente de l'actif maintenant** → la « survie » devient celle de l'acheteur. La techno survit ; le *projet sous sa forme actuelle*, peu probablement.
*Recommandation :* trancher (A/B/C) avant l'été — voir « Vérité inconfortable ».

---

# 4. MATRICES & COMPARATEURS CHIFFRÉS

## 4.1 Matrice fonctionnelle Quartzbase vs Skello vs Combo vs Snapshift
*(✅ présent · ⚠️ partiel/à confirmer · ❌ absent · estimations concurrents [DÉDUIT])*

| Fonction | Quartzbase | Skello | Combo | Snapshift |
|---|---|---|---|---|
| Planning visuel drag & drop | ✅ [V] | ✅ | ✅ | ✅ |
| Conformité légale auto (règles sourcées) | ✅ **9 règles** [V] | ⚠️ | ⚠️ | ⚠️ |
| Auto-planning **IA (langage naturel)** | ✅ [V] | ❌ | ⚠️ | ❌ |
| Moteur algo déterministe **gratuit (fallback)** | ✅ [V] | ❌ | ❌ | ❌ |
| Pointage / badgeuse | ✅ [V] | ✅ | ✅ | ✅ |
| Gestion congés (workflow) | ✅ [V] | ✅ | ✅ | ✅ |
| Échange/marketplace de shifts | ✅ [V] | ✅ | ✅ | ⚠️ |
| Multi-établissement | ✅ [V] | ✅ | ✅ | ✅ |
| Copilote coût/CA (forecast) | ✅ [V] | ⚠️ | ✅ | ⚠️ |
| **Intégration POS/caisse** | ❌ [V] | ✅ | ✅ | ✅ |
| **Export/module paie complet** | ⚠️ partiel [V] | ✅ | ✅ | ✅ |
| API REST / webhooks / Slack / iCal | ✅ v1 [V] | ✅ | ⚠️ | ⚠️ |
| App native (vs PWA) | ❌ PWA [V] | ✅ | ✅ | ✅ |
| Base installée / preuve sociale | ❌ 0 client [V] | ✅✅✅ | ✅✅ | ✅✅ |
| Support / SLA / astreinte | ❌ solo [V] | ✅ | ✅ | ✅ |
| Prix indicatif /mois | 49-149€ [V] | ~40-50€ | ~?€ | ~?€ |

**Lecture :** Quartzbase **gagne sur l'IA, le fallback algo et la conformité codée** ; **perd sur POS, paie, base installée et continuité**. C'est un challenger « conformité-first » crédible, pas encore un substitut complet.

## 4.2 Valorisation par palier de clients

| Clients | ARR estimé | Valorisation | Multiple | Hypothèses |
|---|---|---|---|---|
| 0 | 0 € | **5-25 k€** | n/a (actif) | Code+marque+angle, risque fondateur fort |
| 10 | ~8-10 k€ | **15-40 k€** | ~2-4× ARR | Churn inconnu, dépendance fondateur |
| 25 | ~20-25 k€ | **40-90 k€** | ~2-3,5× ARR | Traction prouvée, transfert à organiser |
| 50 | ~45-55 k€ | **90-180 k€** | ~2-3,5× ARR | Churn maîtrisé + doc repreneur-ready |

*Multiples bas de fourchette du SaaS B2B FR (souvent 3-6× ARR) en raison du risque fondateur, de l'absence de moat et de la taille. Chaque client réel vaut plus que toute feature supplémentaire.*

## 4.3 Marge par plan (mensuel)

| Plan | Revenu | Coût IA est. | Coût infra est. | Stripe | **Marge brute** | % |
|---|---|---|---|---|---|---|
| Essentiel | 49 € | ~0,2-0,6 € | ~1-2 € | ~1,0 € | **~45-47 €** | **~93-96 %** |
| Pro | 89 € | ~2-5 € | ~1,5-2,5 € | ~1,6 € | **~78-84 €** | **~88-94 %** |
| Multi-site | 149 € | ~3-6 € | ~2-3 € | ~2,5 € | **~138-142 €** | **~92-95 %** |

*Le fallback algo gratuit borne le coût IA même sur les plans « illimités ». Marges typiques SaaS — la monétisation n'est pas le problème ; l'acquisition l'est.*

## 4.4 Funnel de conversion estimé [DÉDUIT — à instrumenter]

| Étape | Taux retenu | Hypothèse |
|---|---|---|
| Visiteurs → Essai | **2-3 %** | Landing soignée mais 0 preuve sociale (bas de fourchette FR 2-5 %) |
| Essai → Payant | **8-15 %** | Essai 30j **sans CB** (gonfle les essais peu qualifiés) |
| **Visiteur → Payant** | **~0,2-0,45 %** | Composé |

*Pour 1 000 visiteurs/mois → ~2-4,5 clients/mois. À ce rythme, atteindre 25 clients = 6-12 mois **si** le canal d'acquisition tourne — or il dépend du fondateur.*

## 4.5 Matrice des risques (probabilité × impact)

| Risque | Prob. | Impact | Niveau |
|---|---|---|---|
| Fondateur part sans relais (10.3/10.8) | **Élevée** | **Critique** | 🔴🔴🔴 |
| 0 client / acquisition atone (9.8) | Élevée | Élevé | 🔴🔴 |
| Délivrabilité email KO (5.6) | Moyenne | Élevé | 🔴🔴 |
| Dérive migrations prod (1.4) | Moyenne | Élevé | 🟠 |
| CSP report-only / faille XSS (2.8) | Faible-moy | Élevé | 🟠 |
| Responsabilité planning illégal (10.7) | Faible | Élevé | 🟠 |
| KV/rate-limit absent en prod (2.9) | Moyenne | Moyen | 🟡 |
| Dark mode rejet cible (7.6) | Moyenne | Moyen | 🟡 |
| Dépendance tierce (10.4) | Faible | Moyen | 🟢 |

---

# 5. CHECKLIST DE VÉRIFICATION PRÉ-LANCEMENT (points [À TESTER])

1. **Délivrabilité email (5.6) — CRITIQUE.** Dans Resend, vérifier que `quartzbase.fr` est « Verified » (SPF + DKIM + DMARC). Test : envoyer un welcome à une adresse [mail-tester.com](https://mail-tester.com), viser un score ≥ 9/10. Vérifier inbox (pas spam) sur Gmail + Outlook.
2. **État des migrations prod (1.4).** Exécuter `list_migrations` sur la prod Supabase, diff avec `supabase/migrations/` (70 fichiers). Confirmer 034→070 appliquées. Régénérer `docs/migrations-state.md`. Lancer `npm run check:migrations`.
3. **Webhook Stripe (2.5).** Avec Stripe CLI : `stripe listen --forward-to <url>/api/stripe/webhook` puis `stripe trigger checkout.session.completed`. Vérifier upsert `subscriptions` + ligne `stripe_webhook_events` (idempotence : rejouer le même event → `duplicate: true`).
4. **Cron secret (2.6).** Appeler un cron sans header → 401 ; avec `Authorization: Bearer $CRON_SECRET` → 200. Confirmer `CRON_SECRET` présent dans Vercel (sinon tous les crons muets).
5. **Email trial-ending (5.2).** Créer un compte test, mettre `trial_end` à J+2 en base, déclencher `/api/cron/trial-reminder` avec le Bearer, vérifier réception.
6. **Quota IA (4.3).** Compte Essentiel : lancer 3 générations IA (OK), la 4e → 402 « Quota IA atteint ». Vérifier la table `ai_usage`.
7. **Étanchéité RLS (1.2/2.1).** Deux établissements A et B : se connecter en A, tenter de lire un shift/employé/contrat de B via l'API → doit échouer. Lancer `get_advisors` (sécurité + perf).
8. **Vercel KV (2.9).** Confirmer `KV_REST_API_URL` en prod (sinon rate-limit best-effort). Spammer une route IA → 429 attendu.
9. **PWA offline (8.8).** Mode avion : ouvrir l'app installée, tenter un pointage → comportement offline correct (file d'attente ou message clair).
10. **CWV landing (6.9).** PageSpeed Insights mobile sur `quartzbase.fr` → LCP < 2,5s, CLS < 0,1.
11. **Sentry (1.7).** Confirmer `NEXT_PUBLIC_SENTRY_DSN` en prod ; déclencher une erreur test → visible dans Sentry.
12. **Push iOS (8.8).** Tester l'abonnement push sur un iPhone (PWA installée, contraintes Apple 16.4+).

---

# 6. ROADMAP DE CORRECTION PRIORISÉE

## 🔴 Bloquants — avant lancement (cette semaine)
| Item | Pourquoi | Effort | Gain audit |
|---|---|---|---|
| **Plan de continuité fondateur (A/B/C)** | Risque existentiel ; conditionne tout le reste | Décisionnel | +++ (D10) |
| **Vérifier SPF/DKIM/DMARC Resend** | Sans ça, emails en spam → conversion morte | 1-2 h | ++ (5.6) |
| **Figer l'état des migrations prod** | Drift code/prod = bugs silencieux (cf. 066) | 2-3 h | ++ (1.4) |
| **Confirmer `CRON_SECRET` + KV en prod** | Crons muets / rate-limit inopérant sinon | 30 min | + (2.6/2.9) |
| **Contraste bouton CTA (4,32→≥4,5:1)** | Accessibilité AA + lisibilité conversion | 15 min | + (8.7) |

## 🟡 Importants — 2-4 semaines
| Item | Pourquoi | Effort | Gain |
|---|---|---|---|
| Obtenir 1-2 pilotes réels (preuve sociale) | Levier de conversion n°1 à 0 client | Variable | ++ (6.4/9.8) |
| Passer CSP en enforce (après observation) | Protection XSS réelle | 2-4 h | + (2.8) |
| Clause de non-garantie CGU (planning) | Limiter la responsabilité (10.7) | 1 h | + (10.7) |
| Étendre Zod aux routes mutatives restantes | Réduire la surface d'entrées non validées | 1 j | + (2.4) |
| Séquence onboarding 3 emails | Activation/rétention | 1 j | + (5.10) |
| Toiletter résidus « Nexus » (package/README/VAPID) | Cohérence pro pour repreneur | 1 h | + (1.8) |
| Mode clair dans l'app (vues planning) | Dérisquer la cible 40-55 ans | 2-3 j | + (7.6) |

## 🟢 Optimisations — post-lancement
| Item | Pourquoi | Effort |
|---|---|---|
| Export « préparation paie » (CSV + majorations) | Argument de vente fort (3.8/3.10) | 3-5 j |
| Première intégration POS (Tiller/Zelty) | Moat + pilotage CA réel-temps | 1-2 sem |
| Fallback runtime IA→algo automatique | Robustesse (4.6) | 0,5 j |
| Streaming progression génération IA | UX latence (4.9) | 1-2 j |
| Règles conventionnelles HCR/boulangerie | Précision conformité (3.2) | 3-5 j |
| Rate-limit auth/PIN + API v1 | Anti-bruteforce (2.7/2.10) | 1 j |
| 2FA managers | Sécurité comptes (2.2) | 1 j |

---

# 7. LA VÉRITÉ INCONFORTABLE

Maxence, voici ce qu'un consultant payé cher te dirait en privé, sans détour.

**Tu as résolu le mauvais problème — magnifiquement.** Ton code n'est pas un problème : il est meilleur que celui de la majorité des startups financées que j'audite. La sécurité, les tests, le moteur hybride IA+solveur, l'idempotence Stripe, le parrainage que tu as toi-même rétabli à -30 % quand tu as vu que -75 % te ruinait — c'est du travail de développeur senior, à 19 ans, seul. Personne ne peut t'enlever ça.

Mais **un SaaS n'est pas un logiciel, c'est une promesse de continuité.** Et là est le mur : tu pars en gendarmerie en septembre. Un produit RH en production, c'est un gérant qui t'appelle à 6h parce que sa badgeuse ne marche pas le matin du coup de feu. Tu ne pourras pas décrocher. Vendre un abonnement annuel à 490€ pour un service que tu ne pourras pas soutenir dans 90 jours, ce n'est pas un risque business — c'est un problème éthique, et un risque juridique (RGPD, responsabilité, prud'hommes que tu promets justement d'éviter).

**Le vrai actif que tu as construit, ce n'est pas Quartzbase-l'entreprise. C'est Quartzbase-le-code et Maxence-le-développeur.** La décision honnête n'est pas « comment je lance ? » mais « lequel des trois » : (A) tu trouves un associé/repreneur technique avant l'été qui prend le relais — alors lance ; (B) tu vends l'actif maintenant à un acteur qui a la distribution et le support — c'est probablement la meilleure issue financière et morale ; (C) tu lances en « maintenance minimale » assumée et tu le dis à tes clients — honnête, mais ça tue la croissance. Ce que tu **ne** dois **pas** faire, c'est lancer en grand, signer des annuels, et disparaître en septembre.

La chose la plus dure : **ce produit mérite de vivre, mais probablement pas entre tes mains après septembre.** Le plus grand acte d'ingénierie qu'il te reste à faire n'est pas une feature — c'est d'organiser sa survie sans toi. Trouve cette personne, ou ce repreneur, avant de vendre le premier abonnement annuel.

---

*Rapport produit par QUARTZ AUDIT GROUP — 7 expertises agrégées (CTO, Head of Product, Growth Lead, Directrice Artistique, Ingénieur QA, Analyste M&A, DPO/Juriste). Édition pré-lancement, juin 2026. Note finale : **71 650/100 000 · 71,7/100 · B · GO conditionnel**. Audit réalisé avec accès au code source réel : ~70 % des critères sont [VÉRIFIÉ], le reste [DÉDUIT]/[À TESTER] avec protocoles fournis.*
