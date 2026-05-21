# Configuration Supabase pour D-pot

Ce guide vous explique comment configurer votre projet Supabase pour l'application D-pot.

## 1. Créer un compte et un projet Supabase

1. Rendez-vous sur [supabase.com](https://supabase.com) et créez un compte
2. Cliquez sur **"New project"**
3. Choisissez votre organisation, donnez un nom à votre projet (ex: `d-pot`) et choisissez un mot de passe pour la base de données
4. Sélectionnez la région la plus proche (ex: `West EU (Paris)`)
5. Attendez que le projet soit créé (environ 1-2 minutes)

## 2. Récupérer les clés API

1. Dans votre projet Supabase, allez dans **Settings > API**
2. Copiez les valeurs suivantes :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys > anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Mettez ces valeurs dans votre fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon
```

## 3. Exécuter la migration SQL

1. Dans votre projet Supabase, allez dans **SQL Editor**
2. Cliquez sur **"New query"**
3. Copiez et collez le contenu du fichier `migrations/001_initial.sql`
4. Cliquez sur **"Run"** pour exécuter le script

Cela va créer :
- La table `profiles` avec les colonnes nécessaires
- Les politiques RLS (Row Level Security)
- Le trigger pour créer automatiquement un profil à l'inscription

## 4. Créer le premier utilisateur manager

1. Dans votre projet Supabase, allez dans **Authentication > Users**
2. Cliquez sur **"Add user" > "Create new user"**
3. Remplissez les champs :
   - **Email** : votre adresse email
   - **Password** : un mot de passe sécurisé
4. Après création, cliquez sur l'utilisateur pour modifier ses métadonnées
5. Dans le champ **"Raw User Meta Data"**, ajoutez :

```json
{
  "role": "manager",
  "full_name": "Votre Nom"
}
```

6. Cliquez sur **"Save"**

## 5. Créer des utilisateurs employés

Répétez l'étape 4 pour chaque employé, mais utilisez :

```json
{
  "role": "employee",
  "full_name": "Nom Employé"
}
```

## Structure de la base de données

### Table `profiles`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | `uuid` | Identifiant (lié à `auth.users`) |
| `email` | `text` | Adresse email |
| `full_name` | `text` | Nom complet |
| `role` | `text` | Rôle : `manager` ou `employee` |
| `created_at` | `timestamptz` | Date de création |
| `updated_at` | `timestamptz` | Date de mise à jour |

## Dépannage

### Le build échoue avec des erreurs Supabase

Vérifiez que votre fichier `.env.local` contient les bonnes valeurs.

### L'utilisateur ne peut pas se connecter

Vérifiez que les métadonnées `role` et `full_name` sont bien configurées dans Supabase Auth.

### Les redirections ne fonctionnent pas

Vérifiez que le middleware est correctement configuré et que les routes correspondent aux rôles.
