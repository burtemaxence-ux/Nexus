# Runbook de reprise — Quartzbase

**Destinataire : le repreneur.** Objectif : pouvoir exploiter, déployer et facturer sans
jamais appeler le cédant. À remettre avec le dépôt à la signature.

**Ce document ne réexplique pas ce qui est déjà écrit.** Il fait la couche de *transfert*,
et renvoie à l'existant :

| Pour… | Lire |
|---|---|
| Déployer, variables d'environnement, crons, Stripe, Sentry, healthcheck | `docs/deployment.md` |
| Restauration de sauvegarde (complète et chirurgicale) | `docs/deployment.md` §10 |
| Architecture, schéma de base, routes, conventions | `docs/ARCHITECTURE.md` |
| État des migrations appliquées | `docs/migrations-state.md` |
| État technique audité au 21/07/2026 | `docs/2026-07-21-audit-complet-quartzbase.md` |

> ⚠️ **Erratum sur `docs/deployment.md` §4.** Il indique d'exécuter les migrations
> « 001_initial.sql → 033_performance_indexes.sql ». C'est obsolète : le dépôt contient
> **85 fichiers de migration** et la production en a **48 appliquées** (dernière :
> `20260726084649`, vérifié le 28/07/2026). Se fier à `docs/migrations-state.md` et à
> `npm run check:migrations`, pas à cette phrase.

---

## 1. Comptes à transférer — inventaire complet

Sept services tiers. Aucun n'est optionnel pour faire tourner l'application en l'état.

| Service | Rôle | Transfert | Ce qui casse sans lui |
|---|---|---|---|
| **GitHub** | Dépôt + CI | Transfert de propriété du dépôt (natif) | Rien en prod, mais plus de CI ni de déploiement |
| **Vercel** | Hébergement, crons, KV | Transfert de projet entre équipes, ou redéploiement depuis le dépôt | **Tout** : site et API |
| **Supabase** | Base, Auth, RLS | Transfert d'organisation, ou migration vers un nouveau projet (dump + restore) | **Tout** : données, connexion |
| **Stripe** | Facturation | **Non transférable simplement** — compte lié à une entité légale. Prévoir un nouveau compte et la recréation des 6 Price IDs (procédure : `deployment.md` §8) | Abonnements, paiements |
| **Resend** | Emails transactionnels | Nouveau compte + revalidation du domaine d'envoi (DNS) | Invitations, rappels, briefs |
| **Anthropic** | IA (planning, briefs, chat) | Nouvelle clé API | Génération de planning, briefs, assistant |
| **Twilio** | SMS (invitations employés) | Nouveau compte + numéro | Invitations par SMS uniquement |
| **Sentry** | Monitoring erreurs | Transfert d'organisation ou nouveau projet | Rien de fonctionnel — on perd la visibilité |
| **Registrar `quartzbase.fr`** | Domaine | Code de transfert (AuthInfo) | Le site, les emails, la marque |

**Le point dur, à traiter en premier : Stripe.** C'est le seul service qui ne se transfère
pas d'un compte à l'autre, parce qu'il est adossé à une entité légale et à une vérification
d'identité. Le repreneur doit ouvrir son propre compte, recréer les 6 produits et injecter
les nouveaux Price IDs. Comme il n'y a **aucun abonnement client actif à migrer**, l'opération
est indolore ici — elle ne le serait pas sur un SaaS avec des clients.

---

## 2. Rotation des secrets — obligatoire à la reprise

Tous les secrets ci-dessous ont été connus du cédant. **Aucun ne doit survivre au transfert.**
Liste exhaustive tirée de `.env.example` :

**Accès base et administration** — `SUPABASE_SERVICE_ROLE_KEY` (contourne toutes les
politiques RLS : le secret le plus sensible du projet), `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`

**Argent** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, et les 6 `STRIPE_PRICE_*`

**Automatismes et accès machine** — `CRON_SECRET` (protège les 9 tâches planifiées),
`CALENDAR_SECRET` (signature des flux iCal)

**Services** — `RESEND_API_KEY`, `OPS_RESEND_API_KEY`, `ANTHROPIC_API_KEY`,
`TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`, `KV_REST_API_TOKEN`, `SENTRY_AUTH_TOKEN`,
`SLACK_WEBHOOK_URL`

**Notifications push** — `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
⚠️ **Attention** : regénérer les clés VAPID **invalide tous les abonnements push existants**.
Sans utilisateur, c'est sans conséquence ici — à savoir si le service tourne un jour avec de
vrais abonnés.

**Administration applicative** — `OPERATOR_EMAILS` et `OPS_ALERT_EMAIL` désignent qui a accès
à l'espace opérateur et reçoit les alertes. À basculer sur les adresses du repreneur, sinon
le cédant conserve un accès privilégié après la vente.

Commande de génération pour les secrets maison (`CRON_SECRET`, `CALENDAR_SECRET`) :

```bash
openssl rand -hex 32
```

---

## 3. Ce qui tourne tout seul — et ce qui casse si personne ne regarde

Neuf tâches planifiées, définies dans `vercel.json`, toutes protégées par `CRON_SECRET`
(heures UTC) :

| Tâche | Fréquence | Rôle |
|---|---|---|
| `check-missing-clockout` | tous les jours 23 h | détecte les oublis de pointage |
| `check-replacements` | tous les jours 22 h | relances sur les remplacements ouverts |
| `shift-reminder` | tous les jours 17 h | rappel de service J-1 aux employés |
| `trial-reminder` | tous les jours 9 h | relance de fin d'essai |
| `referral-activation` | tous les jours 2 h | active les remises de parrainage à J+30 |
| `compliance-check` | dimanche 22 h | contrôle de conformité hebdomadaire |
| `weekly-brief-submit` | lundi 6 h 30 | soumet les briefs IA à la Batch API Anthropic |
| `weekly-brief-manager` | lundi 7 h | envoie les briefs générés aux managers |
| `weekly-summary-employee` | vendredi 18 h | récapitulatif hebdo employé |

**Les deux briefs sont couplés** : `weekly-brief-submit` dépose un lot chez Anthropic,
`weekly-brief-manager` le relève 30 minutes plus tard. Si le premier échoue, le second
n'envoie rien — c'est le comportement voulu, pas une panne.

**Les échéances silencieuses à surveiller** (aucune ne déclenche d'alerte) :

- **Le domaine `quartzbase.fr`** — s'il expire, tout tombe et il devient récupérable par
  n'importe qui. C'est la seule perte irréversible du lot.
- **Un projet Supabase sans activité** peut être mis en pause par la plateforme selon le plan
  souscrit. Vérifier le plan avant de laisser dormir.
- **Les clés API** (Anthropic, Resend, Twilio) peuvent être révoquées pour inactivité ou
  impayé.
- **Les crons Vercel** dépendent du plan d'hébergement. Un passage en plan gratuit peut en
  réduire la fréquence ou les désactiver.

---

## 4. Coût d'exploitation mensuel — **≈ 0 €**

Relevé auprès du cédant le 30/07/2026. **L'intégralité de la pile tourne sur des paliers
gratuits.**

| Service | Plan actuel | € / mois | Ce qui ferait monter le coût |
|---|---|---:|---|
| Vercel | Gratuit (Hobby) | **0** | Bande passante, exécutions de fonctions — **et le passage en Pro, obligatoire pour un usage commercial** (voir ci-dessous) |
| Supabase | Gratuit | **0** | Taille de la base, utilisateurs actifs mensuels, bande passante |
| Anthropic (API) | Crédits prépayés — **10 € versés en tout** | **0** | Volume d'appels IA. **Consommation réelle à ce jour : 6 crédits sur toute la vie du projet** (dernier appel le 11/07). Briefs déjà optimisés via Batch API (−50 %) |
| Resend | Gratuit | **0** | Volume d'emails |
| Twilio | Gratuit / non utilisé | **0** | Volume de SMS (invitations employés uniquement) |
| Sentry | Gratuit | **0** | Volume d'événements |
| GitHub | Gratuit | **0** | — |
| Domaine `quartzbase.fr` | Renouvellement annuel | ~1 | Seul décaissement récurrent réel |
| **Total** | | **≈ 0 €/mois** | |

**Non inclus, volontairement :** l'abonnement Claude à 20 €/mois du cédant. C'est un **outil de
développement personnel**, pas une dépendance du produit — l'application n'en a pas besoin
pour tourner, et le repreneur n'en hérite pas. L'inclure gonflerait artificiellement le coût
d'exploitation.

### Ce que ça veut dire pour un repreneur

**L'actif ne coûte rien à détenir.** C'est rare et ça vaut d'être dit : un repreneur peut le
garder en sommeil, prendre son temps pour décider quoi en faire, sans que ça saigne. Sur un
actif sans revenu, c'est précisément ce qui retire le risque.

**Mais les paliers gratuits ne passent pas à l'échelle**, et deux d'entre eux ont une
contrainte à connaître avant de démarrer :

- **Vercel Hobby est réservé à un usage non commercial.** Un repreneur qui exploite
  commercialement doit passer en Pro. À budgéter dès le premier client, pas après.
- **Un projet Supabase gratuit se met en pause après une période sans activité.** Sans
  conséquence tant que rien ne tourne, bloquant le jour où un utilisateur se connecte.

**Le total ci-dessus est donc un plancher d'infrastructure à zéro utilisateur, pas un coût
d'exploitation en charge.** Le présenter comme tel à un acquéreur : il fera lui-même la
projection, et il aura raison de la faire.

### Les tâches planifiées tournent réellement

Vérifié en base le 30/07 : le contrôle de conformité hebdomadaire (`compliance-check`,
dimanche 22 h) a produit ses alertes **le dimanche 26 juillet**. Les tâches planifiées ne
sont pas seulement déclarées dans `vercel.json` — elles s'exécutent en production.

---

## 5. Première semaine du repreneur

1. **Cloner, installer, faire tourner les tests.** `npm install && npm test` → doit afficher
   262 tests verts sur 26 fichiers. Si ce n'est pas le cas, s'arrêter là et le signaler :
   c'est la garantie de base de la cession.
2. **Lever un environnement propre.** Copier `.env.example` en `.env.local`, renseigner les
   valeurs des nouveaux comptes (§1), lancer `npm run dev`.
3. **Vérifier l'état des migrations.** `npm run check:migrations` compare le dépôt à la base.
4. **Déployer** en suivant `docs/deployment.md` de bout en bout.
5. **Reprendre Stripe** : créer les 6 produits, brancher le webhook, vérifier qu'un paiement
   de test aboutit (`deployment.md` §8).
6. **Faire tourner tous les secrets** (§2) et basculer `OPERATOR_EMAILS`.
7. **Tester la restauration d'une sauvegarde** (`deployment.md` §10) — une fois, sur un projet
   jetable. C'est la seule manière de savoir que la procédure marche.
8. **Vider les données de démonstration** si l'application repart sur une base propre : la
   production actuelle ne contient que du démo (comptes `@demo.qb.fr` et `@nexus-demo.fr`).

---

## 6. La démonstration publique

`/demo?role=manager` et `/demo?role=employee` ouvrent une session sur des comptes
de démonstration : **c'est l'application réelle**, pas une copie. Il n'y a donc rien à
maintenir en double, et aucune divergence possible entre ce qu'un visiteur voit et ce
qu'un client verrait.

| | |
|---|---|
| Établissement | « La Boulangerie du Soleil » — 8 salariés, 140 services, 17 modules peuplés |
| Comptes | `demo@quartzbase.fr` (manager) et `alice.martin@demo.qb.fr` (salarié) |
| Accès complet | Abonnement Multi-site **synthétisé à la lecture** dans `lib/subscription.ts` — jamais écrit en base, pour que la table `subscriptions` reste vide |
| Remise à zéro | `public.reset_demo_data()` (migration 088), appelée par `/api/cron/demo-reset` à 03h00 UTC |
| Visite guidée | `components/demo/product-tour.tsx` + les deux parcours de `tour-steps.ts` |

**Aucune action de la démo ne produit d'effet sortant.** Les gardes, à connaître avant
de toucher au code :

- **IA** — la génération de planning bascule sur le solveur déterministe (aucun crédit
  Anthropic), les assistants renvoient des réponses pré-écrites diffusées en flux.
- **Emails** — filtre au transport sur les motifs d'adresses de démonstration
  (`lib/demo.ts`), donc actif aussi pour les tâches planifiées.
- **SMS** — filtre au transport sur la plage `06 39 98 xx xx`, réservée à la fiction par
  l'ARCEP (`lib/sms.ts`), verrouillé par des tests.
- **Invitation, renvoi de lien, webhook de test, Stripe** — bloqués par session : ces
  routes émettent vers une adresse ou une URL saisie librement, et feraient de la démo un
  relais d'envoi ouvert.

> ⚠️ **Ne jamais insérer d'utilisateurs directement dans `auth.users`.** Les comptes de
> démonstration l'avaient été, sans `instance_id` et avec des jetons à NULL : GoTrue ne les
> retrouvait pas, tentait de les recréer, et échouait sur l'index unique de l'email. Ils
> ont été inutilisables pendant deux mois sans que rien ne le signale. Passer par l'API
> d'administration, qui renseigne les colonnes internes attendues. Cf. migration 086.

---

## 7. Points d'attention hérités

Repris de l'audit du 21/07/2026 — tout est documenté, rien n'est caché.

- **Politique de sécurité de contenu (CSP)** en mode `report-only`, prête à passer en mode
  bloquant après une fenêtre d'observation. Vérifier le paiement Stripe et le temps réel
  Supabase après bascule.
- **Protection des mots de passe compromis** (HaveIBeenPwned) désactivée côté Supabase Auth —
  un clic dans le tableau de bord.
- **Index « inutilisés »** signalés par les advisors Supabase : **conservés volontairement**,
  ce sont des index de clés étrangères. La décision est documentée en tête de la migration
  080. Ne pas les supprimer.
- **Aucun test de bout en bout.** 262 tests unitaires et d'intégration, mais pas de parcours
  navigateur automatisé. Un smoke HTTP existe (`scripts/smoke.mjs`).
- **Le dépôt porte deux noms.** `Nexus` en interne (dépôt, `package.json`, CI), `Quartzbase`
  en façade. Résidu inventorié et limité : clés de stockage local
  (`nexus-onboarding-step`, citée dans la page cookies), identifiants iCal, et en-têtes de
  webhook — ces derniers émettent **déjà les deux** (`X-Nexus-Event` et `X-Quartzbase-Event`),
  donc un renommage ne casse aucune intégration existante.
- **Adhérence à Supabase.** L'authentification, les politiques RLS et le temps réel reposent
  sur Supabase. Migrer vers un autre Postgres est possible, mais ce n'est pas un simple
  changement de chaîne de connexion.

---

## 8. Ce que le cédant peut faire, et jusqu'à quand

**Disponible pour une passation au moment de la cession**, pas pour une exploitation dans la durée.

Accompagnement possible : une session de passation en visio, la réponse aux questions
écrites, l'assistance au transfert des comptes. **À caler au moment de la signature** — le
cédant ne restera pas disponible indéfiniment. Ce runbook est écrit pour que ça n'ait pas
d'importance.

---

*Établi le 28 juillet 2026. Chiffres vérifiés dans le dépôt et la base de production le jour
même.*
