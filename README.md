# Nexus

Application de gestion de planning pour la restauration et le commerce — développée par **Quartz**.

Plannings, pointages, congés, conformité contractuelle et communications RH dans une seule interface mobile-first.

---

## Stack technique

| Couche       | Technologie                                    |
|--------------|------------------------------------------------|
| Framework    | [Next.js 14](https://nextjs.org) (App Router)  |
| Base de données | [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS) |
| IA           | [Anthropic Claude](https://anthropic.com) (Haiku pour les briefs et alertes) |
| Emails       | [Resend](https://resend.com)                   |
| UI           | Tailwind CSS + Radix UI                        |
| Déploiement  | [Vercel](https://vercel.com)                   |

---

## Installation locale

```bash
git clone https://github.com/burtemaxence-ux/nexus.git
cd nexus

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir .env.local avec vos valeurs Supabase, Resend, etc.

# Lancer en développement
npm run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

---

## Variables d'environnement

Copier `.env.example` en `.env.local` et renseigner les valeurs. Les variables obligatoires sont :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
- `CRON_SECRET` — générer avec `openssl rand -hex 32`

Les variables optionnelles (IA, push notifications, rate limiting) sont documentées dans `.env.example`.

---

## Documentation

- [API v1](docs/api-v1.md) — endpoints REST lecture seule (shifts, employees, leaves)
- [Déploiement](docs/deployment.md) — Vercel, variables d'environnement, crons, migrations

---

## Configuration des push notifications

Générer les clés VAPID puis les ajouter dans `.env.local` :

```bash
npx web-push generate-vapid-keys
```

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<clé publique>
VAPID_PRIVATE_KEY=<clé privée>
VAPID_EMAIL=admin@nexus-app.fr
```

---

## Fonctionnalités principales

- **Planning** — création par drag & drop, publication par semaine, export PDF/iCal
- **Pointage** — badgeuse mobile avec code PIN, détection des oublis de pointage
- **Congés** — demandes employé, validation manager, soldes estimés
- **Conformité** — analyse contractuelle automatique (heures, CDD, période d'essai, Extra)
- **Brief hebdomadaire** — résumé RH généré par IA chaque lundi pour les managers
- **Intégrations** — Webhook sortant (Zapier/Make), Slack, iCal, API REST v1
- **PWA** — installable sur iOS et Android, notifications push
