# Quartzbase

**SaaS de planning et de conformité au droit du travail français, pour la restauration et le
commerce.** Plannings, pointages, congés, remplacements, contrôle automatique du Code du
travail et exports de paie — dans une seule application, pensée mobile d'abord.

> **Le dépôt s'appelle `Nexus`, le produit s'appelle `Quartzbase`.** Le premier est le nom de
> code interne, le second le nom public. Le résidu est limité et inventorié : clés de stockage
> local, en-têtes de webhook (émis en double `X-Nexus-Event` / `X-Quartzbase-Event`) et
> identifiants d'événements iCal.

---

## Voir le produit tourner

Deux accès en libre-service, sans inscription — ce ne sont pas des captures, c'est
l'application réelle sur un établissement de démonstration de 8 salariés :

| | |
|---|---|
| **Côté gérant** | [quartzbase.fr/demo?role=manager](https://quartzbase.fr/demo?role=manager) |
| **Côté salarié** | [quartzbase.fr/demo?role=employee](https://quartzbase.fr/demo?role=employee) |

Une visite guidée démarre au premier passage, et un bandeau permet de basculer d'un rôle à
l'autre en un clic. Tout est modifiable : les données sont fictives, remises à zéro chaque
nuit, et **aucune action n'y déclenche d'envoi réel** (emails, SMS, webhooks et paiements sont
neutralisés au transport pour les comptes de démonstration).

---

## Ce que fait l'application

**Planifier** — grille hebdomadaire par glisser-déposer, brouillon puis publication (l'équipe
ne voit rien avant), génération automatique sous contraintes par un solveur déterministe,
coût salarial calculé en direct depuis les taux horaires par poste.

**Suivre le temps** — badgeuse mobile à code PIN chiffré, comparaison heure planifiée / heure
pointée, détection automatique des oublis de pointage, relevé des retards.

**Gérer l'équipe** — dossiers salariés, contrats (CDI, CDD, Extra, temps partiel), congés avec
soldes estimés, disponibilités déclarées, échanges de services entre collègues, remplacements
avec candidats classés, marketplace de créneaux à pourvoir.

**Rester conforme** — moteur de contrôle du Code du travail (voir ci-dessous), centre
d'alertes (infractions, fins de contrat, périodes d'essai), journal d'audit horodaté.

**Sortir les données** — récapitulatifs PDF, flux iCal, **déclaration sociale nominative
mensuelle au format NEODeS** pré-remplie, API REST v1 en lecture, webhooks sortants
compatibles Zapier / Make / n8n, intégration Slack.

**Assister** — génération de planning, briefs RH hebdomadaires, et un assistant conversationnel
qui rédige les documents RH avec leur base légale et propose des actions à confirmer.

---

## Le moteur de conformité

`lib/compliance` analyse un planning et remonte les infractions au Code du travail français,
règle par règle, avec l'article applicable et une correction suggérée.

**17 règles implémentées, les 17 couvertes par des tests.**

- **Durées et repos** — repos quotidien, repos hebdomadaire, durées maximales quotidienne,
  hebdomadaire et moyenne, amplitude, jours consécutifs travaillés
- **Organisation** — pauses obligatoires, travail de nuit, travail du dimanche, heures
  contractuelles dépassées, coupures des temps partiels
- **Travailleurs mineurs** — 5 règles dédiées

Le module est autonome : aucune dépendance externe, il se branche ailleurs en copiant deux
fichiers. Les alertes contextuelles s'ajustent à la convention collective de l'établissement —
en boulangerie (IDCC 3061), par exemple, le travail de nuit et du dimanche ne déclenchent pas
d'alerte, parce qu'ils y sont la norme.

📄 Détail et méthode d'évaluation : [`lib/compliance/README.md`](lib/compliance/README.md)

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) (App Router), React 18, TypeScript strict |
| Base de données | [Supabase](https://supabase.com) — PostgreSQL, Auth, Row Level Security multi-tenant |
| Interface | Tailwind CSS, Radix UI |
| IA | [Anthropic Claude](https://anthropic.com) — Haiku 4.5 pour les assistants, les briefs et les alertes ; Sonnet pour la génération de planning et les documents RH |
| Paiements | [Stripe](https://stripe.com) — 3 plans, essai 30 jours, webhook signé et idempotent |
| Emails | [Resend](https://resend.com) |
| Supervision | [Sentry](https://sentry.io) |
| Déploiement | [Vercel](https://vercel.com) — 10 tâches planifiées |

**Ordres de grandeur :** 58 600 lignes de TypeScript · 63 pages · 100 routes d'API ·
91 migrations SQL tracées · 278 tests automatisés · PWA installable iOS et Android.

---

## Démarrage

```bash
git clone https://github.com/burtemaxence-ux/Nexus.git
cd Nexus

npm install
cp .env.example .env.local   # puis renseigner les valeurs (voir ci-dessous)

npm run dev                  # http://localhost:3000
```

### Variables d'environnement

Toutes sont documentées dans [`.env.example`](.env.example). Le minimum pour démarrer :

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique — utilisée côté navigateur |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé de service — **côté serveur uniquement**, contourne la RLS |
| `NEXT_PUBLIC_URL` | URL publique de l'application |

Fortement recommandées, sous peine de fonctions silencieusement inertes :

| Variable | Sans elle |
|---|---|
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | Aucun email ne part |
| `CRON_SECRET` | **Toutes les tâches planifiées répondent 401 et ne s'exécutent jamais** |
| `CALENDAR_SECRET` | L'abonnement iCal n'est pas proposé |
| `ANTHROPIC_API_KEY` | Briefs et assistant indisponibles (le solveur de planning, lui, fonctionne sans) |

Optionnelles : `STRIPE_*` (facturation), `VAPID_*` (notifications push),
`NEXT_PUBLIC_SENTRY_DSN` (supervision), `KV_*` (limitation de débit — repli en mémoire sinon),
`TWILIO_*` (SMS), `SLACK_WEBHOOK_URL` et `OPS_*` (alertes d'exploitation), `OPERATOR_EMAILS`
(accès au back-office `/admin`).

Pour les notifications push, générer les clés avec `npx web-push generate-vapid-keys`.

---

## Vérifier

```bash
npm test                 # 278 tests (Vitest)
npm run lint             # ESLint
npx tsc --noEmit         # typage strict
npm run build            # build de production
npm run check:migrations # les objets des migrations « à appliquer à la main » existent-ils en base ?
```

La CI GitHub Actions rejoue typecheck, lint, tests et build à chaque poussée.

---

## Documentation

| Document | Contenu |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arborescence, modèle de données, RLS, flux d'authentification, variables |
| [`docs/deployment.md`](docs/deployment.md) | Vercel, variables, tâches planifiées, migrations |
| [`docs/api-v1.md`](docs/api-v1.md) | API REST v1 en lecture (shifts, employees, leaves) |
| [`docs/COMMAND_CENTER.md`](docs/COMMAND_CENTER.md) | Playbooks d'incident par symptôme, tableaux de bord, pannes silencieuses |
| [`docs/migrations-state.md`](docs/migrations-state.md) | État des migrations et historique des rattrapages |
| [`lib/compliance/README.md`](lib/compliance/README.md) | Le moteur de conformité en détail |

Un audit technique daté du 21 juillet 2026 est disponible dans
[`docs/2026-07-21-audit-complet-quartzbase.md`](docs/2026-07-21-audit-complet-quartzbase.md).

---

## Conventions de contribution

Les règles de travail sur ce dépôt — changements chirurgicaux, simplicité, vérification avant
correction — sont dans [`CLAUDE.md`](CLAUDE.md).
