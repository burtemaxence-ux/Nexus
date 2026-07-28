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

## ⏳ À traiter par Maxence — non contournable

Ces quatre points ne se lisent ni dans le code ni dans la base. **Un acquéreur sérieux les
demandera au deuxième échange** ; ne pas savoir y répondre coûte la crédibilité gagnée sur
tout le reste.

### J-1 · Structure juridique — *à écrire en une phrase*
Y a-t-il une société (SASU, micro-entreprise…) ou l'actif est-il détenu en nom propre ?
Détermine ce qui se vend (cession d'actif vs cession de titres) et le régime fiscal de la
vente. **Réponse attendue : le statut, et au nom de qui sont les comptes tiers du §1 du
runbook.**

Vérifier au passage que l'actif (code, domaine, marque) est bien détenu par l'entité qui
vend, et n'est pas resté éparpillé entre une société et le nom propre du fondateur.

### J-2 · Titularité de la propriété intellectuelle — *le point qui tue les deals*
Quelqu'un d'autre a-t-il écrit du code, un design, un texte ? Cofondateur, freelance,
stagiaire, prestataire ?

- **Si non** — l'écrire noir sur blanc dans le dossier : « développé intégralement par le
  cédant, aucun tiers n'a de droit ». C'est un argument, pas une formalité.
- **Si oui** — obtenir une **cession de droits écrite et signée** *avant* d'engager la
  discussion. Un échange d'emails explicite vaut mieux que rien. Une chaîne de titularité
  trouée découverte en due diligence arrête l'opération, et il sera trop tard pour la
  réparer depuis la gendarmerie.

### J-5 · Marque `Quartzbase`
Déposée à l'INPI, ou simple nom commercial et nom de domaine ? Si déposée : classe(s), date,
numéro — c'est un actif de plus à inscrire dans le one-pager. Si non déposée : le dire, sans
plus. À vérifier aussi qu'aucune marque antérieure proche n'existe dans la classe logiciel,
sous peine de vendre un nom que l'acquéreur devra changer.

### J-7 · Les deux abonnements Stripe — *échéances 4 et 16 août*
Sont-ils en mode *live* ? Si oui, tu te factures toi-même (2 × plan Multi-site).
**Deux raisons de les résilier maintenant, pas plus tard :** l'argent, et le fait qu'ils ne
doivent apparaître ni comme des clients dans une capture d'écran, ni comme du revenu dans un
tableau. Le dossier dit « 0 client, 0 revenu » — la base doit dire la même chose.

---

## Ce qu'un acquéreur vérifiera lui-même, et ce qu'il trouvera

| Sa vérification | Ce qu'il trouve |
|---|---|
| `npm install && npm test` | **262 tests verts, 26 fichiers** (relancés le 28/07) |
| `npm run build` | Build de production vert |
| Lecture de `lib/compliance` | **17 règles, les 17 testées** |
| Advisors Supabase | **0 avertissement de performance** ; 2 réglages de sécurité ouverts, documentés au §6 du runbook |
| `grep TODO\|FIXME` | **0 occurrence** sur 57 000 lignes |
| Table des utilisateurs | Données de démonstration uniquement — **conforme à ce que dit le dossier** |

**Le dernier point est le plus important de tous.** Chaque chiffre annoncé dans le one-pager
est reproductible en une commande. C'est ce qui rend crédible la seule affirmation qu'il ne
peut pas vérifier : que tu vends parce que tu entres en gendarmerie, et pas parce que quelque
chose ne va pas.

---

*Établi le 28 juillet 2026. Les états marqués ✅ ont été vérifiés dans le dépôt et la base de
production ce jour-là ; ils sont à revérifier si la cession se prolonge au-delà d'août.*
