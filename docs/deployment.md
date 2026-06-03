# Déploiement sur Vercel

## Prérequis

- Compte [Vercel](https://vercel.com)
- Projet Supabase créé ([supabase.com](https://supabase.com))
- Compte [Resend](https://resend.com) pour les emails

---

## 0. Google OAuth — Configuration manuelle (requis pour la connexion Google)

L'erreur `Unsupported provider: provider is not enabled` signifie que le provider Google n'est pas activé dans le Dashboard Supabase. Ce n'est pas du code — c'est une configuration manuelle à faire une fois.

### Étapes

**1. Google Cloud Console**

1. Aller sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créer un projet ou sélectionner un projet existant
3. Menu → **API & Services** → **Bibliothèque** → rechercher **"Google Identity"** → Activer `Google Identity Toolkit API`
4. Menu → **API & Services** → **Identifiants** → **Créer des identifiants** → **ID client OAuth 2.0**
5. Type d'application : **Application Web**
6. Nom : `Quartzbase Production`
7. **Origines JavaScript autorisées** : `https://quartzbase.fr`
8. **URI de redirection autorisés** : `https://<votre-ref>.supabase.co/auth/v1/callback`
   - Récupérer l'URL exacte depuis Supabase Dashboard → Authentication → Providers → Google → "Callback URL (for OAuth)"
9. Copier le **Client ID** et le **Client Secret**

**2. Supabase Dashboard**

1. Aller sur [supabase.com](https://supabase.com) → votre projet
2. **Authentication** → **Providers** → **Google**
3. Activer le toggle **Enable Google provider**
4. Coller le **Client ID** et le **Client Secret** Google
5. Vérifier que **Redirect URL** contient bien `https://quartzbase.fr/auth/callback`
6. Sauvegarder

**3. Variable d'environnement**

S'assurer que `NEXT_PUBLIC_URL=https://quartzbase.fr` est configuré dans Vercel.

---

## 1. Déployer le projet

```bash
# Via Vercel CLI
npm i -g vercel
vercel --prod

# Ou importer depuis GitHub sur vercel.com/new
```

---

## 2. Variables d'environnement

À configurer dans **Vercel Dashboard > Settings > Environment Variables** :

### Obligatoires

| Variable                        | Description                                      |
|---------------------------------|--------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | URL de votre projet Supabase                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase (Settings > API)               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Clé service role Supabase (jamais exposée client)|
| `RESEND_API_KEY`                | Clé API Resend pour l'envoi d'emails             |
| `RESEND_FROM_EMAIL`             | Adresse expéditrice vérifiée dans Resend         |
| `CRON_SECRET`                   | Secret partagé pour sécuriser les crons          |
| `CALENDAR_SECRET`               | Secret de signature des tokens iCal (**REQUIS** — sans lui le service iCal est indisponible au démarrage) |

Générer `CRON_SECRET` et `CALENDAR_SECRET` :
```bash
openssl rand -hex 32
```

### Optionnelles

| Variable                          | Description                                  |
|-----------------------------------|----------------------------------------------|
| `ANTHROPIC_API_KEY`               | Assistant IA + génération de briefs          |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`    | Push notifications Web — clé publique        |
| `VAPID_PRIVATE_KEY`               | Push notifications Web — clé privée          |
| `VAPID_EMAIL`                     | Email contact VAPID (ex: admin@nexus-app.fr) |
| `KV_URL`                          | Vercel KV — rate limiting distribué          |
| `KV_REST_API_URL`                 | Vercel KV REST URL                           |
| `KV_REST_API_TOKEN`               | Vercel KV token                              |

Générer les clés VAPID :
```bash
npx web-push generate-vapid-keys
```

---

## 3. Crons Vercel

Les crons sont définis dans `vercel.json` et s'activent automatiquement au déploiement. Ils nécessitent le plan **Hobby ou supérieur**.

| Endpoint                              | Schedule          | Description                          |
|---------------------------------------|-------------------|--------------------------------------|
| `/api/cron/check-missing-clockout`    | `0 23 * * *`      | Rappel pointage sortie manquant      |
| `/api/cron/check-replacements`        | `0 22 * * *`      | Relance + expiration remplacements   |
| `/api/cron/compliance-check`          | `0 22 * * 0`      | Analyse contractuelle hebdomadaire   |
| `/api/cron/weekly-brief-manager`      | `0 7 * * 1`       | Brief RH hebdo pour les managers     |
| `/api/cron/weekly-summary-employee`   | `0 18 * * 5`      | Résumé de semaine pour les employés  |

Le header `Authorization: Bearer <CRON_SECRET>` est vérifié sur chaque endpoint cron. Vercel l'envoie automatiquement depuis le Dashboard si `CRON_SECRET` est configuré.

---

## 4. Migrations Supabase

Appliquer les migrations dans l'ordre depuis `supabase/migrations/` :

```bash
# Via Supabase CLI
supabase db push

# Ou manuellement dans Supabase Dashboard > SQL Editor
# Exécuter chaque fichier 001_initial.sql → 033_performance_indexes.sql
```

---

## 5. Sentry (monitoring erreurs production)

Sentry permet de capturer les erreurs serveur en production et de les remonter en temps réel.

### Créer un projet Sentry gratuit

1. Aller sur [sentry.io](https://sentry.io) → créer un compte (plan gratuit suffit)
2. **Create Project** → choisir **Next.js** comme plateforme
3. Récupérer les informations suivantes :

| Information           | Où la trouver                                                    |
|-----------------------|------------------------------------------------------------------|
| **DSN**               | Project Settings → Client Keys (DSN)                            |
| **SENTRY_ORG**        | URL de votre orga : `sentry.io/organizations/<org-slug>/`       |
| **SENTRY_PROJECT**    | Project Settings → General → Project Slug                       |
| **SENTRY_AUTH_TOKEN** | Settings → Auth Tokens → Create New Token (scopes : `project:releases`, `org:read`) |

4. Ajouter dans Vercel Dashboard > Settings > Environment Variables :

| Variable                  | Valeur                               |
|---------------------------|--------------------------------------|
| `NEXT_PUBLIC_SENTRY_DSN`  | Le DSN copié depuis sentry.io        |
| `SENTRY_ORG`              | Slug de votre organisation Sentry    |
| `SENTRY_PROJECT`          | Slug de votre projet Sentry          |
| `SENTRY_AUTH_TOKEN`       | Token pour l'upload des source maps  |

Sans `NEXT_PUBLIC_SENTRY_DSN`, Sentry est silencieusement désactivé — l'app fonctionne normalement.
Sans `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN`, les source maps ne sont pas uploadées et les stack traces en production restent minifiées (illisibles).

### Vérifier le fonctionnement

Après déploiement, vérifier qu'une erreur test remonte sur sentry.io avec une stack trace lisible (non minifiée).

---

## 6. Healthcheck endpoint

L'endpoint `GET /api/health` permet de monitorer l'app sans authentification.

### Réponse type (HTTP 200 si tout va bien, 503 si la DB est en erreur)

```json
{
  "status": "ok",
  "version": "a1b2c3d",
  "timestamp": "2025-05-30T10:00:00.000Z",
  "uptime": 3600.5,
  "services": {
    "database": { "status": "ok", "latency_ms": 42 },
    "ai":       { "status": "configured" },
    "email":    { "status": "configured" },
    "push":     { "status": "configured" },
    "slack":    { "status": "not_configured" }
  }
}
```

### Utilisation

- **Vercel** : configurer une alerte sur le statut HTTP dans Dashboard > Monitoring
- **UptimeRobot / Better Stack** : surveiller `https://votre-domaine.fr/api/health` toutes les 5 minutes
- **Scripts CI/CD** : `curl -f https://votre-domaine.fr/api/health` pour vérifier le déploiement

> Note : `robots.ts` bloque déjà l'indexation de `/api/*` via `disallow: '/'`.

---

## 7. Sécurité — Protection brute force sur l'authentification

### Architecture auth

L'authentification utilise `supabase.auth.signInWithPassword()` appelé **côté client** (browser → Supabase Auth API directement). Il n'y a pas de route handler Next.js pour la connexion.

### Protection native Supabase

Supabase fournit une protection brute force intégrée sur son endpoint `/auth/v1/token` :
- Limite le nombre de tentatives par IP et par email
- Active par défaut, configurable dans **Supabase Dashboard > Authentication > Rate Limits**

### Protection côté Next.js

Le seul handler serveur lié à l'auth (`/auth/callback`) est rate-limité à **10 requêtes/minute/IP** via `lib/rate-limit.ts` (KV Redis en production, in-memory en dev).

### Renforcement recommandé

Pour un niveau de protection maximal, configurer dans **Supabase Dashboard > Authentication > Rate Limits** :
- `Max sign-in attempts` : 5 par heure
- `Max sign-up attempts` : 3 par heure
- Activer la protection CAPTCHA si des abus sont détectés (Supabase × hCaptcha)

---

## 8. Vérifications post-déploiement

- [ ] Connexion Supabase : créer un compte et accéder au dashboard
- [ ] Emails : inviter un employé et vérifier la réception
- [ ] Push notifications : activer depuis un navigateur mobile
- [ ] Crons : déclencher manuellement depuis Vercel Dashboard > Crons
- [ ] API v1 : créer un token dans Paramètres > Intégrations et tester un endpoint
- [ ] Sentry : vérifier qu'une erreur test remonte sur sentry.io
- [ ] Healthcheck : `curl https://votre-domaine.fr/api/health` retourne HTTP 200
- [ ] Auth rate limits : configurer dans Supabase Dashboard > Authentication > Rate Limits
