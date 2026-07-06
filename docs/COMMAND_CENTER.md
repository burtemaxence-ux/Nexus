# 🛠️ Centre de commande — Support & incidents Quartzbase / Nexus

> **À quoi ça sert :** quand un client te signale un problème (site, fonction, email,
> paiement, communication), tu ouvres cette page et tu suis le playbook du bon symptôme.
> Objectif : **diagnostiquer en < 5 min** au lieu de chercher partout.
>
> Garde ce fichier en favori. Il vit dans le repo → il évolue avec le produit.

- **Domaine :** https://quartzbase.fr
- **Email support / DPO :** assistance.quartzbase@mail.fr
- **Expéditeur emails :** `noreply@quartzbase.fr` (via Resend)

---

## ⚡ Le réflexe 30 secondes (à faire AVANT tout)

Avant de plonger, réponds à ces 3 questions — elles orientent 90 % des cas :

1. **Est-ce global ou 1 seul client ?**
   → Ouvre le health check : https://quartzbase.fr/api/health
   - `status: "ok"` → la base + les services répondent → le souci est **local à un client** (données, navigateur, compte).
   - `status: "degraded"` ou page qui ne répond pas → **incident global** → va direct au [Playbook A](#playbook-a--le-site-est-cassé-lent-ou-renvoie-une-erreur).

2. **Depuis quand ?**
   → Un déploiement récent ? Regarde le dernier déploiement Vercel (voir tableaux de bord ci-dessous).
   Si le bug est apparu juste après un deploy → suspecte le deploy en premier (rollback possible en 1 clic).

3. **C'est reproductible ?**
   → Demande au client : quelle page (URL), quelle action, quel message d'erreur, capture d'écran.
   Sans ça, tu ne pourras rien confirmer. **Modèle de première réponse → [section Modèles](#-modèles-de-réponse-client).**

---

## 🎛️ Les 5 tableaux de bord (tes liens directs)

| Service | À quoi ça sert | Où regarder |
|---|---|---|
| **Sentry** | Erreurs JS/serveur en production (stack traces, fréquence, users touchés) | https://sentry.io → projet Nexus |
| **Vercel** | Déploiements, logs runtime, statut build, rollback | https://vercel.com → projet Nexus → onglets *Deployments* / *Logs* |
| **Supabase** | Base de données, Auth, logs SQL, RLS | https://supabase.com/dashboard → projet Nexus |
| **Resend** | Livraison des emails (envoyés / bounce / spam) | https://resend.com/emails |
| **Stripe** | Paiements, abonnements, webhooks | https://dashboard.stripe.com |

> **Health interne (public, sans login) :** https://quartzbase.fr/api/health
> Renvoie l'état de : `database`, `ai`, `email`, `push`, `slack`, `sms`.
> `sms: not_configured` = variables `TWILIO_*` absentes → les envois SMS
> (invitation employé, congés, planning) sont des **no-ops silencieux**
> (`lib/sms.ts`). Tant que cette pastille n'est pas verte, ne pas promettre
> « planning par SMS » à un client.

---

## 🧰 Tes outils opérateur (dans l'app)

### Back-office `/admin`

Adresse : **https://quartzbase.fr/admin** — réservé à toi.

L'accès est filtré par email : seuls les emails listés dans la variable
`OPERATOR_EMAILS` peuvent l'ouvrir (les autres sont redirigés). Tu y trouves :

- **KPIs** — nombre de clients, clients payants, en essai, non activés, nouveaux cette semaine, employés gérés, MRR estimé, signalements ouverts.
- **À relancer** — deux listes automatiques : clients inscrits mais **pas encore activés** (aucun planning créé), et **essais qui se terminent** dans ≤ 7 jours.
- **Santé des services** — pastilles vert/rouge (base, emails, IA, push, paiements, crons, monitoring, alertes). Un rouge = une variable d'environnement manquante.
- **Clients** — liste enrichie (proprio, employés, plannings, statut, dernière activité) avec **recherche** et **tri**. Clique une ligne → **fiche client détaillée** (`/admin/clients/[id]`) : abonnement, équipe, activité.
- **Signalements** — tout ce qui arrive via le bouton « Signaler un problème », avec un bouton *Résolu* pour faire le tri.
- **Tester une alerte** — envoie une alerte de test pour vérifier que tu reçois bien les notifications.

> Techniquement, les chiffres viennent d'une fonction SQL agrégée `admin_client_overview()` (migration 043), verrouillée au service role — aucun client ne peut y accéder.

### Bouton « Signaler un problème »

Un bouton flottant (🛟, en bas à droite) présent sur **toutes les pages connectées**.
Quand un client clique et décrit son souci, on capture **automatiquement** la page (URL)
et son navigateur, puis :
1. le signalement est enregistré et visible dans `/admin` ;
2. tu reçois une **alerte** (Slack et/ou email) immédiatement.

→ Fini le ping-pong « quelle page ? quel message ? » : tu as déjà le contexte.

---

## 🔔 Mettre en place les alertes (à faire une fois)

**But : être prévenu AVANT le client.** Trois niveaux, du plus simple au plus complet :

1. **Alertes internes (déjà branchées dans le code).** Il suffit de configurer un canal
   dans les variables d'environnement Vercel :
   - `SLACK_WEBHOOK_URL` → tu reçois les alertes sur Slack, **ou**
   - `OPS_RESEND_API_KEY` (clé Resend dédiée au back-office) + `OPS_ALERT_EMAIL` → tu les reçois par email. À défaut de clé dédiée, `RESEND_API_KEY` (celle des emails clients) est réutilisée.
   - Vérifie que ça marche : `/admin` → bouton **Tester une alerte**.

2. **Surveillance de disponibilité (uptime).** Crée un moniteur gratuit (UptimeRobot ou
   Better Stack) qui appelle **https://quartzbase.fr/api/health** toutes les 1–5 min.
   S'il ne répond pas ou renvoie `degraded`, tu reçois un SMS/email. C'est ce qui te
   prévient si **tout le site tombe**.

3. **Alertes Sentry.** Dans Sentry → *Alerts* → crée une règle « nouvelle erreur » et
   « pic d'erreurs » → notification email/Slack. Comme le code envoie déjà les erreurs
   (y compris celles des crons) à Sentry, ça couvre aussi les tâches automatiques.

---

## 🩺 Playbooks par symptôme

### Playbook A — « Le site est cassé, lent, ou renvoie une erreur »

1. **Health check** : https://quartzbase.fr/api/health
   - `database.status: "error"` → problème Supabase → va au dashboard Supabase, onglet *Logs* / *Database health*. Vérifie que le projet n'est pas en pause (Supabase met en pause les projets gratuits inactifs).
   - `database.latency_ms` très élevé (> 1000) → base lente, requête coûteuse ou pic de charge.
2. **Sentry** : y a-t-il un pic d'erreurs récent ? Ouvre l'issue la plus fréquente → stack trace → fichier/ligne.
3. **Vercel → Deployments** : le dernier déploiement est-il *Ready* ou *Error* ?
   - Build en échec → le site tourne encore sur l'ancienne version, mais aucune nouveauté ne passe.
   - Bug apparu après un deploy → **Rollback** : Vercel → deployment précédent (vert) → `⋯` → *Promote to Production*. C'est instantané et réversible.
4. **Vercel → Logs (Runtime)** : filtre sur la route concernée (ex : `/api/shifts`) pour voir l'erreur serveur brute.

> ⚠️ **Sentry n'est actif qu'en production** (`enabled: NODE_ENV === 'production'`). En local/preview, aucune erreur ne remonte — c'est normal.

---

### Playbook B — « Une fonction bug (planning, pointage, congés, échanges…) »

1. **Reproduis** avec les infos du client (URL + action). Si tu ne reproduis pas → probablement **données** ou **droits** (RLS).
2. **Sentry** : cherche l'erreur par nom de route ou de composant. La stack trace pointe le fichier.
   - Carte des fichiers : `app/(dashboard)/manager/...` (côté manager) · `app/api/...` (backend) · `lib/...` (logique métier).
3. **Droits / RLS** : si « ça ne s'affiche pas » ou « accès refusé » sans erreur 500 → c'est du **Row Level Security** Supabase. Vérifie dans Supabase → *Authentication* que le user a le bon `role` (`manager` / `employee` / `supervisor`) et le bon établissement.
4. **Fix code** : reproduis le bug avec un test (voir [Corriger & déployer](#-corriger--déployer-un-bug)), corrige, `npm test`, commit, push. Vercel redéploie tout seul.

Zones fréquentes → fichiers :

| Le client parle de… | Regarde d'abord |
|---|---|
| Planning / shifts / drag & drop | `app/api/shifts/` · `lib/planning/` · `components/planning/` |
| Pointage / badgeuse / code PIN | `app/api/presences/` · `lib/pin.ts` |
| Congés | `app/api/conges/` · `lib/leaves.ts` |
| Conformité / contrats | `app/api/compliance/` · `lib/compliance/` · `lib/contracts.ts` |
| Échanges / remplacements SOS | `app/api/exchanges/` · `app/api/replacement/` · `lib/sos/` |
| Abonnement / accès bloqué | `lib/plan-guard.ts` · `lib/subscription.ts` |

---

### Playbook C — « Le client (ou ses employés) ne reçoit pas les emails »

Ordre de diagnostic :

1. **Resend → Emails** : https://resend.com/emails — l'email a-t-il été **envoyé** ?
   - **Absent de la liste** → le code n'a pas déclenché l'envoi (bug applicatif) OU `RESEND_API_KEY` manquante. Vérifie `/api/health` → `email.status` doit être `"configured"`.
   - **Présent + `delivered`** → email parti et accepté → **côté client** : spam, adresse erronée, boîte pleine. Fais-lui chercher « Quartzbase » / `noreply@quartzbase.fr` dans ses spams.
   - **Présent + `bounced`** → adresse invalide/inexistante. Vérifie l'orthographe de l'adresse du destinataire.
   - **`complained`** → le destinataire a marqué « spam » un jour → il peut être bloqué.
2. **Domaine vérifié** : Resend → *Domains* → `quartzbase.fr` doit être *Verified* (SPF/DKIM verts). Si non → aucun email ne part correctement.
3. **Renvoyer un email** : certaines actions ont un renvoi intégré, ex. invitation employé → `POST /api/employees/resend-link`. Le manager peut aussi le refaire depuis la fiche employé.

Emails transactionnels existants (`lib/email/`) : `welcome`, `planning-email`, `conges-email`, `weekly-brief-email`, `trial-ending`.

---

### Playbook D — « Paiement / abonnement / facturation »

1. **Stripe → Dashboard** : cherche le client par email → état de l'abonnement (active / past_due / canceled).
2. **Webhook Stripe** : Stripe → *Developers → Webhooks* → vérifie que les events récents passent (`200`). Si `4xx/5xx` → l'app n'a pas reçu la mise à jour → l'abonnement en base peut être désynchronisé.
   - Cause classique : `STRIPE_WEBHOOK_SECRET` incorrect dans Vercel → toutes les notifications échouent silencieusement.
3. **Accès bloqué alors que le client a payé** : la logique de garde est dans `lib/plan-guard.ts` / `lib/subscription.ts`. Vérifie que l'event Stripe a bien mis à jour le profil en base (Supabase).
4. **Prix / plans** : les `price_...` sont dans les variables d'env `STRIPE_PRICE_*` (voir `.env.example`). Un ID vide (`?? ''`) → Stripe échoue silencieusement.

---

### Playbook E — « Notifications push / SMS ne partent pas »

- **Push** : `/api/health` → `push.status`. Si `"missing"` → clés `VAPID_*` absentes → **les push sont désactivées silencieusement** (`sendPushToUser()` ne fait rien). Générer : `npx web-push generate-vapid-keys`, puis renseigner dans Vercel.
- **SMS (Twilio, optionnel)** : sans `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER`, les SMS sont **désactivés silencieusement** (`lib/sms.ts`). Rien n'est envoyé, aucune erreur.
- Côté client : un push ne peut arriver que si l'utilisateur a **autorisé les notifications** dans son navigateur et installé la PWA.

---

### Playbook F — « Les tâches automatiques ne s'exécutent pas » (briefs, rappels, conformité…)

Les crons Vercel (`vercel.json`) sont protégés par `CRON_SECRET`.

- ⚠️ **Si `CRON_SECRET` est absent ou différent entre Vercel et le code → TOUS les crons renvoient `401` silencieusement** et ne s'exécutent jamais. C'est LA cause n°1 de « le brief du lundi n'est jamais arrivé ».
- Vérifie : Vercel → *Settings → Cron Jobs* (état des dernières exécutions) et *Settings → Environment Variables* (`CRON_SECRET` présent).

Planning des crons :

| Cron | Horaire (UTC) | Rôle |
|---|---|---|
| `check-missing-clockout` | 23:00 tous les jours | Détecte les oublis de pointage |
| `check-replacements` | 22:00 tous les jours | Relance les remplacements |
| `compliance-check` | 22:00 le dimanche | Analyse conformité hebdo |
| `weekly-brief-manager` | 07:00 le lundi | Brief RH manager (IA) |
| `weekly-summary-employee` | 18:00 le vendredi | Résumé employé |
| `trial-reminder` | 09:00 tous les jours | Rappel fin d'essai |
| `referral-activation` | 02:00 tous les jours | Activation parrainage |
| `shift-reminder` | 17:00 tous les jours | Rappel shift du lendemain |

---

## 🔕 Table des pannes « silencieuses » (rien ne casse, mais rien ne marche)

Ces variables, si mal configurées, **ne provoquent aucune erreur visible** — juste une fonction qui ne fait rien. À vérifier en priorité quand « ça devrait marcher mais il ne se passe rien » :

| Symptôme | Variable / cause | Où corriger |
|---|---|---|
| Aucun email ne part | `RESEND_API_KEY` absente ou domaine non vérifié | Vercel env + Resend Domains |
| Les crons ne tournent jamais | `CRON_SECRET` absent/différent | Vercel env |
| iCal indisponible | `CALENDAR_SECRET` absent | Vercel env |
| Push jamais reçues | `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` absentes | Vercel env |
| SMS jamais envoyés | `TWILIO_*` absentes | Vercel env |
| Paiement non pris en compte | `STRIPE_WEBHOOK_SECRET` faux, `STRIPE_PRICE_*` vides | Vercel env + Stripe |
| Erreurs prod invisibles | `NEXT_PUBLIC_SENTRY_DSN` absent | Vercel env + Sentry |
| Rate limiting inefficace | `KV_*` absentes (fallback mémoire) | Vercel Storage → KV |

> Toutes ces variables sont documentées dans `.env.example`. La référence de déploiement est `docs/deployment.md`.

---

## ✉️ Modèles de réponse client

**1. Accusé de réception (à envoyer tout de suite, gagne du temps) :**

> Bonjour {Prénom},
>
> Merci pour votre message, je prends le problème en charge. Pour aller plus vite, pourriez-vous me préciser :
> - la page concernée (l'adresse dans la barre du navigateur) ;
> - ce que vous faisiez au moment du souci ;
> - le message d'erreur exact (une capture d'écran est idéale).
>
> Je reviens vers vous rapidement.
> — L'équipe Quartzbase

**2. Bug confirmé, correctif en cours :**

> Bonjour {Prénom},
>
> J'ai bien reproduit le problème, il s'agit d'un bug de notre côté. Un correctif est en cours de déploiement, je vous confirme dès que c'est réglé (généralement sous {délai}). Merci de votre patience.
> — L'équipe Quartzbase

**3. Faux positif (email en spam / manip côté client) :**

> Bonjour {Prénom},
>
> Après vérification, l'email a bien été envoyé de notre côté. Il peut se trouver dans vos courriers indésirables : cherchez « Quartzbase » ou `noreply@quartzbase.fr`, et ajoutez cette adresse à vos contacts pour les prochains envois. Dites-moi si vous ne le trouvez toujours pas.
> — L'équipe Quartzbase

**4. Résolu :**

> Bonjour {Prénom},
>
> C'est corrigé ✅. Vous pouvez recharger la page (ou vous reconnecter) et réessayer. N'hésitez pas si quoi que ce soit d'autre coince.
> — L'équipe Quartzbase

---

## 💳 Avant d'encaisser — checklist Stripe (à faire une fois)

Le code Stripe est prêt (checkout, webhook idempotent, portail, verrou d'accès par
plan). Mais **aucun vrai paiement n'a encore circulé** — à activer avant le lancement :

1. **Déclarer le webhook** dans Stripe → *Developers → Webhooks → Add endpoint* :
   - URL : `https://quartzbase.fr/api/stripe/webhook`
   - Événements : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
2. **`STRIPE_WEBHOOK_SECRET`** (le `whsec_…` du webhook ci-dessus) dans Vercel. Sans lui, **tous les paiements sont ignorés en silence** (l'abonnement client ne se met jamais à jour).
3. **Les 6 IDs de prix** `STRIPE_PRICE_ESSENTIAL/PRO/MULTISITE_MONTHLY|YEARLY` dans Vercel (depuis tes produits Stripe). Manquant → le checkout renvoie « Plan non configuré ».
4. **Même mode partout** : `STRIPE_SECRET_KEY`, les IDs de prix et le webhook doivent être **tous en Test ou tous en Live**. Un mélange = panne silencieuse.
5. **Test de bout en bout** (mode test) : fais un achat → une ligne doit apparaître dans `subscriptions` **avec** `stripe_subscription_id`, et une ligne dans `stripe_webhook_events`.

> Rappel technique : la table `subscriptions` utilise le vocabulaire du code —
> `plan` ∈ `free/essential/pro/multisite`, `status` = statut Stripe brut. Aligné
> par la migration 044 (avant, la base refusait `essential`/`multisite`/`free` et
> faisait échouer le webhook).

---

## 🚀 Corriger & déployer un bug

Rappel du réflexe qualité (voir `CLAUDE.md`) : **reproduis avant de corriger.**

```bash
# 1. Reproduire : écrire (ou lancer) un test qui échoue à cause du bug
npm test

# 2. Corriger le minimum nécessaire (changement chirurgical)

# 3. Vérifier
npm run lint
npm test

# 4. Committer et pousser → Vercel déploie automatiquement
git add -A && git commit -m "fix: <description courte>"
git push
```

- **En cas d'urgence** : ne corrige pas dans le stress — fais d'abord un **rollback Vercel** (Playbook A, étape 3) pour rétablir le service, puis corrige à froid.
- **Vérifier après déploiement** : recharge la page concernée + `/api/health`, et confirme au client.

---

## 🆘 Escalade — quand ce n'est pas de « ton » ressort

| Le souci vient de… | Statut du fournisseur |
|---|---|
| Base de données / Auth | https://status.supabase.com |
| Hébergement / déploiement | https://www.vercel-status.com |
| Emails | https://resend-status.com |
| Paiements | https://status.stripe.com |

Si un de ces statuts est rouge → **ce n'est pas ton code**. Préviens le client (modèle « bug confirmé, en cours »), et surveille le rétablissement.

---

**Dernière mise à jour :** 2026-07-04
