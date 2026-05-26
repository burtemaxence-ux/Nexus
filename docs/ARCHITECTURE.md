# Architecture Technique — D-pot / Nexus

> Application SaaS de gestion de planning pour la restauration. Nom de code interne : **Nexus**.

---

## 1. Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.5 |
| Langage | TypeScript | ^5 |
| Base de données | Supabase (PostgreSQL) | `@supabase/supabase-js` ^2.106.1 |
| Auth | Supabase Auth (cookie-based SSR) | `@supabase/ssr` ^0.10.3 |
| IA | Anthropic Claude API | `@anthropic-ai/sdk` ^0.98.0 |
| UI / Styling | Tailwind CSS + Radix UI | Tailwind ^3.4.6 |
| Drag & Drop | dnd-kit | ^6.3.1 |
| Graphiques | Recharts | ^3.8.1 |
| Emails | Resend | ^6.12.3 |
| Notifications push | web-push (Web Push API / VAPID) | ^3.6.7 |
| PDF | @react-pdf/renderer | ^4.5.1 |
| Validation | Zod | ^4.4.3 |
| Animations | @formkit/auto-animate | ^0.9.0 |
| Toast / notifications UI | Sonner | ^2.0.7 |
| Déploiement | Vercel | — |

**Modèles IA utilisés :**
- `claude-haiku-4-5-20251001` — assistant chat (manager & employé), réponses rapides et streaming
- `claude-sonnet-4-6` — génération de planning (tool use, raisonnement structuré)

---

## 2. Structure du projet

```
D-pot/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Route group : pages publiques (login)
│   │   └── login/page.tsx
│   ├── (dashboard)/            # Route group : pages protégées
│   │   ├── layout.tsx          # Layout global du dashboard (AppShell)
│   │   ├── manager/            # Interface manager / supervisor
│   │   │   ├── planning/       # Gestion du planning semaine
│   │   │   ├── employees/      # CRUD employés
│   │   │   ├── conges/         # Validation des demandes de congés
│   │   │   ├── echanges/       # Approbation des échanges de shifts
│   │   │   ├── marketplace/    # Marketplace de remplacement
│   │   │   ├── presences/      # Suivi des pointages
│   │   │   ├── analytics/      # Tableau de bord analytique
│   │   │   ├── compliance/     # Vérification légale (Code du travail)
│   │   │   ├── alertes/        # Centre d'alertes
│   │   │   ├── rapport/        # Rapport PDF horaire/coûts
│   │   │   ├── audit-log/      # Journal d'audit
│   │   │   └── settings/       # Paramètres établissement
│   │   └── employee/           # Interface employé
│   │       ├── planning/       # Mon planning
│   │       ├── conges/         # Mes demandes de congés
│   │       ├── echanges/       # Mes échanges de shifts
│   │       ├── marketplace/    # Marketplace (reprendre un créneau)
│   │       └── badgeuse/       # Pointage clock-in / clock-out
│   ├── api/                    # API Routes (Route Handlers)
│   │   ├── ai/                 # Endpoints IA (Anthropic)
│   │   ├── v1/                 # API publique REST (tokens)
│   │   └── ...                 # Voir section 5
│   ├── auth/
│   │   ├── callback/route.ts   # Callback OAuth Supabase
│   │   └── set-password/       # Création de mot de passe (invitation)
│   └── legal/                  # Pages légales (CGU, confidentialité, mentions)
│
├── components/
│   ├── ui/                     # Composants génériques réutilisables
│   ├── planning/               # Composants spécifiques au planning
│   ├── employees/              # Composants gestion employés
│   ├── dashboard/              # Composants dashboard (onboarding)
│   └── onboarding/             # Wizard d'onboarding
│
├── lib/
│   ├── supabase/               # Clients Supabase (server, client, admin, middleware)
│   ├── compliance/             # Moteur de conformité légale
│   ├── email/                  # Templates et envoi d'emails (Resend)
│   ├── integrations/           # iCal, webhooks sortants
│   ├── api-token.ts            # Génération/validation de tokens API
│   ├── push.ts                 # Notifications push Web Push
│   ├── rate-limit.ts           # Rate limiter in-memory
│   ├── validations.ts          # Schémas Zod
│   └── utils/                  # Utilitaires dates, classes CSS
│
├── types/index.ts              # Tous les types TypeScript du domaine
├── middleware.ts               # Auth middleware Next.js (protection des routes)
├── supabase/migrations/        # 28 migrations SQL (historique complet)
└── scripts/seed-demo.ts        # Script de seed de données de démonstration
```

---

## 3. Base de données (Supabase)

La base de données est hébergée sur Supabase (PostgreSQL). Toutes les tables ont la **Row Level Security (RLS) activée**. Le schéma est multi-tenant : chaque table métier est cloisonnée par `establishment_id`.

### Tables principales

| Table | Description |
|---|---|
| `profiles` | Profils utilisateurs, liés à `auth.users`. Contient rôle, poste, contrat, `establishment_id`, `active_establishment_id` |
| `establishments` | Établissements (restaurants). Clé centrale du multi-tenant |
| `user_establishments` | Table de jointure : accès multi-sites pour un manager/supervisor |
| `shifts` | Créneaux de travail (date, heure début/fin, pause, poste, statut draft/published) |
| `week_status` | Statut de publication/verrouillage par semaine et par établissement |
| `postes` | Postes de travail configurables (nom, couleur, coût horaire, durée de pause par défaut) |
| `leave_requests` | Demandes de congés (CP, RTT, maladie, sans_solde, autre) avec statut pending/approved/rejected |
| `contracts` | Historique des contrats employés (CDI, CDD, extra) avec informations détaillées |
| `availabilities` | Disponibilités hebdomadaires des employés |
| `presences` | Pointages clock-in / clock-out avec pauses |
| `lateness_records` | Enregistrements de retards (minutes, justifié ou non) |
| `shift_exchanges` | Échanges de shifts entre employés (workflow : open → pending_approval → approved/rejected) |
| `marketplace_slots` | Slots de remplacement ouverts sur le marketplace |
| `marketplace_applications` | Candidatures des employés aux slots marketplace |
| `settings` | Paramètres clé/valeur par établissement (convention collective, horaires, webhooks, clés VAPID) |
| `push_subscriptions` | Abonnements Web Push par utilisateur (endpoint, clés p256dh/auth) |
| `api_tokens` | Tokens d'accès API REST (hachés en SHA-256) |
| `webhook_logs` | Journal des livraisons webhook / Slack |
| `audit_log` | Journal d'audit automatique sur les tables sensibles (INSERT/UPDATE/DELETE) |
| `employee_documents` | Documents RH des employés (contrats scannés, fiches de paie, etc.) |

### Types de contrats

```
'CDI 35h' | 'CDI 28h' | 'CDD' | 'CDD Saisonnier' | 'Extra'
```

### Types de congés

```
'CP' (congé payé) | 'RTT' | 'maladie' | 'sans_solde' | 'autre'
```

### Relations clés

```
auth.users (Supabase)
    └── profiles (1:1, via trigger handle_new_user)
            ├── establishments (N:1 — establishment_id)
            ├── shifts (1:N)
            ├── leave_requests (1:N)
            ├── contracts (1:N)
            ├── presences (1:N)
            ├── lateness_records (1:N)
            ├── availabilities (1:N)
            ├── push_subscriptions (1:N)
            └── user_establishments (N:M avec establishments)

establishments
    ├── shifts (1:N)
    ├── postes (1:N)
    ├── week_status (1:N, PK composite: establishment_id + week_monday)
    ├── settings (1:N, PK composite: establishment_id + key)
    ├── api_tokens (1:N)
    └── webhook_logs (1:N)

shifts
    ├── shift_exchanges (1:N, via shift_id)
    └── marketplace_slots (1:1 active, via shift_id)

marketplace_slots
    └── marketplace_applications (1:N)
```

### RLS et sécurité

Chaque table utilise des politiques RLS basées sur deux fonctions SQL :

- **`auth.uid()`** — identifiant de l'utilisateur connecté
- **`public.current_establishment_id()`** — résout l'établissement actif de l'utilisateur (prend `active_establishment_id` si non nul, sinon `establishment_id`)
- **`public.is_manager()`** — vérifie que le rôle est `manager` ou `supervisor`

**Principe général des politiques :**
- Les employés ne voient que leurs propres données (shifts, congés, présences, retards)
- Les managers voient et gèrent toutes les données de leur établissement actif
- L'isolation multi-tenant est assurée par la comparaison `establishment_id = current_establishment_id()`

**Triggers automatiques :**
- `handle_new_user` — crée un profil dans `profiles` à chaque inscription Supabase Auth
- `auto_set_establishment_id` — remplit automatiquement `establishment_id` à l'INSERT si null
- `log_audit_event` — déclenché sur INSERT/UPDATE/DELETE des tables `contracts`, `leave_requests`, `profiles`, `lateness_records`

**Client admin (`supabaseAdmin`)** — utilise la `SUPABASE_SERVICE_ROLE_KEY`, contourne la RLS. Utilisé uniquement côté serveur pour les opérations système (validation de tokens API, envoi de push, etc.).

---

## 4. Authentification & autorisation

### Flux d'authentification

1. L'utilisateur se connecte via `/login` (magic link email ou email/mot de passe Supabase Auth)
2. Supabase Auth émet un JWT stocké dans un cookie HTTP-only (géré par `@supabase/ssr`)
3. Le **middleware Next.js** (`middleware.ts`) s'exécute sur chaque requête :
   - Si non connecté → redirect `/login`
   - Si connecté sur `/login` ou `/` → redirect vers `/manager` ou `/employee` selon le rôle
   - Si rôle `employee` tente d'accéder à `/manager` → redirect `/employee`
   - Si rôle `manager/supervisor` tente d'accéder à `/employee` → redirect `/manager`
4. La page `/auth/set-password` permet aux employés invités de définir leur mot de passe (bypasse le redirect)

### Invitation d'employés

Le manager crée un employé via `/api/employees/invite`. Supabase envoie un email d'invitation magique. L'employé arrive sur `/auth/set-password` pour créer son mot de passe.

### Rôles

| Rôle | Accès |
|---|---|
| `manager` | Toutes les routes `/manager/*`, peut tout gérer sur son établissement |
| `supervisor` | Mêmes droits que manager (via `is_manager()`) |
| `employee` | Routes `/employee/*` uniquement, lecture de ses propres données |

### Clients Supabase

| Fichier | Usage | Contexte |
|---|---|---|
| `lib/supabase/client.ts` | `createBrowserClient` | Composants client React |
| `lib/supabase/server.ts` | `createServerClient` + cookies | Server Components, Route Handlers |
| `lib/supabase/middleware.ts` | `createServerClient` | Middleware Next.js (rafraîchissement de session) |
| `lib/supabase/admin.ts` | `createClient` + service role key | Opérations serveur bypassant RLS |

---

## 5. Routes API

Toutes les routes API sont dans `app/api/`. Elles utilisent les **Route Handlers** Next.js 14. L'authentification est vérifiée via `supabase.auth.getUser()` à chaque requête.

### Routes manager (nécessitent rôle manager ou supervisor)

| Route | Méthodes | Description |
|---|---|---|
| `/api/shifts` | GET, POST | Lister / créer des shifts |
| `/api/shifts/[id]` | GET, PUT, DELETE | Lire / modifier / supprimer un shift |
| `/api/shifts/copy-week` | POST | Copier le planning d'une semaine à une autre |
| `/api/shifts/send-planning-email` | POST | Envoyer le planning par email aux employés |
| `/api/week-status` | GET, POST, PUT | Statut publication/verrouillage d'une semaine |
| `/api/employees` | GET, POST | Lister / créer des employés |
| `/api/employees/invite` | POST | Inviter un employé (email Supabase Auth) |
| `/api/employees/resend-link` | POST | Renvoyer le lien d'invitation |
| `/api/employees/[id]` | GET, PUT, DELETE | Détails / modifier / supprimer un employé |
| `/api/employees/[id]/archive` | POST | Archiver un employé (soft delete) |
| `/api/employees/[id]/contracts` | GET, POST | Historique de contrats |
| `/api/employees/[id]/contracts/[contractId]` | PUT, DELETE | Modifier / supprimer un contrat |
| `/api/employees/[id]/availabilities` | GET, PUT | Disponibilités hebdomadaires |
| `/api/employees/[id]/documents` | GET, POST | Documents RH (upload) |
| `/api/employees/[id]/documents/[docId]` | DELETE | Supprimer un document |
| `/api/employees/[id]/pin-reset` | POST | Réinitialiser le PIN badgeuse |
| `/api/postes` | GET, POST | Lister / créer des postes |
| `/api/postes/[id]` | PUT, DELETE | Modifier / supprimer un poste |
| `/api/conges` | GET | Lister toutes les demandes de congés |
| `/api/conges/[id]` | PUT | Approuver / refuser une demande |
| `/api/exchanges/[id]/approve` | POST | Approuver un échange de shift |
| `/api/exchanges/[id]/reject` | POST | Refuser un échange |
| `/api/marketplace/[id]/confirm` | POST | Confirmer un remplacement marketplace |
| `/api/presences` | GET | Lister les pointages |
| `/api/lateness` | GET, POST | Lister / créer des retards |
| `/api/lateness/[id]` | PUT, DELETE | Modifier / supprimer un retard |
| `/api/analytics` | GET | Données analytiques (heures, coûts, tendances) |
| `/api/compliance` | GET | Rapport de conformité légale |
| `/api/audit-log` | GET | Journal d'audit |
| `/api/exports` | GET | Export des données (CSV) |
| `/api/establishments` | GET, POST | Lister / créer des établissements |
| `/api/establishments/[id]` | GET, PUT, DELETE | Détails / modifier / supprimer |
| `/api/establishments/[id]/members` | GET, POST | Membres d'un établissement |
| `/api/establishments/[id]/members/[userId]` | DELETE | Retirer un membre |
| `/api/establishments/overview` | GET | Vue d'ensemble multi-sites |
| `/api/establishments/switch` | POST | Changer d'établissement actif |
| `/api/settings` | GET, PUT | Paramètres de l'établissement |
| `/api/integrations/tokens` | GET, POST | Gérer les tokens API |
| `/api/integrations/tokens/[id]` | DELETE | Supprimer un token |
| `/api/integrations/test` | POST | Tester un webhook ou Slack |
| `/api/integrations/logs` | GET | Logs de livraison webhook |

### Routes employé (accessibles par les employés)

| Route | Méthodes | Description |
|---|---|---|
| `/api/conges` | POST | Soumettre une demande de congé |
| `/api/conges/[id]` | DELETE | Annuler une demande en attente |
| `/api/presences/clock-in` | POST | Pointer l'arrivée |
| `/api/presences/clock-out` | POST | Pointer la sortie |
| `/api/presences/break-start` | POST | Démarrer une pause |
| `/api/presences/break-end` | POST | Terminer une pause |
| `/api/exchanges` | GET, POST | Lister / créer un échange de shift |
| `/api/exchanges/[id]` | GET | Détails d'un échange |
| `/api/exchanges/[id]/accept` | POST | Accepter un échange proposé |
| `/api/marketplace` | GET | Lister les slots ouverts |
| `/api/marketplace/[id]/apply` | POST | Candidater sur un slot |
| `/api/push/subscribe` | POST | S'abonner aux notifications push |
| `/api/push/vapid-key` | GET | Récupérer la clé VAPID publique |

### Routes IA (Anthropic)

| Route | Méthodes | Modèle | Description |
|---|---|---|---|
| `/api/ai/chat` | POST | `claude-haiku-4-5-20251001` | Assistant manager — streaming SSE, contexte complet de l'établissement |
| `/api/ai/context` | GET | — | Suggestions proactives pour le manager (chips de démarrage) |
| `/api/ai/employee-chat` | POST | `claude-haiku-4-5-20251001` | Assistant employé — streaming SSE, données personnelles uniquement |
| `/api/ai/employee-context` | GET | — | Suggestions proactives pour l'employé |
| `/api/ai/plan` | POST | `claude-sonnet-4-6` | Génération automatique de planning via tool use (jusqu'à 12 itérations) |

**Rate limits IA (in-memory, par utilisateur) :**
- Chat manager : 30 requêtes / heure
- Chat employé : 20 requêtes / heure
- Génération de planning : 10 requêtes / heure

### Routes webhooks & intégrations

| Route | Description |
|---|---|
| `/api/calendar/[token]` | Flux iCal (`.ics`) du planning d'un employé, accès par token HMAC |
| `/api/pwa/icon` | Génération dynamique de l'icône PWA |

### API publique REST (v1)

Accessible via **Bearer token** (API token hashé en SHA-256, stocké dans `api_tokens`). Lecture seule, scoping par établissement.

| Route | Description |
|---|---|
| `/api/v1/shifts` | Liste des shifts (filtres : from, to, employee_id) |
| `/api/v1/employees` | Liste des employés actifs |
| `/api/v1/leaves` | Liste des demandes de congés |

---

## 6. Pages & navigation

### Structure des routes

L'application utilise deux **route groups** Next.js :

- `(auth)` — pages publiques non protégées
- `(dashboard)` — pages protégées par le middleware

### Pages manager (`/manager/*`)

| Route | Description |
|---|---|
| `/manager` | Dashboard principal avec modules et checklist d'onboarding |
| `/manager/planning` | Grille planning semaine avec drag & drop |
| `/manager/planning/print` | Vue d'impression du planning |
| `/manager/employees` | Liste des employés |
| `/manager/employees/new` | Créer un employé |
| `/manager/employees/[id]` | Fiche employé |
| `/manager/employees/[id]/edit` | Modifier un employé |
| `/manager/conges` | Gestion des demandes de congés |
| `/manager/echanges` | Validation des échanges de shifts |
| `/manager/marketplace` | Gestion du marketplace de remplaçants |
| `/manager/presences` | Suivi des pointages |
| `/manager/alertes` | Centre d'alertes (retards, absences, CDD expirants) |
| `/manager/analytics` | Analyses et statistiques |
| `/manager/compliance` | Vérification légale du planning |
| `/manager/rapport` | Rapport synthétique (export PDF) |
| `/manager/audit-log` | Journal d'audit |
| `/manager/help` | Aide et documentation |
| `/manager/settings` | Hub des paramètres |
| `/manager/settings/etablissement` | Infos établissement |
| `/manager/settings/organisation` | Nom et logo |
| `/manager/settings/postes` | Gestion des postes |
| `/manager/settings/contrats` | Types de contrats par défaut |
| `/manager/settings/conges` | Règles de congés |
| `/manager/settings/regles` | Règles de planning |
| `/manager/settings/alertes` | Configuration des alertes |
| `/manager/settings/integrations` | Webhooks, Slack, tokens API |
| `/manager/settings/exports` | Export de données |
| `/manager/settings/establishments` | Gestion multi-sites |

### Pages employé (`/employee/*`)

| Route | Description |
|---|---|
| `/employee` | Dashboard employé avec accès rapide |
| `/employee/planning` | Mon planning (vue personnelle) |
| `/employee/conges` | Mes demandes de congés |
| `/employee/echanges` | Mes échanges de shifts |
| `/employee/marketplace` | Reprendre un créneau disponible |
| `/employee/badgeuse` | Pointage avec sélection à la roue (time carousel) |

### Pages générales

| Route | Description |
|---|---|
| `/` | Redirect vers le dashboard selon le rôle |
| `/login` | Page de connexion |
| `/auth/callback` | Callback OAuth/magic link Supabase |
| `/auth/set-password` | Définir le mot de passe (employé invité) |
| `/offline` | Page affichée en mode hors ligne (PWA) |
| `/legal/cgu` | Conditions générales d'utilisation |
| `/legal/confidentialite` | Politique de confidentialité |
| `/legal/cookies` | Politique de cookies |
| `/legal/mentions-legales` | Mentions légales |

---

## 7. Composants clés

### Layout global

**`components/ui/app-shell.tsx`** — Shell principal wrappant toutes les pages dashboard. Gère :
- La `Topbar` (navigation, sélecteur d'établissement multi-sites, badges d'alertes)
- Le `BreadcrumbNav` (navigation contextuelle)
- Le `AiAssistant` (bouton flottant IA)
- Le `PageTransition` (animations de navigation)
- Le `OnboardingWizard` (wizard de première configuration)

### Planning

| Composant | Description |
|---|---|
| `planning/planning-grid.tsx` | Grille semaine manager avec drag & drop (dnd-kit), création/modification de shifts, affichage des congés |
| `planning/shift-modal.tsx` | Modal de création/édition d'un shift |
| `planning/planning-day.tsx` | Vue journalière |
| `planning/planning-week-timeline.tsx` | Vue timeline de la semaine |
| `planning/planning-month.tsx` | Vue mensuelle |
| `planning/employee-planning-grid.tsx` | Vue planning côté employé (lecture seule) |
| `planning/ai-plan-modal.tsx` | Modal de génération IA du planning complet |

### IA

**`components/ui/ai-assistant.tsx`** — Widget assistant IA flottant (Sparkles). Fonctionnalités :
- Ouverture/fermeture via bouton fixe
- Chargement des suggestions proactives au premier ouverture (endpoint `/api/ai/context`)
- Conversation en streaming (Server-Sent Events via `fetch` + `ReadableStream`)
- Rendu Markdown des réponses avec détection de blocs documents RH (`[DOC:...]...[/DOC]`)
- Actions : copier le document, imprimer, exporter
- Support du mode `manager` et `employee` (endpoints différents)

### Employés

| Composant | Description |
|---|---|
| `employees/employee-card.tsx` | Carte affichant les infos d'un employé |
| `employees/documents-tab.tsx` | Onglet gestion des documents RH |

### UI générique

| Composant | Description |
|---|---|
| `ui/topbar.tsx` | Barre de navigation supérieure avec sélecteur multi-établissements |
| `ui/sidebar.tsx` | Sidebar de navigation (settings) |
| `ui/push-subscribe.tsx` | Bouton d'abonnement aux notifications push |
| `ui/pwa-install-banner.tsx` | Bannière d'installation PWA (Add to Home Screen) |
| `ui/pwa-register.tsx` | Enregistrement du Service Worker |
| `ui/ical-copy-button.tsx` | Bouton copie du lien iCal personnel |
| `ui/time-carousel.tsx` | Sélecteur d'heure à roue (badgeuse mobile) |
| `ui/page-transition.tsx` | Animations de transition entre pages |
| `ui/skeleton.tsx` | Squelettes de chargement |

---

## 8. Assistant IA

### Architecture générale

L'IA est intégrée nativement avec deux modes distincts, tous deux utilisant le SDK Anthropic en streaming.

### Mode Manager — `/api/ai/chat`

**Contexte injecté dans le system prompt :**
- Liste des employés actifs (nom, poste, contrat, heures/semaine)
- 20 dernières demandes de congés avec statut
- 30 retards sur 30 jours (agrégés par employé avec stats)
- 60 shifts passés et 40 shifts à venir
- Slots marketplace ouverts et échanges en attente
- Paramètres établissement (convention collective, horaires d'ouverture)
- **Alertes proactives** générées automatiquement (retards répétés, jours sous-staffés, congés en attente, marketplace ouvert)

**Capacités de l'assistant manager :**
- Analyse RH (retards, absences, planning)
- Génération de **documents RH officiels** via balises `[DOC:Type]...[/DOC]` (avertissements, convocations, attestations, avenants)
- Conseils droit du travail CHR (IDCC 1501 & 1786)
- Suggestions d'optimisation planning
- Analyse des alertes légales

### Mode Employé — `/api/ai/employee-chat`

**Contexte injecté (données personnelles uniquement) :**
- Profil, contrat actif (type, heures, taux horaire, titre de poste)
- Planning des 14 prochains jours
- 10 dernières demandes de congés
- Retards sur 30 jours
- 20 dernières présences
- Solde de congés estimé

**Règles strictes :**
- Aucune donnée des collègues n'est accessible
- Lecture seule (pas de modification de données)
- Redirige vers le manager pour les procédures disciplinaires

### Génération de planning — `/api/ai/plan`

Utilise le **tool use** d'Anthropic (`claude-sonnet-4-6`) :
- L'IA appelle l'outil `propose_shift` pour chaque créneau à créer
- Maximum 12 itérations de tool use
- Respect des contraintes légales : 11h de repos minimum, 10h max/jour, 48h max/semaine, pause obligatoire > 6h
- Prise en compte des congés approuvés et en attente
- Les créneaux proposés sont retournés en JSON et peuvent être importés en un clic dans le planning

### Suggestions proactives — `/api/ai/context`

Endpoint GET générant 4 suggestions contextuelles (chips cliquables dans le widget) basées sur :
- Employés avec 3+ retards dans les 30 derniers jours
- Jours sous-staffés (< 2 personnes) dans les 7 prochains jours
- Congés en attente de validation
- Slots marketplace et échanges non traités

---

## 9. Variables d'environnement

Fichier de référence : `.env.example`

| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Oui | URL du projet Supabase (exposée côté client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Oui | Clé anonyme Supabase (exposée côté client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui | Clé service role Supabase — **jamais exposée côté client**, bypasse la RLS |
| `ANTHROPIC_API_KEY` | Non* | Clé API Anthropic pour l'assistant IA. Si absente, l'IA retourne une erreur 503 |
| `RESEND_API_KEY` | Non* | Clé API Resend pour les emails (invitations, planning, congés) |
| `RESEND_FROM_EMAIL` | Non* | Adresse email expéditrice vérifiée dans Resend |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Non** | Clé VAPID publique pour les notifications push |
| `VAPID_PRIVATE_KEY` | Non** | Clé VAPID privée pour les notifications push |
| `VAPID_EMAIL` | Non | Email de contact VAPID (défaut : `admin@nexus-app.fr`) |
| `CALENDAR_SECRET` | Non | Secret HMAC pour les tokens iCal (défaut : `nexus-calendar-2024`) |

*Obligatoire pour la fonctionnalité correspondante.

**Si absent, les clés VAPID sont auto-générées et stockées dans la table `settings` lors du premier abonnement push.

---

## 10. Patterns & conventions

### Architecture des données

- **Server Components par défaut** : les pages (`page.tsx`) fetchent les données Supabase côté serveur via `createClient()` (server). Pas de chargement client initial pour les données critiques.
- **Client Components** (`'use client'`) : utilisés uniquement pour l'interactivité (grille drag & drop, modals, formulaires, assistant IA).
- **Soft deletes** : les employés sont archivés (`archived = true`) plutôt que supprimés. Les shifts ont un champ `deleted_at` pour le soft delete.

### Multi-tenant

- Chaque requête Supabase filtre implicitement par `establishment_id` via la RLS.
- Le manager peut switcher d'établissement via `/api/establishments/switch`, qui met à jour `active_establishment_id` dans son profil.
- La fonction SQL `current_establishment_id()` résout l'établissement actif à chaque requête.

### Conformité légale (module compliance)

Le moteur de conformité (`lib/compliance/rules.ts`) analyse les shifts et détecte automatiquement 7 types de violations du Code du travail français :

| Règle | Sévérité | Référence légale |
|---|---|---|
| Repos quotidien < 11h | critique | Art. L3131-1 |
| Durée quotidienne > 10h | critique | Art. L3121-18 |
| Durée hebdomadaire > 48h | critique | Art. L3121-20 |
| Pause < 20 min pour shift > 6h | warning | Art. L3121-16 |
| Plus de 6 jours consécutifs | critique | Art. L3132-1 |
| Travail le dimanche | info | Art. L3132-3 |
| Travail de nuit (21h–6h, ≥ 1h) | warning | Art. L3122-2 |

### Webhooks sortants

Le système de webhooks (`lib/integrations/webhook.ts`) supporte :
- **Webhooks HTTP génériques** : payload JSON avec `{ event, timestamp, ...data }`
- **Slack Incoming Webhooks** : messages formatés en Markdown

**Événements disponibles :** `planning.published`, `leave.approved`, `leave.rejected`, `leave.requested`, `shift.created`, `shift.deleted`, `exchange.approved`

Chaque livraison est journalisée dans `webhook_logs` avec statut HTTP, durée et succès.

### Notifications push (PWA)

L'application est une **Progressive Web App** avec :
- Manifest (`app/manifest.ts`) pour l'installation sur mobile
- Service Worker (`components/ui/pwa-register.tsx`)
- Notifications push via Web Push API (VAPID)
- Page offline (`app/offline/page.tsx`)

Les clés VAPID peuvent être définies via les variables d'environnement ou auto-générées et stockées dans la table `settings`.

### API publique (v1)

L'API REST publique en `/api/v1/` est sécurisée par **Bearer token** :
1. Le manager génère un token depuis les Paramètres > Intégrations
2. Le token brut est affiché une seule fois, puis hashé (SHA-256) et stocké dans `api_tokens`
3. Chaque requête fournit le token brut dans l'header `Authorization: Bearer <token>`
4. Le serveur hash le token et compare avec la base — retourne `establishment_id` si valide
5. L'accès est en lecture seule et scopé à l'établissement du token

### Rate limiting

Implémentation in-memory (sliding window) dans `lib/rate-limit.ts`. Fonctionne par instance Node.js, donc sur Vercel (serverless), le compteur se remet à zéro sur cold start. Suffisant pour une protection de base contre l'abus.

### Conventions de code

- Tous les types domaine centralisés dans `types/index.ts`
- Composants UI génériques dans `components/ui/` (button, card, dialog, input, label, select, table, badge, skeleton, textarea)
- Utilitaires de dates dans `lib/utils/dates.ts`
- Utilitaire CSS `cn()` (clsx + tailwind-merge) dans `lib/utils.ts`
- Validation des inputs API via Zod (`lib/validations.ts`)
- Icônes : Lucide React
