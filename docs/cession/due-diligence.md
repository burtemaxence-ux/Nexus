# Due diligence — réponses préparées

Reprend les blocages du §4 du plan de cession. **Ce qui était vérifiable dans le code et la
base l'a été le 28/07/2026** ; le reste attend Maxence et n'est pas contournable.

Principe : tout ce qui est ci-dessous sera trouvé par l'acquéreur de toute façon. Le dire en
premier coûte peu et achète la crédibilité du reste du dossier.

---

## ✅ Vérifié — J-3 · Transférabilité des comptes

Neuf services tiers, inventoriés avec leur mode de transfert dans
**`docs/cession/runbook-reprise.md` §1**.

**Le seul point dur : Stripe.** Le compte est adossé à une entité légale et à une
vérification d'identité — il ne se transfère pas. Le repreneur ouvre son compte et recrée les
6 produits (procédure : `deployment.md` §8). **Aucun abonnement client actif n'est à migrer**,
donc l'opération est indolore ici.

Le reste se transfère nativement (GitHub, Vercel, Supabase, Sentry) ou se recrée en quelques
minutes (Resend, Anthropic, Twilio).

---

## ✅ Vérifié — J-4 · Dualité de nom `Nexus` / `Quartzbase`

Le dépôt s'appelle `Nexus`, le produit `Quartzbase`. Inventaire complet du résidu :

| Où | Quoi | Impact d'un renommage |
|---|---|---|
| `package.json`, CI, `ARCHITECTURE.md` | Nom du projet | Cosmétique |
| `components/onboarding/onboarding-wizard.tsx` | Clé de stockage local `nexus-onboarding-step` | Réinitialise l'étape d'onboarding des utilisateurs existants — sans objet ici |
| `app/legal/cookies/page.tsx` | La clé ci-dessus est **citée dans la page cookies** | À renommer **en même temps**, sinon la page ment |
| `lib/integrations/ical.ts` | Identifiants d'événements `nexus-<id>@nexus` | Changerait l'identité des événements dans les calendriers déjà synchronisés |
| `lib/integrations/webhook.ts` | En-têtes `X-Nexus-Event` | **Déjà émis en double** avec `X-Quartzbase-Event` : un consommateur peut basculer sans rupture |
| `lib/exports/dsn.ts`, `components/ui/sidebar.tsx` | Commentaires | Aucun |

**Conclusion vendable :** le renommage est contenu — une poignée de fichiers, aucune
dépendance externe cassée, et le chemin de migration des webhooks est déjà en place. Ce
qu'il faut dire à l'acquéreur : *« le produit est Quartzbase, le dépôt s'appelle Nexus,
voici les six endroits où ça se voit. »*

---

## ✅ Vérifié — J-6 · Données personnelles

**Aucune donnée personnelle réelle en base.** 19 profils : 14 comptes de démonstration
(`@demo.qb.fr`, `@nexus-demo.fr`), 4 comptes du fondateur et de son entourage
(`@gmail.com`), 1 compte d'administration (`@quartzbase.fr`). Une seule adresse s'est
connectée depuis la création du projet.

**Champs sensibles — état réel :**

| Champ (`public.profiles`) | Renseigné |
|---|---|
| `iban` | **0 / 19** |
| `social_security_number` | **0 / 19** |
| `birth_date` | **0 / 19** |
| `address` | **0 / 19** |
| `phone` | 16 / 19 (numéros de démonstration) |

**Ce qui se vend ici** : pas de reprise de traitement, pas d'information des personnes
concernées, pas de responsabilité héritée. Sur une cession de SaaS, c'est habituellement le
poste le plus lourd — ici il est vide.

### ⚠️ À déclarer spontanément

Le schéma est **conçu pour collecter** un numéro de sécurité sociale et un IBAN
(`public.profiles`, ajoutés par la migration 067), stockés **en texte clair**, protégés par
les seules politiques RLS — pas de chiffrement au niveau colonne. Les colonnes sont vides
aujourd'hui, donc il n'y a aucune exposition.

Mais l'acquéreur hérite de la décision de conception, et son conseil la relèvera :

- En France, le **NIR** relève d'un régime d'usage restreint — sa collecte doit être
  justifiée par une finalité admise (paie, déclarations sociales), ce qui est cohérent avec
  l'export DSN présent dans le produit, mais doit être documenté.
- Un **IBAN** en clair appelle des mesures de sécurité proportionnées dès qu'il est
  réellement collecté.

**Le dire nous-mêmes, et le présenter pour ce que c'est :** une décision à prendre *avant*
la mise en service réelle, pas une dette. Un repreneur qui ne veut pas de ces champs les
supprime en une migration, aucune donnée n'étant à conserver. C'est bien plus confortable
que de découvrir la question avec 500 salariés en base.

*Aucun registre RGPD n'a été tenu (relevé comme ouvert par l'audit du 21/07). Sans traitement
réel, il n'y avait rien à inscrire — mais le repreneur devra en ouvrir un dès le premier
client.*

---

## ✅ Répondu le 30/07 — J-2 · Titularité de la propriété intellectuelle

**Développé intégralement par une seule personne. Aucun tiers n'a jamais écrit une ligne de
code, un design ou un texte : pas de cofondateur, pas de freelance, pas de prestataire, pas
de stagiaire.**

C'est le point qui tue le plus de cessions, et il est ici dans son meilleur état possible.
**À écrire tel quel dans le dossier** — ce n'est pas une formalité, c'est un argument :
aucune cession de droits à obtenir, aucun tiers à faire signer, aucune revendication
possible après la vente.

## ✅ Répondu le 30/07 — J-1 · Structure juridique

**Aucune société. L'actif est détenu en nom propre par le fondateur, personne physique.**

Combiné à J-2, ça donne la situation de propriété la plus simple qui existe : **un seul
titulaire, aucun associé, aucun organe social, aucun tiers ayant un droit quelconque.**
Rien à démêler.

**Ce que ça implique concrètement :**

| Point | Conséquence |
|---|---|
| **Nature de l'opération** | Nécessairement une **cession d'actif** — il n'y a pas de titres à céder. C'est le cas le plus simple, et celui que tous les acquéreurs visés préfèrent : ils reprennent le code, le domaine et la marque, sans reprendre une structure ni son passé |
| **Document de closing** | Un **contrat de cession** signé, pas une facture. Un particulier ne facture pas — le contrat est la pièce comptable de l'acquéreur. Il énumère ce qui est transféré (dépôt et historique, droits d'auteur sur le code, domaine, marque, base et migrations) et porte la garantie d'éviction : *je suis seul auteur, aucun tiers n'a de droit* — ce que J-2 permet d'affirmer sans réserve |
| **Comptes tiers** | Ils sont au nom du fondateur en personne. Sans conséquence pour GitHub, Vercel, Supabase, Resend, Anthropic, Sentry, le registrar. **Stripe est le seul à vérifier** : le compte est adossé à une identité, il ne se transfère pas — mais c'était déjà la conclusion du runbook §1, et il n'y a aucun abonnement client à migrer |
| **Fiscalité** | Le produit de la vente est un revenu à déclarer. Aux montants en jeu (`valorisation.md` : quelques milliers d'euros), l'enjeu est faible — **une question à un comptable, pas un obstacle**. À régler avant de signer, pas avant d'envoyer les emails |

**Aucun de ces points n'est bloquant.** Ne pas créer de société pour vendre : le coût et le
délai dépasseraient le produit attendu de la vente.

## ✅ Résolu le 30/07 — J-7 · Les deux abonnements Stripe

**Supprimés. La table `subscriptions` est vide : 0 ligne, 0 abonnement actif.**

Vérification faite d'abord : les deux lignes portaient bien un `stripe_customer_id` et un
`stripe_subscription_id`, **mais ces identifiants n'existent chez Stripe ni en mode live ni
en mode test**. C'étaient des valeurs semées en dur, jamais passées par un paiement réel.
Conclusion : **aucun euro n'a jamais été débité, et la suppression n'a touché à rien
d'externe** — il n'y avait aucun abonnement à résilier côté Stripe.

Ce qui rend le dossier vérifiable sans réserve : la base dit désormais exactement ce que dit
le one-pager — **0 client, 0 revenu, 0 abonnement**. Un acquéreur qui ouvre la table n'y
trouve plus rien à interpréter.

*Reste une ligne dans `referrals` : un code de parrainage `pending`, jamais utilisé
(`referred_id` nul, remise 0 %). Ce n'est ni un client ni un revenu — laissé en place,
il ne contredit rien.*

**Une nuance à connaître, visible dans le code :** l'établissement de démonstration est
traité comme un abonné Multi-site par `lib/subscription.ts`, afin qu'un visiteur voie le
produit entier plutôt qu'un mur de paiement. Cet abonnement est **synthétisé à la lecture,
jamais écrit** : la table `subscriptions` reste vide. C'est précisément pour cela qu'il a
été fait ainsi — la base devait continuer à dire la même chose que ce document.

---

## ✅ Répondu le 30/07 — J-5 · Marque `Quartzbase`

**Aucun dépôt INPI. Le projet est resté au stade du code : `Quartzbase` est un nom d'usage
et un nom de domaine, pas une marque enregistrée.**

**Ce qui se transfère malgré tout :**

| Élément | Statut |
|---|---|
| Domaine `quartzbase.fr` | ✅ Transférable (code AuthInfo) |
| Identité graphique (lockup, symbole, versions mono) | ✅ Œuvres originales, droits d'auteur cédés au repreneur par le contrat de cession |
| Le nom lui-même | ⚪ Usage libre, sans titre de propriété industrielle |
| Notoriété attachée au nom | ⚪ Nulle — corollaire de l'absence de trafic et de clients |

**À dire à l'acquéreur, sans le minimiser :** il n'achète pas une marque protégée. S'il veut
un titre, il dépose lui-même — l'ordre de grandeur est de quelques centaines d'euros pour
une classe à l'INPI, ce qui est marginal face au prix de cession, et il déposera de toute
façon à son nom plutôt qu'au nôtre. **L'absence de dépôt n'est donc pas une perte de valeur
ici, c'est une étape qu'il aurait refaite.**

### ⚠️ Ce qui n'a PAS été vérifié — à dire aussi

**Aucune recherche d'antériorité n'a été conduite dans les registres** (INPI, EUIPO). Une
recherche web menée le 30/07 ne fait apparaître **aucune entité nommée « Quartzbase »** — ce
qui est rassurant en pratique, mais **une recherche web n'est pas une recherche de marque**.
Plusieurs sociétés françaises du logiciel utilisent la racine « Quartz » (Quartz Ingénierie,
Quartz Informatique, Quartz-Pharma, et Quartzy aux États-Unis) sans qu'aucune ne porte ce
nom-là.

Le dire tel quel dans la discussion. Un acquéreur qui veut déposer fera lui-même la recherche
d'antériorité — c'est sa décision et son budget, pas le nôtre, et prétendre le contraire
serait une garantie qu'on ne peut pas tenir.

### J-7 · Les deux abonnements Stripe — *échéances 4 et 16 août*
Sont-ils en mode *live* ? Si oui, tu te factures toi-même (2 × plan Multi-site).
**Deux raisons de les résilier maintenant, pas plus tard :** l'argent, et le fait qu'ils ne
doivent apparaître ni comme des clients dans une capture d'écran, ni comme du revenu dans un
tableau. Le dossier dit « 0 client, 0 revenu » — la base doit dire la même chose.

---

## Ce qu'un acquéreur vérifiera lui-même, et ce qu'il trouvera

| Sa vérification | Ce qu'il trouve |
|---|---|
| `npm install && npm test` | **267 tests verts, 28 fichiers** (relancés le 01/08) |
| `npm run build` | Build de production vert |
| Lecture de `lib/compliance` | **17 règles, les 17 testées** |
| Advisors Supabase | **0 avertissement de performance** ; 2 réglages de sécurité ouverts, documentés au §6 du runbook |
| `grep TODO\|FIXME` | **0 occurrence** sur 57 000 lignes |
| Table des utilisateurs | Données de démonstration uniquement — **conforme à ce que dit le dossier** |

**Le dernier point est le plus important de tous.** Chaque chiffre annoncé dans le one-pager
est reproductible en une commande. C'est ce qui rend crédible la seule affirmation qu'il ne
peut pas vérifier : que tu vends parce que la partie commerciale ne t'intéresse pas, et pas
parce que quelque chose ne va pas.

---

*Établi le 28 juillet 2026. Les états marqués ✅ ont été vérifiés dans le dépôt et la base de
production ce jour-là ; ils sont à revérifier si la cession se prolonge au-delà d'août.*
