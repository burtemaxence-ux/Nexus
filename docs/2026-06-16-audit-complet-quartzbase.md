# AUDIT COMPLET — QUARTZBASE

**Date :** 16 juin 2026
**Méthode :** audit externe exigeant, ancré dans le code réel du repo (`burtemaxence-ux/nexus`), pas sur les déclarations marketing.
**Posture :** sans complaisance. Quand c'est bon, je le dis. Quand c'est cassé, je le dis plus fort.

> ⚠️ **Avertissement liminaire — écarts spec/code.** Le brief d'audit décrit un produit qui n'est pas exactement celui qui est codé. J'ai trouvé 4 écarts matériels entre ce qu'on m'a dit et ce que fait le code. Ils sont signalés 🔺 tout au long du rapport. C'est le premier signal de maturité à corriger : **la doc commerciale et le code divergent.**

| # | Sujet | Brief / marketing | Code réel | Gravité |
|---|-------|-------------------|-----------|---------|
| 🔺1 | Essai gratuit | « 14 jours » | Stripe reçoit `trial_period_days: 30` ; l'UI billing calcule 14 j depuis `created_at` | 🔴 incohérence visible client |
| 🔺2 | Parrainage | −15 %/filleul ×5, max −75 % | `REFERRAL_MAX_ACTIVE = 2`, `MAX_DISCOUNT = 30` (max −30 %) | 🟠 spec obsolète |
| 🔺3 | Quota IA | « Vercel KV » | Table Postgres `ai_usage` + RPC `consume_ai_credit` (fail-closed) | 🟢 le code est meilleur que la spec |
| 🔺4 | Modèle IA | « claude-sonnet-4-6 » partout | Sonnet pour planning/docs ; **Haiku** (`claude-haiku-4-5`) pour briefs/scoring/compliance | 🟢 choix sain, mais à documenter |

---

## PARTIE 1 — PRODUIT & POSITIONNEMENT — **14/20**

**Justification :** périmètre fonctionnel exceptionnellement complet pour un MVP solo (planning drag&drop, conformité codée, IA, marketplace d'échange, pointage inter-jour, parrainage Stripe réel, PWA). Mais le positionnement n'est pas tranché : Quartzbase se présente comme « Skello en moins cher », ce qui est la pire place sur un marché où Skello a 8 ans d'avance et un réseau commercial. La vraie pépite — la **conformité légale codée et testée** (`lib/compliance/rules.test.ts` couvre 8 règles : repos 11h, 48h/sem, pause >6h, jours consécutifs, travail dominical/nuit) — n'est pas mise au centre.

### 3 forces
1. **Conformité-as-code réelle et testée.** 8 règles du droit du travail français sont implémentées et couvertes par des tests unitaires. C'est le seul module avec une vraie couverture de tests. C'est *le* différenciateur défendable.
2. **Profondeur fonctionnelle anormale pour un solo dev de 19 ans.** Marketplace d'échange de shifts, SOS-remplacement avec scoring IA, pointage qui gère la clôture inter-jour (`git: « Pointage: clôture inter-jour + flag anomalie »`), audit log, exports PDF, API publique `/api/v1`. Beaucoup de SaaS financés font moins.
3. **IA correctement bridée.** Le quota est fail-closed côté Postgres (atomique, non-bypassable) — ce n'est pas un gadget mal câblé.

### 3 faiblesses
1. **Positionnement « moins cher que Skello » = piège.** À 49 €/mois vs ~500 €/an Skello, tu sembles 20 % moins cher seulement, sans le réseau, les intégrations paie, ni la marque. Le prix n'est pas un positionnement.
2. **L'IA auto-planning est un argument faible pour une boulangerie de 4-8 personnes.** Planifier 6 personnes ne nécessite pas d'IA ; le gérant connaît son équipe par cœur. La valeur IA réelle est dans la **détection de risque légal** (requalification CDD→CDI, Art. L1243-11 codé dans `compliance-check`), pas dans la génération de planning. C'est mal hiérarchisé.
3. **Cible floue : boulangerie ET restaurant.** Ce sont deux métiers, deux conventions collectives, deux rythmes. « Pour boulangeries et restaurants » dilue le message. Choisis-en un pour le lancement.

### Recommandation critique
**Repositionner sur « la conformité qui te protège des prud'hommes », pas sur « le planning malin ».** Un gérant de boulangerie ne se réveille pas la nuit à cause de son planning ; il se réveille à cause d'un contrôle URSSAF ou d'un ex-salarié aux prud'hommes. Tu as codé exactement l'outil qui répond à cette peur — vends *cette* peur. Freemium/trial : 30 jours réels (cf. 🔺1) suffisent dans ce secteur où le cycle de décision est lent ; **14 j est trop court**, 30 j est le bon choix — il faut juste arrêter d'afficher 14.

---

## PARTIE 2 — BRANDING & IDENTITÉ VISUELLE — **11/20**

**Justification :** la palette est techniquement soignée (le commit `e4ffc04 Branding: contrastes WCAG` montre un vrai travail d'accessibilité, rare à ce stade), mais l'ensemble de l'identité parle « SaaS tech B2B SF 2021 » à une cible qui est un artisan de 45 ans levé à 4h. Le dark premium + violet néon est un contresens de cible. Et il reste des résidus « Nexus » dans le produit livré.

### Le nom « Quartzbase »
- **Prononciation FR bancale :** « Quartz » + « base » → « kwartzbaze » ? « kartzbaze » ? Un gérant au téléphone avec un confrère ne saura pas l'épeler.
- **Évocation sectorielle nulle :** quartz = minéral/horlogerie/tech. Zéro lien avec boulangerie, RH ou planning. « base » sent la base de données — jargon dev.
- **Risque de confusion :** proche de « Quartz » (média US), « Airbase », « Coinbase », « Rocketbase »… nom « -base » saturé dans la tech.
- **Verdict :** nom correct pour un outil dev, mauvais pour un artisan. Pas bloquant au point de rebrand en urgence, mais c'est un frein d'adhésion, pas un atout.

### 🔺 Résidu « Nexus » dans le livrable
Le repo s'appelle `Nexus` et il **reste des occurrences « Nexus » dans des emails clients et des webhooks Slack** (welcome, planning, brief manager). Un prospect qui reçoit un email signé « Nexus » alors qu'il s'est inscrit sur « Quartzbase » perd confiance immédiatement. **C'est un bug de branding bloquant pré-lancement.**

### Design system dark + violet #6C63FF
- **Mauvais fit cible.** Le dark premium #0a0a0f séduit les early-adopters tech et les portfolios de dev. Un gérant de boulangerie de 45 ans, sur un écran de caisse en plein jour, avec une presbytie naissante, veut du **clair, contrasté, gros**. Le dark mode par défaut est un choix d'esthète, pas d'utilisateur.
- **Violet néon = registre gaming/crypto/IA**, pas confiance/artisanat/sérieux administratif.

### Typo Syne + DM Sans
- **Syne** (titres) : display géométrique « art/creative tech ». Très 2022 sur Behance, déroutant pour un PME artisan. DM Sans en corps est un bon choix neutre et lisible.
- **Verdict :** garde DM Sans, **abandonne Syne** au profit d'une grotesque plus sobre et institutionnelle (Inter, Geist, ou même garder DM Sans en titres).

### Palette & accessibilité
- Vert #00D4AA / rouge #FF6B6B / jaune #FFB347 : harmonie correcte, mais **#FFB347 (jaune) et #00D4AA (vert) sur fond clair échouent WCAG AA** pour du texte. Le travail WCAG du commit `e4ffc04` doit être vérifié sur ces deux teintes en usage texte.

### Plan d'amélioration branding
**3 ajustements prioritaires :**
1. **Proposer un thème clair par défaut** (le dark en option). Test imparable : montre l'app à 3 gérants de >40 ans et regarde-les plisser les yeux.
2. **Purger 100 % des « Nexus »** dans emails + webhooks + manifest PWA. P0 absolu.
3. **Adoucir l'accent :** descendre le violet vers un bleu-indigo plus institutionnel (#4F46E5 type) ou un vert « confiance » ; réserver le néon aux micro-accents.

**Variation de palette suggérée (thème clair) :** fond #F8F9FB, texte #0F172A, primaire indigo #4F46E5, succès #0E9F6E (WCAG-safe), danger #DC2626, neutre slate. Conserve le dark comme « mode pro/nuit ».

**Logo/nom :** pas de rebrand d'urgence, mais teste une baseline qui compense l'absence d'évocation du nom : *« Quartzbase — planning & conformité pour la restauration »*. La baseline fait le travail que le nom ne fait pas.

---

## PARTIE 3 — LANDING PAGE — **13/20**

**Justification :** structure Ottho complète et propre (hero → réassurance → features → preuve sociale → comparatif → pricing → FAQ/CTA), JSON-LD/SEO présents (`app/page.tsx`). Mais elle vend le « planning » avant la « protection légale » (mauvaise hiérarchie), le comparatif Skello est un risque juridique, et il manque les éléments de réassurance lourds (démo, garantie, logos).

### Analyse
- **Narration :** bon chemin de conversion, mais l'ordre des arguments est inversé. Aujourd'hui : planning → gain de temps → IA. **Ordre à conversion supérieure : peur légale → preuve de protection → gain de temps → IA en bonus.**
- **CTA « Essayer 14 jours gratuit » :** 🔺 mensonger (le code donne 30 j). Et « Essayer » est faible. Mieux : **« Tester gratuitement 30 jours — sans carte bancaire »** (le « sans CB » est déjà vrai d'après l'email welcome, c'est un énorme réducteur de friction, exploite-le).
- **Comparatif Skello :** 🟠 **risque juridique réel.** La publicité comparative est légale en France (Art. L122-1 Code conso) *mais strictement encadrée* : elle doit être objective, vérifiable, non trompeuse, et porter sur des caractéristiques essentielles. Un tableau « Quartzbase ✅ partout / Skello ❌ » est attaquable pour concurrence déloyale/dénigrement. **À conserver uniquement si chaque ligne est factuelle, sourcée et datée.** Sinon, le retirer.
- **Pricing :** 49 €/mois est sous-valorisé visuellement si on n'ancre pas le coût d'un seul redressement prud'hommal (souvent >10 000 €). **Ancre le prix contre le risque, pas contre Skello.**
- **Témoignages :** 2, c'est le minimum vital et insuffisant pour un sceptique. Il faut un témoignage qui dit un chiffre (« j'ai économisé X h/semaine » ou « évité un litige »).
- **Éléments manquants :** vidéo démo de 60 s (critique pour non-tech), garantie « satisfait ou remboursé 30 j », logos clients (même 3), mention RGPD/hébergement France, FAQ « et si je veux partir ? » (export de données).

### Plan d'amélioration — 5 corrections priorisées par impact conversion
1. **Réécrire le hero autour de la peur légale** (impact ++ ; c'est le message qui résonne).
2. **Ajouter une vidéo démo 60 s** « créer un planning conforme en 2 min » (impact ++ ; lève l'angoisse du non-tech).
3. **Corriger le CTA → 30 j sans CB** (impact + ; cohérence + friction).
4. **Ajouter garantie remboursement + badge hébergement France/RGPD** (impact + ; réassurance).
5. **Durcir ou retirer le comparatif Skello** (impact sur le risque, pas la conv ; à faire avant tout trafic payant).

**1er A/B test à lancer :** **headline.** Variante A (actuelle, planning/temps) vs Variante B (conformité/protection). C'est le test au plus fort levier ; tout le reste en découle.

**Nouveau wording hero proposé :**
> **Headline :** « Un planning qui vous protège des prud'hommes. »
> **Subline :** « Quartzbase planifie vos équipes en respectant automatiquement les 7 règles du droit du travail (repos, durée max, pauses, requalification CDD). Conforme, signé, archivé. Testez 30 jours, sans carte bancaire. »

---

## PARTIE 4 — ESPACE MANAGER — **14/20**

**Justification :** complétude impressionnante — ~30 routes manager (`/manager/planning`, `/employees`, `/conges`, `/echanges`, `/marketplace`, `/replacements`, `/presences`, `/compliance`, `/alertes`, `/audit-log`, `/analytics`, `/rapport`, `/parrainage`, + 14 pages de settings). Le risque n'est pas le manque, c'est le **trop-plein** : un gérant de boulangerie n'a pas besoin de 14 écrans de paramètres. Sur-ingénierie pour la cible.

### Complétude des KPIs
- **Présents :** dashboard avec count-up, analytics, rapports, donut charts (`recharts`).
- **Manquants pour la cible :** **coût de la masse salariale prévisionnelle de la semaine** (le seul KPI qu'un gérant regarde vraiment : « ce planning me coûte combien ? »), ratio heures planifiées vs contractuelles, alertes d'heures sup à payer. Sans le coût €, le dashboard est joli mais pas décisionnel.

### Les 6→7 crons : utilité réelle
| Cron | Fréquence | Verdict |
|------|-----------|---------|
| `weekly-brief-manager` (lundi 7h) | 1×/sem | ✅ **Très utile** — résumé Haiku 5 phrases par email. C'est le bon usage de l'IA. |
| `compliance-check` (dim 22h) | 1×/sem | ✅ **Le plus utile** — détecte requalifications CDD/CDI, dépassements. Cœur de valeur. |
| `trial-reminder` (quotidien 9h) | 1×/j | ✅ Utile (revenue) — cooldown 24h propre. |
| `referral-activation` (quotidien 2h) | 1×/j | ✅ Nécessaire au parrainage. |
| `check-missing-clockout` (23h) | 1×/j | 🟡 Utile mais notifie sans forcer (cf. P5). |
| `check-replacements` (22h) | 1×/j | 🟡 Pertinent si la marketplace est utilisée — pari incertain (cf. P5). |
| `weekly-summary-employee` (ven 18h) | 1×/sem | 🟠 **Superflu au lancement** — un résumé hebdo IA pour un employé de boulangerie ? Faible valeur perçue, coût IA réel. À couper jusqu'à preuve d'usage. |

**Brief manager :** conceptuellement bien fait (bilan présence, anomalies, alertes légales, point positif, reco). Le risque : 5 phrases générées par IA peuvent halluciner un chiffre. **Doit citer des données vérifiables, pas paraphraser.**

### Gestion des congés
Workflow complet et propre : demande employé → `pending` → validation/refus manager (+ commentaire) → email Resend + push/SMS → impact planning. RLS scoped établissement. **C'est un des modules les plus aboutis.**

### /billing
Logiquement placé (`/manager/settings/billing` + accès 1 clic ajouté au commit `3ca0212`). 🔺 **MAIS** cette page affiche un essai de **14 jours** calculé depuis `created_at`, alors que Stripe en accorde 30. Un gérant verra « essai expiré » alors qu'il lui reste 16 jours. **Bug de confiance à corriger d'urgence.**

### 5 points de friction pour un gérant non-tech
1. **14 écrans de settings** → paralysie. Où est « ajouter un employé » vs « convention collective » vs « règles » ?
2. **Onboarding initial vide** : créer le 1er établissement + 1ers employés + 1er planning à la main = mur d'entrée. L'email welcome liste 3 étapes mais l'app doit les guider (wizard).
3. **Drag & drop sur mobile** : `@dnd-kit` avec `PointerSensor` — le drag d'un shift au doigt sur un téléphone est notoirement frustrant. Un gérant qui fait son planning dans le métro va galérer.
4. **Le « blocage doux » de conformité** (commit `fe13cda`) : si le gérant ne comprend pas *pourquoi* la publication est freinée, il sera bloqué sans solution.
5. **Incohérence trial 14/30 j** → appel au support dès la 2e semaine.

### 3 améliorations prioritaires
1. **Wizard d'onboarding** (établissement → employés → 1er planning IA) en 5 minutes.
2. **KPI « coût masse salariale de la semaine »** sur le dashboard.
3. **Réduire les settings de 14 à ~5 écrans** (regrouper) + corriger l'affichage du trial.

---

## PARTIE 5 — ESPACE EMPLOYÉ — **13/20**

**Justification :** périmètre employé complet (planning perso, badgeuse, congés, échanges, marketplace, notifications, PWA, push web). Le pointage est solide (clôture inter-jour, flag anomalie >16h, rate-limit). Mais l'adoption employé est le vrai mur, et la marketplace d'échange est un pari sectoriel discutable.

### Complétude
Suffisant : planning, échange, congés, pointage avec pauses, notifications push. Le pointage gère de vrais edge cases : récupère le dernier pointage actif quel que soit le jour (oubli overnight), refuse `clock_out < clock_in`, flag `needs_review` si durée >16h. **Bien pensé.**

### Ergonomie mobile PWA
PWA + web-push présents. Bon, car les employés sont 100 % mobile. **Mais** : pas de cron auto-clockout — si l'employé oublie de pointer la sortie *et* ignore la relance push de 23h, le pointage reste ouvert et fausse les heures. Le système notifie, **ne corrige pas**.

### Shift exchange marketplace — pari discutable
- **Réalité sectorielle :** dans une boulangerie de 5 personnes, les échanges se font *de vive voix* (« tu peux prendre mon samedi ? »). Un marketplace formalisé avec workflow `open → pending_approval → approved` est **sur-dimensionné pour une TPE**. Pertinent à partir de ~15-20 employés (gros restaurant, chaîne), pas une boulangerie.
- 🔴 **Bug d'isolation tenant détecté :** la table `shift_exchanges` **n'a pas de colonne `establishment_id`**. Les policies RLS reposent uniquement sur le rôle + `uid`. **Un manager de l'établissement A pourrait voir/valider des échanges de l'établissement B.** À corriger avant tout client multi-site. (Détail en P9.)

### Notifications
Présentes : push web, in-app, email (congés/planning), SMS (congés si téléphone). **Manque :** notification de publication de planning *en push* (l'email seul ne suffit pas pour un employé mobile), rappel de shift J-1.

### 3 risques d'adoption employé
1. **« Pourquoi je téléchargerais une app pour mon patron ? »** — l'employé ne paie pas, ne choisit pas. Sans bénéfice clair *pour lui*, il ne l'installe pas.
2. **Friction d'installation PWA** — « ajouter à l'écran d'accueil » est obscur pour beaucoup. Taux d'installation faible attendu.
3. **Pointage = surveillance perçue.** Le clock-in/out peut être vécu comme du flicage. Si mal introduit, rejet.

### Plan d'onboarding employé recommandé
- **Le bénéfice employé d'abord :** « consulte ton planning et pose tes congés depuis ton tél, sans demander au patron ». C'est *ça* l'accroche, pas le pointage.
- **Invitation par SMS** (pas email — taux d'ouverture) avec lien magique → pas de mot de passe à créer.
- **1er écran = planning de la semaine**, pas un formulaire. Valeur immédiate.
- **Pointage introduit en J+7**, une fois l'app adoptée pour le planning.
- **Le gérant onboarde son équipe en 2 min** lors d'un service (QR code affiché en salle de pause).

---

## PARTIE 6 — SYSTÈME D'AFFILIATION / PARRAINAGE — **13/20**

**Justification :** techniquement **bien plus solide que la moyenne** — vraies remises Stripe (coupons `percent_off`, pas du bricolage), cron d'activation à J+30, gestion du churn filleul, anti-auto-parrainage et anti-doublon implémentés (`lib/referral.ts`). Le commit `f61cab1 « Affiliation fonctionnelle: remise Stripe réelle, activation, churn »` n'est pas du vaporware. **MAIS** la spec du brief est obsolète, il y a un cumul trial+coupon non maîtrisé, et le churn du parrain n'est pas géré.

### Mécanique économique
- 🔺 **Le brief dit −75 % max (×5). Le code dit −30 % max (×2)** (`REFERRAL_MAX_ACTIVE = 2`). Et un commentaire de code l'assume : *« the previous −75 % cap was financially unsustainable »*. **Bonne décision** : −75 % sur un abonné, c'est vendre à perte (le coût d'infra + IA + Stripe dépasse 25 % du prix). −30 % est soutenable. **Le brief/marketing doit être mis à jour**, sinon promesse non tenue = risque de réclamation.
- **Seuil de douleur :** même à −30 %, si la majorité des abonnés atteignent 2 filleuls actifs, le revenu net/abonné chute de 30 % — à modéliser. Tant que <20 % des clients sont des « super-parrains », c'est OK.
- **Délai 30 j filleul :** bien calibré — assez long pour filtrer les faux comptes, assez court pour récompenser.
- 🔺 **Risque de churn post-cadeau ET cumul non maîtrisé :** le code donne au filleul `trial_period_days: 30` **+** un coupon `qz-referral-firstmonth` (100 % off, `duration: once`) appliqué à la 1ère facture *après* le trial. Résultat : **~60 jours gratuits**, pas 30. Personne ne semble l'avoir voulu. Double cadeau = churn élevé au moment où la 1ère vraie facture tombe (J+60), et marketing qui annonce « 1er mois gratuit » alors que le code en donne deux.

### Mécanique Stripe
- **Coupons (pas Promotion Codes) = bon choix** pour des remises dynamiques appliquées par le système. Le code crée/réutilise `qz-referral-{pct}pct` avec `duration: 'forever'` et **remplace** le coupon à chaque changement du nombre de filleuls (Stripe n'empile pas les coupons — limitation correctement gérée).
- **Récurrent mensuel/annuel :** `percent_off` + `duration: forever` s'applique à chaque facture, mensuelle comme annuelle. ✅ Correct. *Attention :* −30 % sur un annuel à 890 € = −267 €/an récurrent — vérifier que c'est intentionnel sur l'annuel et pas seulement pensé pour le mensuel.
- **Filleul churne avant 30 j :** ✅ géré. Webhook `subscription.deleted/updated` → `churnReferral()` → status `churned` → `applyReferralDiscount()` recalcule la remise parrain. Le parrain ne gagne rien tant que le filleul n'a pas 30 j payants. Correct.
- 🔴 **Parrain churne : NON géré.** Si le parrain résilie, ses filleuls gardent leur lien de parrainage indéfiniment ; la remise disparaît avec l'abonnement, mais s'il se réabonne il récupère la remise. Trou logique, pas dangereux financièrement, mais à border.

### Expérience utilisateur
- **Suivi temps réel parrain :** ✅ `/manager/parrainage` affiche filleuls actifs / en attente / churned, % de remise, barre de progression vers le max, code + URL copiables. Fetch server-side à chaque visite (pas de polling, mais suffisant). **Bien fait.**
- 🔺 **Information filleul :** le code applique en réalité le cadeau au checkout (pas « après 30 j »). La promesse marketing « 1er mois gratuit après 30 jours d'activation » **ne correspond pas** au comportement réel (60 j gratuits dès l'inscription). À aligner.
- **Abus :** anti-auto-parrainage ✅ et anti-doublon (un filleul = un seul parrain) ✅ implémentés. **MAIS** rien contre les **comptes fictifs** : un parrain peut créer N faux comptes, les laisser tourner 30 j (en trial gratuit !) et accumuler de la remise. Le trial gratuit de 30 j rend l'abus *gratuit*. Risque réel à petite échelle.

### Verdict final affiliation
**Oui, le système fonctionne techniquement** — et bien mieux que ce à quoi on s'attend d'un solo dev. Mais il y a un décalage spec/code et un cumul de cadeaux non maîtrisé.

**3 checks impératifs en prod :**
1. **Vérifier le cumul trial 30 j + coupon 100 % :** est-ce 30 ou 60 jours gratuits voulus ? Aligner code ET marketing.
2. **Tester un cycle complet réel :** filleul s'inscrit → J+30 cron → remise parrain visible dans Stripe sur facture mensuelle *et* annuelle.
3. **Brancher une détection d'abus minimale :** alerte si un même parrain génère >3 filleuls en <14 j, ou même IP/empreinte.

---

## PARTIE 7 — VALEUR M&A / REVENTE — **10/20**

**Justification :** la note basse n'est pas un jugement sur la qualité du code (qui est bonne), mais sur la **réalité de revente actuelle**. À 0-10 clients, avec un fondateur solo qui part à la gendarmerie en septembre 2026, Quartzbase n'est pas une *entreprise* vendable — c'est un *actif technique + un fondateur*, et le fondateur s'en va. C'est le facteur qui plafonne tout.

### Attractivité acquéreur
- **Profil d'acquéreur réaliste :** **pas** un fonds (trop petit), **pas** Skello (pourquoi acheter 10 clients qu'ils prennent gratis ?). Les candidats crédibles : (a) un **éditeur de logiciel de caisse/paie CHR** qui veut une brique planning (Zelty, Tiller, L'Addition, Combo) ; (b) un **cabinet d'expertise-comptable CHR** qui veut un outil maison ; (c) un **acqui-hire** — quelqu'un qui achète surtout *Maxence* et le code, pas le MRR.
- **Ce qui augmente la valeur au-delà du MRR :** la **conformité-as-code testée** (vraie IP, difficile à refaire), le **code propre et typé** (Next 14, RLS, tests sur le module critique), le **domaine quartzbase.fr**, et une **base de connaissances sectorielle** (les 7 règles encodées = du savoir métier).
- **Ce qui effraie un acquéreur :** 🔴 **fondateur solo qui part** (continuité = zéro), dépendance totale à 5 services tiers (Supabase/Vercel/Anthropic/Stripe/Resend), **0 à 10 clients = 0 preuve de rétention/PMF**, migrations critiques peut-être non appliquées en prod (042/044/045), tests à ~2 % de couverture hors compliance, et un **bus factor de 1**.

### Multiples de valorisation
Pour un micro-SaaS vertical FR pré-PMF, **on ne valorise pas en multiple d'ARR** (les multiples 3-8× ARR concernent des SaaS >1 M€ ARR avec rétention prouvée). À ce stade c'est une valo **d'actif / acqui-hire**.

Hypothèse de mix : 70 % Essentiel / 30 % Pro, remises parrainage ~−10 % moyenne → **ARR net ≈ 600 €/client/an.**

| Clients | ARR net (~) | Valo réaliste | Logique |
|---------|------------|---------------|---------|
| 0 | 0 € | **15-40 k€** | Coût de reconstruction du code + domaine. Pure valeur d'actif. |
| 10 | ~6 k€ | **20-50 k€** | Code + amorce de preuve. Multiple ARR non pertinent ; c'est l'actif qui porte. |
| 25 | ~15 k€ | **45-90 k€** | Début de signal PMF si rétention >85 %. ~3× ARR plancher. |
| 50 | ~30 k€ | **90-180 k€** | Preuve de répétabilité. 3-6× ARR *si* churn faible et croissance nette positive. |

**Comparaison Skello :** non comparable au même « stade ». Skello (fondé ~2016) a levé ~6 M€ en Série A (2019) puis ~40 M€ en Série B (2021) sur une base de **milliers d'établissements** et une équipe de dizaines de personnes. Le point commun s'arrête au secteur. Skello à 10 clients n'a jamais été « vendu » — il a été *financé* sur une trajectoire, pas sur un actif. Quartzbase joue un autre jeu : actif, pas trajectoire.

### Plan pour maximiser la valeur — 5 actions AVANT de vendre
1. **Atteindre 25-50 clients avec rétention >85 % sur 3 mois.** Sans rétention prouvée, tu vends du code, pas une entreprise. C'est le levier #1 de valeur.
2. **Documenter et dérisquer la dépendance fondateur** : runbooks, doc d'archi (il y en a déjà dans `.claude/` et `docs/`), accès, secrets, procédures. Un acquéreur paie pour ce qu'il peut reprendre sans toi.
3. **Appliquer et certifier les migrations 042/044/045** + ajouter `establishment_id` à `shift_exchanges`. Une faille RLS découverte en due diligence tue le deal.
4. **Sécuriser l'IP de conformité** : packager le module `lib/compliance` comme l'actif phare, documenté, étendu à 10+ règles. C'est ce qui n'est pas réplicable en un week-end.
5. **Formaliser le support et les SLA** (même minimal) — un acquéreur veut savoir que les clients ne fuiront pas le lendemain.

**Timing optimal :** **avant septembre 2026** (départ gendarmerie) en mode acqui-hire si tu veux valoriser ton implication ; **OU** après avoir atteint 50 clients + rétention prouvée + transition documentée si tu veux vendre l'actif sans toi. Vendre entre les deux (10-25 clients, sans toi, sans rétention) = bradage.

---

## PARTIE 8 — PLAN DE LANCEMENT & GO-TO-MARKET — **13/20**

**Justification :** l'angle « 19 ans, fils de boulanger(?)/proche du métier, fondateur SaaS » est un actif narratif rare et exploitable. Le plan ci-dessous est réaliste à budget zéro. La note médiane reflète le risque d'exécution solo en parallèle d'une vie qui bascule vers la gendarmerie en septembre.

### Phase 1 — Semaines 1-2 : amorce locale (0 €)

**Script pour convertir le patron de la boulangerie de Maxence (client #1) :**
> « [Prénom], j'ai construit un logiciel qui fait les plannings *et* qui vérifie tout seul que t'es en règle avec le droit du travail — repos de 11h, les 48h, les pauses, et surtout il t'alerte avant qu'un CDD doive passer en CDI. Je te l'installe gratuitement, je mets ton équipe dedans en 10 minutes, et tu me dis dans 2 semaines si ça te fait gagner du temps. En échange, si ça te plaît, tu me laisses faire une vidéo de 30 s où tu dis ce que t'en penses. Deal ? »

**Méthode 3-5 établissements test en 2 semaines :**
- Liste les 10 boulangeries/restos dans un rayon de 5 km que Maxence connaît de près ou de loin.
- Porte-à-porte physique à 15h (creux d'activité), pas d'email. Démo live sur tél, 5 min.
- Offre « installé pour vous, gratuit 3 mois, je reprends vos plannings actuels ».
- Objectif : 5 démos → 3 installés.

**À capturer pour le contenu :**
- Vidéo témoignage 30-60 s (le patron, en tablier, dans sa boulangerie).
- Avant/après : temps passé sur le planning (« 2h le dimanche soir → 20 min »).
- Screenshot d'une vraie alerte de conformité déclenchée (anonymisée).

### Phase 2 — Semaines 3-6 : TikTok + LinkedIn

**Format TikTok qui marche pour ce SaaS :**
- **Pas de démo produit.** Du **storytelling métier** : « POV : t'es boulanger et tu découvres que ton serveur en CDD aurait dû passer en CDI il y a 2 mois » → caméra sur toi → « voilà comment mon logiciel l'aurait évité ». Hook émotionnel (peur) + résolution (produit) en 20 s.
- Format « build in public » : « J'ai 19 ans, je code un logiciel pour les boulangers, jour 47 ».

**Stratégie LinkedIn (gérants de chaînes/franchises/groupes CHR) :**
- Poste 3×/semaine sur l'angle conformité + chiffres (« 30 % des contrôles URSSAF CHR finissent en redressement »).
- DM personnalisés aux DRH/responsables d'exploitation de groupes (pas de pitch immédiat, apporte une valeur : un mini-audit conformité gratuit).

**Angle « 19 ans, proche du métier, fondateur SaaS » :**
C'est ton arme la plus forte. *« Le fils du quartier qui a appris à coder pour aider son boulanger. »* Authenticité > polish. Les artisans achètent à des gens, pas à des startups.

**3 idées de posts viraux :**
1. **Hook :** « Cette boulangerie a failli payer 18 000 € aux prud'hommes. À cause d'une ligne dans un planning. » → structure : le cas → l'erreur (requalification CDD) → comment l'éviter → soft CTA.
2. **Hook :** « J'ai 19 ans et je facture des boulangeries. Voici comment j'ai signé mon 1er client en frappant à sa porte. » → behind-the-scenes → preuve (capture MRR) → leçon.
3. **Hook :** « Le droit du travail français a 7 règles que 90 % des restaurateurs violent sans le savoir. » → énumère 3 règles chocs → « mon logiciel les vérifie tout seul » → CTA.

### Phase 3 — Semaines 7-12 : canal expert-comptable CHR

**Approche (email + LinkedIn) :**
> « Bonjour [Nom], vos clients CHR vous appellent sûrement en panique sur les requalifications CDD et les heures sup. J'ai un outil qui détecte ces risques automatiquement dans leurs plannings. Je propose à 3 cabinets partenaires de l'offrir à leurs clients (vous y gagnez en valeur perçue + une commission sur chaque abonnement). 15 min pour vous montrer ? »

**Proposition partenariat :** **20-25 % de commission récurrente** sur les abonnements apportés (ou marque blanche légère). L'expert-comptable CHR est *le* prescripteur idéal : il a la confiance + le portefeuille + la douleur exacte.

**Objectif : pipeline 20+ prospects qualifiés** via 5-8 cabinets contactés.

### Métriques de succès
| Échéance | Cible |
|----------|-------|
| Semaine 2 | Client #1 signé (la boulangerie de Maxence) |
| Semaine 6 | 5 clients + 1 000 vues TikTok + 3 prospects expert-comptable |
| Semaine 12 | 15 clients, MRR >1 000 €, 2 cabinets partenaires |

**Réserve honnête :** ce plan demande ~20 h/semaine d'exécution commerciale en plus du code. Difficilement tenable en solo, et **incompatible avec l'entrée en gendarmerie**. Le plan est bon ; la question est *qui l'exécute après septembre*.

---

## PARTIE 9 — RISQUES CRITIQUES — **9/20**

**Justification :** note basse car les risques les plus graves (départ fondateur, migrations sécurité possiblement non appliquées, fuite tenant `shift_exchanges`, support inexistant) sont **réels, identifiés, et non encore traités**. Le produit est bon ; la gestion du risque est en retard sur la qualité du code.

### Matrice des risques (probabilité × impact)

| Risque | Prob. | Impact | Score | Catégorie |
|--------|-------|--------|-------|-----------|
| 🔴 **Départ fondateur (gendarmerie sept. 2026)** | Certaine | Critique | **CRITIQUE** | Business |
| 🔴 **Migrations 042/044/045 non appliquées en prod** | Moyenne | Critique (fuite tokens API, employés modifient settings, manager s'auto-ajoute à un établissement) | **CRITIQUE** | Technique/Sécu |
| 🔴 **`shift_exchanges` sans `establishment_id`** | Élevée si multi-site | Élevé (fuite inter-tenant) | **CRITIQUE** | Technique/Sécu |
| 🟠 Support inexistant (bug à 5h du matin) | Élevée | Élevé | Haut | Business |
| 🟠 Dépendance 5 services tiers sans plan B | Faible/unité, élevé/cumul | Élevé | Haut | Technique |
| 🟠 Responsabilité juridique conformité (planning illégal validé) | Moyenne | Élevé | Haut | Légal |
| 🟡 Comparatif Skello (pub comparative déloyale) | Moyenne | Moyen | Moyen | Légal |
| 🟡 Skello riposte (freemium/baisse prix) | Faible | Moyen | Moyen | Business |
| 🟡 RGPD données planning/présence | Certaine (traitement) | Moyen | Moyen | Légal |
| 🟢 Tests ~2 % hors compliance (régressions) | Élevée | Faible/unité | Moyen | Technique |

### Détail risques techniques
- **Services tiers :** aucun n'a de SLA grand public garanti sur le plan gratuit/standard. Supabase down = app down (pas de réplication). Anthropic down = IA/briefs HS (mais fail-closed propre : 503, pas de corruption). **Aucun plan de continuité.**
- **Scalabilité RLS :** le multi-tenant via `establishment_id` + `current_establishment_id()` tient *fonctionnellement* à 1 000 établissements (Postgres encaisse), **à condition que les index de perf (migrations 051) soient appliqués**. Le commit `3832dbe Perf indexes` existe — mais 051 est marquée « APPLY MANUALLY ». À vérifier.
- **Migrations manuelles :** c'est le risque technique #1. Trois migrations *de sécurité* portent « APPLY MANUALLY in Supabase SQL Editor ». Si elles ne sont pas appliquées : tokens API lisibles par tout utilisateur authentifié (042), employés qui modifient les réglages (044), manager qui s'ajoute à n'importe quel établissement (045). **Indéterminable sans accès DB — donc à certifier immédiatement.**
- **Quota IA si store indisponible :** ✅ géré proprement — fail-closed (503), pas de bypass. Bien. (🔺 et non « Vercel KV » : c'est Postgres.)

### Détail risques business
- **Skello riposte :** tu ne gagneras pas sur le prix face à un acteur financé. Ta seule défense est la **niche + la proximité + la conformité**. Ne te bats pas sur leur terrain.
- **Départ gendarmerie sept. 2026 :** 🔴 **le risque existentiel.** Que dire aux clients ? Rien de bricolé. Soit tu organises une transition (associé/repreneur), soit tu vends avant, soit tu assumes un mode maintenance minimal. **Vendre un SaaS à des artisans puis disparaître = casse de confiance et risque réputationnel.** À trancher *maintenant*, pas en août.
- **Support inexistant :** un gérant bloqué à 5h avant l'ouverture et personne ne répond = résiliation + bouche-à-oreille négatif dans un milieu où tout le monde se connaît. Il faut au minimum une FAQ solide + un canal (WhatsApp Business ?) avec délais annoncés.

### Détail risques légaux
- **Responsabilité conformité :** 🔴 **le plus sous-estimé.** Si le SaaS valide (ou n'alerte pas sur) un planning illégal et que le gérant se fait redresser, **qui est responsable ?** Le « blocage doux » (commit `fe13cda`) aggrave l'ambiguïté : tu *signales* mais laisses publier. Il faut des **CGU blindées** : Quartzbase fournit une *aide à la décision*, pas un *conseil juridique* ; le gérant reste seul responsable. Sans cette clause, tu portes un risque juridique disproportionné pour un solo.
- **Comparatif Skello :** publicité comparative légale mais encadrée (cf. P3). Risque de dénigrement si non factuel/sourcé.
- **RGPD :** les horaires/présences ne sont **pas** des données « sensibles » au sens de l'Art. 9 RGPD (qui vise santé, religion, etc.), mais ce sont des **données personnelles** soumises au régime général : base légale (contrat de travail), registre de traitement, durée de conservation, droit d'accès/effacement. Les pages `/legal/*` et `/api/rgpd/*` existent — bon point. À faire auditer.

### 3 risques critiques à adresser IMMÉDIATEMENT
1. **Certifier les migrations 042/044/045 en prod** (requête `information_schema` sur les policies) — sécurité.
2. **Trancher la continuité post-gendarmerie** (vendre / transmettre / maintenance) — existentiel.
3. **Ajouter `establishment_id` à `shift_exchanges` + CGU de non-responsabilité conformité** — sécurité + légal.

---

## PARTIE 10 — RAPPORT FINAL & SCORECARD

| Dimension | Note /20 | Statut |
|-----------|----------|--------|
| Produit & Positionnement | 14 | 🟢 Solide, positionnement à recentrer |
| Branding & Identité | 11 | 🟠 Mauvais fit cible + résidus « Nexus » |
| Landing Page | 13 | 🟢 Structure bonne, hiérarchie à inverser |
| Espace Manager | 14 | 🟢 Très complet, sur-ingénieré |
| Espace Employé | 13 | 🟢 Solide, mur d'adoption |
| Système d'Affiliation | 13 | 🟢 Techniquement bon, spec obsolète |
| Valeur M&A / Revente | 10 | 🟠 Actif réel, mais non vendable « as is » |
| Plan Go-to-Market | 13 | 🟢 Réaliste, risque d'exécution solo |
| Gestion des Risques | 9 | 🔴 Risques graves non traités |
| **TOTAL** | **110 / 180** | **🟠 Bon produit, entreprise immature** |

### Verdict global
Quartzbase est un produit **techniquement remarquable pour un solo dev de 19 ans** — conformité-as-code testée, parrainage Stripe réel, multi-tenant RLS, pointage robuste. Il peut se vendre **à des artisans CHR via la peur des prud'hommes**, et le bon canal est l'expert-comptable, pas la pub. Mais ce n'est pas encore une *entreprise* : 0 client prouvé, fondateur qui part à la gendarmerie en septembre, migrations de sécurité au statut incertain, support inexistant. La **valeur de revente est réelle mais modeste (15-90 k€ selon traction)** et plafonnée par le départ du fondateur — c'est un acqui-hire ou une vente d'actif, pas une sortie de startup. Sur 90 jours, le ratio effort/récompense est défavorable *si* l'objectif est l'argent, et favorable *si* l'objectif est la preuve (1ers clients + témoignages) qui transforme un projet en actif crédible.

### Top 5 des actions CETTE SEMAINE
1. **Certifier les migrations 042/044/045 en prod.** *Quoi :* requête `information_schema.policies` sur Supabase. *Pourquoi :* fuite potentielle de tokens/settings/tenant. *Mesure :* les 3 policies scoped sont présentes — oui/non.
2. **Aligner trial 14↔30 j + purger « Nexus ».** *Quoi :* corriger `settings/billing/page.tsx` (calcul 30 j depuis Stripe, pas 14 depuis `created_at`) + remplacer toutes les chaînes « Nexus » dans emails/webhooks/manifest. *Pourquoi :* incohérence + perte de confiance visibles client. *Mesure :* 0 occurrence « Nexus » (`grep`), trial cohérent UI/Stripe.
3. **Signer le client #1 (la boulangerie de Maxence) + capturer le témoignage.** *Quoi :* installer, importer leurs plannings, vidéo 60 s. *Pourquoi :* sans preuve sociale, tout le GTM est bloqué. *Mesure :* 1 client actif + 1 vidéo exploitable.
4. **Border le risque conformité : CGU de non-responsabilité + cohérence du « blocage doux ».** *Quoi :* clause « aide à la décision, pas conseil juridique ». *Pourquoi :* exposition juridique disproportionnée. *Mesure :* clause publiée + relue.
5. **Décider la trajectoire post-septembre.** *Quoi :* vendre / transmettre / maintenance — écrire la décision. *Pourquoi :* tout le reste (GTM, clients, valo) en dépend. *Mesure :* une décision écrite, datée.

### 1 conseil que Maxence n'a probablement pas entendu
**Le code n'est pas le problème — il est trop bon pour ce que le projet est réellement.** Tu as passé des centaines d'heures à coder une marketplace d'échange, 7 crons, une API publique, 14 écrans de settings… pour **zéro client**. Tu construis comme si tu avais déjà réussi. La vérité inconfortable : à ton stade, **chaque heure de code supplémentaire détruit de la valeur**, parce que la seule chose qui transforme Quartzbase d'un « beau projet d'un jeune doué » en « actif vendable » est **un client qui paie et qui reste** — et tu n'en as pas un seul. Et il y a pire : tu pars à la gendarmerie dans 3 mois. Donc soit tu arrêtes de coder *aujourd'hui* et tu passes 100 % de ton temps à vendre les 90 prochains jours pour créer la preuve qui donne de la valeur à ton actif avant de partir — soit tu acceptes que ce magnifique projet restera un magnifique projet de CV, jamais une entreprise. Les deux sont des choix respectables. **Mais continuer à coder des features est le seul mauvais choix**, et c'est probablement celui vers lequel ton instinct te pousse.

---

*Audit réalisé le 16 juin 2026 — ancré dans le code du repo, sans complaisance.*
