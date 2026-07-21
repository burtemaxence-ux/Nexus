# AUDIT COMPLET — QUARTZBASE

**Date :** 21 juillet 2026
**Référence précédente :** `docs/2026-06-16-audit-complet-quartzbase.md` (110/180)
**Méthode :** audit ancré dans le code réel du repo et l'état réel de la prod (advisors Supabase,
migrations appliquées, suite de tests, build), pas dans les intentions. Chaque note est comparée
à juin quand la dimension existait. Document destiné à être re-généré à chaque audit — la
checklist reproductible est en fin de document.
**Contexte :** point de contrôle de la décision de trajectoire (fin juillet) atteint. Le nombre
de clients payants n'est pas visible depuis le code ; toutes les recommandations business sont
conditionnées à cette donnée.

---

## SYNTHÈSE EXÉCUTIVE (à lire en réunion)

Quartzbase est aujourd'hui un produit **techniquement au-dessus du standard des SaaS établis** :
0 avertissement de performance base de données, 247 tests automatisés couvrant les circuits
d'argent, CI complète, monitoring Sentry, sécurité multi-tenant vérifiée, coûts IA optimisés
(−50 % sur les briefs). La dette signalée en juin est soldée à ~90 %.

**Les 3 découvertes de cet audit sont toutes côté vitrine, pas côté produit :**

1. 🔴 **La landing annonce des clients qui n'existent pas** — le bandeau « Ils planifient
   sereinement avec Quartzbase » liste 8 établissements fictifs dont **« O'Tacos Centre »,
   une enseigne réelle**. Preuve sociale inventée + marque déposée d'autrui = pratique
   commerciale trompeuse (Art. L121-2 C. conso) et risque marque. À corriger avant tout trafic.
2. 🔴 **L'incohérence 14 jours / 30 jours d'essai est revenue** (ou n'avait jamais été purgée
   partout) : métadonnées SEO/OG, badge du hero, FAQ (qui se contredit elle-même : une question
   dit 14, la réponse suivante dit 30), CTA des pages de contenu. L'essai réel est de 30 jours.
   *(Corrigé dans la foulée de cet audit — voir plan P0.)*
3. 🟠 **Le produit est prêt, la preuve ne l'est pas** : toujours 0 témoignage chiffré,
   0 vidéo démo, 0 logo client réel. Le mur n'est plus technique.

**Score global : 133/180 (juin : 110/180).** La colonne technique tire vers le haut ;
acquisition/preuve sociale et continuité post-septembre restent les deux freins.

### Scorecard

| # | Dimension | Juin | Juillet | Tendance | Commentaire d'une ligne |
|---|-----------|:----:|:-------:|:--------:|--------------------------|
| 1 | Fondations techniques | — | **17/20** | 🆕 | 56 657 LOC propres, 0 TODO, CI, Sentry, CSP, PWA |
| 2 | Sécurité | — | **16/20** | 🆕 | RLS vérifiée, webhook signé+idempotent, 2 réglages restants |
| 3 | Base de données & perf | — | **17/20** | 🆕 | Advisors perf : 0 warning ; migrations trackées et certifiées |
| 4 | Qualité code & tests | — | **15/20** | 🆕 | 247 tests, chemins d'argent couverts ; E2E absent |
| 5 | Produit & positionnement | 14 | **15/20** | ↗ | Recentrage conformité fait ; KPI € toujours absent |
| 6 | Espace manager | 14 | **15/20** | ↗ | Settings regroupés, onboarding 1-tap, brief batch |
| 7 | Espace employé | 13 | **14/20** | ↗ | Rappel J-1, invitation SMS ; mur d'adoption inchangé |
| 8 | IA | — | **16/20** | 🆕 | Quotas fail-closed, prompt caching, Batch API −50 % |
| 9 | Monétisation & parrainage | 13 | **15/20** | ↗ | « 1 mois exact » verrouillé par tests ; dunning à configurer |
| 10 | Landing & acquisition | 13 | **11/20** | ↘ | Structure bonne MAIS logos fictifs + 14/30 incohérent |
| 11 | Design & branding | 11 | **14/20** | ↗ | Thème clair par défaut ✓, WCAG ✓ ; Syne/violet à trancher |
| 12 | Ops, continuité & M&A | 10 | **8/20** | ↘ | Bus factor 1, départ septembre non tranché, support informel |
| | **TOTAL (sur 12×20=240, ramené /180)** | 110/180 | **≈133/180** | ↗ | |

*(Les dimensions 🆕 n'existaient pas séparément en juin ; le total est ramené à la même échelle
pour comparaison en pondérant les 9 dimensions historiques.)*

---

## PARTIE 1 — FONDATIONS TECHNIQUES — 17/20

**Constat.** 63 pages, 99 routes API, 56 657 lignes TS/TSX, **0 TODO/FIXME** dans le code
(rarissime), Next.js 14.2.5 App Router, TypeScript strict (typecheck vert), build prod vert,
First Load JS partagé 153 kB (bon pour une app de cette densité).

**Points forts**
- **CI GitHub Actions** : typecheck + lint + tests + build sur chaque PR, avec annulation des
  runs redondants. Le garde-fou anti-« Nexus » est en place.
- **Observabilité** : Sentry client/serveur/edge via `instrumentation.ts`, endpoint
  `/api/csp-report` pour les violations CSP.
- **En-têtes de sécurité complets** : HSTS, X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy, et une **CSP en mode report-only** correctement dimensionnée
  (Stripe, Supabase, Sentry, Vercel) — prête à passer en mode bloquant.
- **PWA** installable, page offline, service worker.

**Points ouverts**
- 4 familles de polices chargées (Inter, Syne, DM Sans, Manrope) — au moins une de trop
  (voir Partie 11).
- CSP toujours en report-only — passer en enforcing après une fenêtre d'observation (P1).
- Next 15 existe ; migration **volontairement non recommandée** (aucun gain client, risque réel).

---

## PARTIE 2 — SÉCURITÉ — 16/20

**Vérifié dans cet audit (advisors Supabase du jour + lecture code) :**

| Contrôle | État |
|---|---|
| Isolation multi-tenant RLS (établissement) | ✅ policies scopées, fuite `shift_exchanges` fermée depuis juin (053) |
| Webhook Stripe | ✅ signature vérifiée + **idempotence** (058) + rollback du verrou testé |
| Rate limiting | ✅ 3 étages : Vercel KV → **Postgres durable (081, nouveau)** → in-memory |
| Quota IA | ✅ fail-closed en Postgres, par feature (048/060), non bypassable |
| Tokens API v1 | ✅ hachés SHA-256, affichés une seule fois |
| PIN badgeuse | ✅ bcrypt, pas d'endpoint de vérification brute-forçable |
| Tables système (`rate_limit_hits`, `ai_batch_jobs`, `stripe_webhook_events`) | ✅ RLS sans policy = service role uniquement (voulu) |
| Auth pages / middleware | ✅ redirections par rôle, magic link, set-password |

**Restes (advisors sécurité du 21/07) :**
- 🟠 **Protection mots de passe compromis (HaveIBeenPwned) désactivée** — 1 clic dans
  Supabase → Auth. Ouvert depuis juin. *Le* réglage à faire aujourd'hui.
- 🟡 Fonctions `SECURITY DEFINER` (`is_manager`, `current_establishment_id`, `consume_ai_credit`,
  `get_ai_usage`, `owner_multisite_subscription`) exécutables par `authenticated` (2 par `anon`)
  via PostgREST. Risque réel faible (elles retournent des données scopées à l'appelant et
  servent aux policies RLS), mais **révoquer `anon`** sur `is_manager` /
  `current_establishment_id` est gratuit et ferme le point (P1).

---

## PARTIE 3 — BASE DE DONNÉES & PERFORMANCE — 17/20

- **Advisors performance : 0 avertissement** (juin : 41 `auth_rls_initplan` + 149
  `multiple_permissive_policies` + 1 FK non indexée). Passe complétée le 21/07 (migration 080).
- **39 migrations appliquées en prod, toutes trackées** (`supabase/migrations/` +
  `docs/migrations-state.md` + sondes `scripts/check-migrations.ts`). La numérotation locale
  saute 075-079 (appliquées en prod sans fichier local) — cosmétique, documenté dans 080.
- Index « unused » signalés par l'advisor **conservés sciemment** : ce sont des index de FK
  (046/055) ; les supprimer recréerait l'alerte inverse et pénaliserait les cascades. Décision
  documentée en tête de la migration 080 — **ne pas y revenir à chaque audit**.
- 🟡 **Pas de stratégie de sauvegarde documentée** (R5 de juin, toujours ouvert) : les backups
  quotidiens Supabase existent par défaut, mais aucune procédure de restauration n'a été testée
  ni écrite. Une heure de travail, énorme valeur en due diligence.

---

## PARTIE 4 — QUALITÉ CODE & TESTS — 15/20

- **247 tests / 23 fichiers**, tous verts. Couverture réelle des zones à risque :
  conformité légale (8 règles), solveur de planning, parrainage, abonnements, validations Zod,
  webhooks sortants, et — depuis le 21/07 — **les circuits d'argent Stripe** : idempotence
  (un même événement rejoué ne double plus un cadeau), garantie « 1 mois exact » filleul
  (le bug des ~60 jours gratuits ne peut plus revenir), churn, past_due, ré-abonnement.
- Conventions tenues : types centralisés, Zod aux frontières, soft deletes, `cn()`,
  CLAUDE.md + docs `.claude/` à jour.
- **Manques** : aucun test E2E (Playwright est disponible dans l'environnement — un smoke
  « login → créer un shift → publier » attraperait ce que les tests unitaires ne voient pas) ;
  pas de mesure de couverture chiffrée (facultatif à ce stade).

---

## PARTIE 5 — PRODUIT & POSITIONNEMENT — 15/20 (juin : 14)

- ✅ Le repositionnement « conformité qui protège des prud'hommes » est **exécuté** : title de
  la landing, hero, pages SEO dédiées (`/code-du-travail`, `/conformite`, `/securite`,
  `/guide-demarrage`, `/a-propos`, `/devenir-partenaire` — ce dernier ouvre le canal
  expert-comptable recommandé en juin).
- ✅ La sur-ingénierie des settings est corrigée (5 catégories), l'onboarding guidé existe,
  la page support/contact existe.
- 🟠 **Le KPI que le gérant attend manque toujours : « ce planning me coûte combien ? »**
  Le M2 de juin a livré les *heures* planifiées ; le coût horaire par poste existe en base
  (`postes.hourly_cost`) — multiplier et afficher en € sur le home est le chaînon manquant
  le plus rentable du produit (P1).
- 🟡 Cible boulangerie vs restaurant toujours non tranchée dans le copy (les deux sont cités).

## PARTIE 6 — ESPACE MANAGER — 15/20 (juin : 14)

Acquis depuis juin : navigation settings ×5 catégories, « prochaine étape » d'onboarding en
1 tap, tâches du jour sur le home, brief IA hebdo (désormais batché), KPI heures, centre
d'alertes, audit log. Friction restante : drag & drop mobile (limitation dnd-kit connue,
mitigée par les vues jour/liste) ; KPI € (cf. Partie 5).

## PARTIE 7 — ESPACE EMPLOYÉ — 14/20 (juin : 13)

Acquis : rappel de service J-1 (cron + push), invitation par SMS (magic link), clôture forcée
des pointages oubliés avec `needs_review`, badgeuse robuste inter-jour. Le **mur d'adoption**
reste entier — c'est un sujet d'exécution terrain (QR code en salle de pause, pointage introduit
en J+7), pas de code. Rien à coder ici tant que de vrais employés n'ont pas donné de feedback.

## PARTIE 8 — IA — 16/20

| Aspect | État |
|---|---|
| Quotas | ✅ fail-closed Postgres, par feature (chat / plan), non bypassable |
| Coûts | ✅ prompt caching (chat + plan) ; **Batch API −50 % sur les briefs (nouveau, 082)** avec double fallback synchrone |
| Robustesse | ✅ 503 propre sans clé, 12 itérations max sur le plan, `maxDuration` géré, garde `plan-guard` testé |
| Modèles | Haiku 4.5 (chat/briefs — bon choix coût), Sonnet 4.6 (génération planning) |

- 🟡 Opportunité mesurée : Sonnet 5 est sorti (qualité proche Opus, tarif d'intro). À **tester
  sur 2-3 générations de planning réelles** avant tout changement — pas un chantier, une
  expérience d'une heure. Ne rien changer sans A/B.
- 🟡 Le brief batch mérite une vérification opérationnelle lundi prochain (logs des 2 crons,
  `from_batch > 0`).

## PARTIE 9 — MONÉTISATION & PARRAINAGE — 15/20 (juin : 13)

- ✅ Essai 30 jours cohérent **dans l'app** (billing calcule depuis Stripe).
- ✅ Parrainage : −15 %/filleul, plafond −30 %, activation J+30, anti-auto-parrainage,
  anti-doublon, anti-rafale (054), churn filleul **et** parrain gérés, remises Stripe réelles.
- ✅ Le tout est désormais **verrouillé par des tests** (le cumul trial+coupon de juin ne peut
  pas réapparaître silencieusement).
- 🟠 **Dunning** : `invoice.payment_failed` → `past_due`, mais aucune relance configurée.
  Activer les **Smart Retries + emails d'échec de paiement dans le dashboard Stripe**
  (0 code, ~15 min) — à 49 €/mois, chaque impayé non relancé est un churn gratuit.
- 🟡 Page billing : proposer l'annuel (−2 mois) au moment où le trial expire (petit gain, P2).

## PARTIE 10 — LANDING & ACQUISITION — 11/20 (juin : 13 — régression)

La structure reste bonne (hero conformité, réassurance, comparatif anonymisé, pricing, FAQ,
JSON-LD, pages SEO). Mais deux découvertes majeures :

1. 🔴 **Logos clients fictifs** (`components/public/logos-marquee.tsx`) : 8 noms inventés
   présentés comme clients (« Ils planifient sereinement avec Quartzbase »), dont
   **« O'Tacos Centre » — marque réelle**. Double risque : pratique commerciale trompeuse
   (Art. L121-2 C. conso) et usage de marque d'autrui. **Retirer ou reformuler avant tout
   trafic payant.** Alternative honnête : bandeau « Conçu pour les boulangeries, brasseries,
   cafés et commerces de proximité » (secteurs, pas clients), ou logos réels dès le client #1.
2. 🔴 **14 jours vs 30 jours** : metadata/OG/Twitter (`app/page.tsx` ×3), badge hero
   (`hero-section.tsx`), FAQ auto-contradictoire (`faq.tsx` : Q « après les 14 jours » /
   R « 30 jours complets »), CTA des pages de contenu (`content-page.tsx`), et pages publiques.
   L'essai réel est 30 jours (`TRIAL_DAYS = 30`). *Corrigé dans la foulée de cet audit.*
3. 🟠 Toujours manquants (inchangé depuis juin, décisions/contenu — pas du code) :
   vidéo démo 60 s, témoignage chiffré, garantie remboursement, logos réels.

## PARTIE 11 — DESIGN & BRANDING — 14/20 (juin : 11)

**Acquis majeurs depuis juin**
- ✅ **Thème clair par défaut dans l'app** (la reco n°1 de juin pour la cible) ; sombre en
  1 clic ; landing/auth gardent le dark de marque ; préférences préservées.
- ✅ Passe WCAG sur les statuts du thème clair (succès `#16A34A`, warning `#D97706`,
  danger `#DC2626` — ≥3:1, danger 4,83:1). Résidu assumé : l'AA strict 4,5:1 sur les
  micro-textes 11px des badges demanderait des teintes plus sombres — choix design ouvert.
- ✅ Plus aucun résidu « Nexus » visible (garde-fou CI actif).
- ✅ Design system mûr : tokens CSS complets clair/sombre, sidebar/motion soignés,
  `prefers-reduced-motion` respecté partout (rare et appréciable).

**À trancher une fois pour toutes (décisions, pas des chantiers)**
- 🟡 **Syne** : l'audit de juin recommandait de l'abandonner ; elle est toujours chargée et
  utilisée dans 24 fichiers, *en plus* de Manrope (ajoutée pour la landing), DM Sans et Inter.
  4 familles = poids + incohérence. Décision à prendre : soit assumer Syne comme signature
  (et retirer une autre), soit basculer les 24 usages vers Manrope. Une heure de travail
  une fois la décision prise.
- 🟡 **Violet #6C63FF** : conservé. Position de juin (registre « tech/gaming » pour des
  artisans) toujours valable, mais un rebrand couleur à 0 client est du temps perdu —
  à réévaluer avec de vrais retours prospects.
- 🟡 **Nom « Quartzbase »** : position de juin inchangée — pas de rebrand, la baseline
  (« planning & conformité pour la restauration ») fait le travail.

## PARTIE 12 — OPS, CONTINUITÉ & M&A — 8/20 (juin : 10 — le temps joue contre)

Le code s'est bonifié ; **cette dimension, elle, n'a pas bougé, et l'échéance de septembre
s'est rapprochée de 5 semaines** — d'où la note en baisse.

- 🔴 **Trajectoire post-gendarmerie non tranchée.** Le point de contrôle écrit dans
  `docs/2026-06-16-decision-trajectoire.md` est **daté de fin juillet : c'est maintenant.**
  Règle décidée alors : ≥3-5 clients payants → continuer ; 0-1 → basculer vers
  acqui-hire/transmission avant septembre. Cette décision conditionne tout le plan ci-dessous.
- 🟠 Support informel (R3) : pas de canal annoncé ni de délais publiés.
- 🟠 Registre RGPD (R4) et procédure de restauration de backup (R5) : non faits.
- 🟠 Bus factor = 1. Les runbooks (`docs/deployment.md`, migrations-state, cet audit)
  progressent — c'est la seule chose qui transfère de la valeur sans toi.

---

## PLAN D'ACTION — du plus petit au plus grand

### P0 — Cette semaine (coût quasi nul, risque juridique ou revenu)

| # | Action | Effort | Qui |
|---|--------|--------|-----|
| P0-1 | Purger « 14 jours » → « 30 jours » sur toute la surface marketing | 15 min | ✅ **fait avec cet audit** |
| P0-2 | Retirer/reformuler le bandeau logos fictifs (surtout « O'Tacos ») | 30 min | décision Maxence + 1 edit |
| P0-3 | Activer la protection mots de passe compromis (Supabase → Auth) | 1 clic | Maxence |
| P0-4 | Activer Smart Retries + emails d'échec de paiement (dashboard Stripe) | 15 min | Maxence |
| P0-5 | Vérifier lundi les logs `weekly-brief-submit`/`-manager` (`from_batch>0`) | 5 min | Maxence |
| P0-6 | **Trancher le point de contrôle trajectoire** (clients ? → suite) | réunion | Maxence |

### P1 — Ce mois (heures, pas jours)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| P1-1 | KPI « coût € du planning de la semaine » sur le home manager (`postes.hourly_cost` × heures) | ½ j | le chiffre que le gérant regarde vraiment |
| P1-2 | Passer la CSP de report-only à enforcing (après revue des rapports) | 1 h | sécurité |
| P1-3 | Révoquer `EXECUTE` anon sur `is_manager`/`current_establishment_id` | 30 min | ferme l'advisor |
| P1-4 | Smoke E2E Playwright (login → shift → publier → badge) branché en CI | ½ j | filet anti-régression UI |
| P1-5 | Trancher Syne vs Manrope et appliquer (24 fichiers) | 1 h | cohérence + poids |
| P1-6 | Tester Sonnet 5 sur 3 générations de planning réelles (A/B vs 4.6) | 1 h | qualité/coût IA |
| P1-7 | Documenter + tester une restauration de backup Supabase (R5) | 1 h | due diligence |
| P1-8 | Contenu (pas du code) : vidéo démo 60 s + 1er témoignage chiffré | — | déblocage GTM |

### P2 — Si traction (≥ 5-10 clients payants)

- Export paie CSV (format Silae/Cegid) — la 1ʳᵉ demande prévisible des gérants équipés.
- Page billing : upsell annuel au moment de l'expiration du trial.
- Registre RGPD formalisé (R4) + canal support publié avec délais (R3).
- Micro-textes badges clair → AA strict 4,5:1 si retours lisibilité.
- Packager `lib/compliance` comme actif documenté (valeur M&A).

### À NE PAS FAIRE (inchangé, confirmé)

- Migration Next 15, refonte du branding/nom, migration styles inline → Tailwind,
  nouvelles features spéculatives (multi-langue, mobile natif, marketplace publique…).
- Supprimer les index « unused » (ce sont des index de FK — documenté migration 080).
- Re-coder quoi que ce soit pour l'espace employé avant feedback de vrais employés.

---

## CHECKLIST DU PROCHAIN AUDIT (reproductible)

Copier ce bloc dans le prochain audit et comparer :

```bash
# Qualité
npx tsc --noEmit                 # attendu : silencieux
npx vitest run                   # 2026-07-21 : 247 tests / 23 fichiers
npm run build                    # attendu : vert ; First Load JS partagé 2026-07-21 : 153 kB

# Hygiène
grep -rn "TODO\|FIXME" app lib components --include='*.ts*' | wc -l   # 2026-07-21 : 0
grep -rin "nexus" app components lib --include='*.ts*' | wc -l        # attendu : 0 visible
grep -rn "14 jours" app components --include='*.tsx' | wc -l          # attendu : 0 (hors contexte planning employé)

# Volumétrie (tendance, pas objectif)
find app -name 'page.tsx' | wc -l          # 2026-07-21 : 63
find app/api -name 'route.ts' | wc -l      # 2026-07-21 : 99
```

Côté Supabase (MCP ou dashboard) : `get_advisors` performance (2026-07-21 : 0 WARN,
uniquement des INFO `unused_index` assumés) et security (2026-07-21 : leaked-password OFF,
5 fonctions SECURITY DEFINER exposées) ; `list_migrations` (2026-07-21 : 39 appliquées,
dernière : `082_ai_batch_jobs`).

Points d'attention à re-vérifier systématiquement : cohérence essai affiché vs `TRIAL_DAYS`,
preuve sociale véridique, logs des crons brief, état de la décision de trajectoire.

---

*Audit réalisé le 21 juillet 2026 — ancré dans le code, la prod Supabase et la CI, sans
complaisance. Prochain audit recommandé : à la prochaine étape de traction ou avant toute
discussion de cession.*
