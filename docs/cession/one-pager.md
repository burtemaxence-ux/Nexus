# Quartzbase — cession d'actif

**SaaS de planning et de conformité au droit du travail pour la restauration et le commerce.
Produit fini, en production, audité. Cédé par un fondateur qui n'en fera pas la vente.**

Contact : Maxence Burte — maxence.burte@gmail.com — `quartzbase.fr`

---

## Jugez par vous-même — sans inscription

**Démo manager :** `quartzbase.fr/demo?role=manager`
**Démo salarié :** `quartzbase.fr/demo?role=employee`

Ce ne sont ni des captures ni un enregistrement : ce sont **deux accès à
l'application réelle**, sur un établissement de démonstration de 8 salariés,
avec une visite guidée intégrée. Vous basculez d'un rôle à l'autre en un clic.
Modifiez ce que vous voulez — les données sont fictives et remises à zéro chaque
nuit, et aucune action n'y déclenche d'envoi réel.

*Il n'y a rien à recréer pour vous montrer le produit : la démo EST le produit.*

---

## À dire tout de suite

**Quartzbase n'a aucun client et ne génère aucun revenu.** Le produit a été construit, mis en
production et audité, mais jamais commercialisé : son auteur a construit le produit, pas
l'entreprise autour. La vente ne l'intéresse pas — et sans elle, il ne se passe rien.

Ce qui est proposé ici n'est donc pas un business avec des revenus à reprendre. C'est un
**produit fini et déjà durci en production** : un moteur de conformité au droit du travail
français dont l'interprétation a été tranchée et figée par des tests, une base multi-tenant
vérifiée, et des circuits de paiement couverts.

Écrire du code est devenu bon marché. **Savoir qu'il est juste ne l'est pas** — c'est ce qui
est vendu ici.

Le reste de ce document est vérifiable ligne à ligne dans le dépôt.

---

## Les trois chiffres

| | |
|---|---|
| **17** | règles du Code du travail français implémentées — **et les 17 couvertes par des tests unitaires** |
| **267** | tests automatisés, tous verts (28 fichiers), dont l'intégralité des circuits de facturation Stripe |
| **0** | avertissement de performance sur la base de données (advisors Supabase), et 0 TODO/FIXME dans le code |

---

## Le cœur de l'actif : le moteur de conformité

`lib/compliance` — un moteur autonome qui analyse un planning et remonte les infractions au
droit du travail français, règle par règle, avec le motif :

**Durées et repos** — repos quotidien · durée maximale quotidienne · durée maximale
hebdomadaire · durée moyenne sur période de référence · amplitude maximale · repos
hebdomadaire · jours consécutifs travaillés

**Organisation** — pauses obligatoires · travail du dimanche · travail de nuit · heures
contractuelles dépassées · coupures des temps partiels

**Travailleurs mineurs** (5 règles dédiées) — durée quotidienne · durée hebdomadaire ·
travail de nuit · repos quotidien · pauses

C'est la partie qui ne se code pas en un sprint : chaque règle demande une lecture du texte,
une décision d'interprétation, et des cas limites. Ici elles sont écrites, testées, et
isolées dans un module qui se branche indépendamment du reste de l'application.

---

## Ce qui est vendu avec

**Application complète** — 63 pages, 99 routes API, Next.js 14 (App Router), TypeScript
strict. Planning par glisser-déposer, pointage mobile par code PIN, congés et soldes,
remplacements, briefs RH hebdomadaires, centre d'alertes, journal d'audit.

**Infrastructure** — Supabase (PostgreSQL, Auth, RLS multi-tenant vérifiée), 48 migrations
appliquées et tracées, 9 tâches planifiées, CI GitHub Actions (typecheck + lint + tests +
build), monitoring Sentry, en-têtes de sécurité complets, PWA installable iOS/Android.

**Monétisation branchée et testée** — Stripe : 3 plans (49 / 89 / 149 € par mois), essai
30 jours, webhook signé et idempotent, système de parrainage avec remises réelles. Le circuit
de l'argent est couvert par des tests.

**Intelligence artificielle** — génération de planning sous contraintes, briefs hebdomadaires
managers, assistant conversationnel. Quotas en base, non contournables.

**Métier français** — export DSN mensuelle (NEODeS) pré-rempli, exports PDF et iCal,
API REST v1, webhooks sortants, intégration Slack.

**Nom et identité** — domaine `quartzbase.fr`, identité graphique complète (droits d'auteur
cédés), landing et 6 pages SEO réglementaires (`/code-du-travail`, `/conformite`,
`/securite`, `/guide-demarrage`…). *`Quartzbase` est un nom d'usage : **il n'y a aucun dépôt
INPI**, et aucune recherche d'antériorité n'a été conduite. À déposer par le repreneur s'il
souhaite un titre.*

---

## Points de transparence

Ce qu'un audit trouverait de toute façon. Autant le dire ici.

- **Aucune traction.** 0 client, 0 revenu, 0 trafic organique établi. La base de production
  ne contient que deux établissements — celui de la démonstration publique et
  l'environnement de test du fondateur — et **aucun abonnement** : la table est vide,
  c'est vérifiable en une requête.
- **Aucune donnée personnelle à transférer.** Corollaire du point précédent, et c'est une
  bonne nouvelle : pas de reprise de traitement RGPD, pas d'information des personnes
  concernées, pas de responsabilité héritée sur des données existantes.
- **Le produit n'a pas été confronté à des utilisateurs réels.** L'adoption côté employé,
  en particulier, n'est pas validée sur le terrain.
- **Le dépôt porte deux noms** : `Nexus` en interne, `Quartzbase` en façade. Le résidu est
  limité et inventorié (quelques clés de stockage local, en-têtes de webhook — déjà émis en
  double `X-Nexus-Event` / `X-Quartzbase-Event` —, identifiants iCal).
- **Le fondateur n'assurera pas l'exploitation dans la durée.** Une passation est possible au
  moment de la cession ; au-delà, un runbook d'exploitation complet est fourni pour que la
  reprise ne dépende pas de lui.

---

## Coût de détention : ≈ 0 € par mois

Toute la pile tourne sur des paliers gratuits — Vercel, Supabase, Resend, Sentry, GitHub.
L'IA fonctionne sur crédits prépayés : **10 € versés depuis le début du projet, 6 crédits
consommés en tout.** Le seul décaissement récurrent est le renouvellement annuel du domaine.

**Un repreneur peut donc détenir cet actif sans qu'il lui coûte quoi que ce soit** — le
garder en sommeil, prendre le temps de décider quoi en faire, sans que ça saigne.

À prévoir en revanche dès la mise en exploitation réelle : les paliers gratuits ne passent
pas à l'échelle, et le plan Vercel Hobby est réservé à un usage non commercial (passage en
Pro nécessaire). Le chiffre ci-dessus est un plancher d'infrastructure à zéro utilisateur,
pas un coût d'exploitation en charge.

*Les tâches planifiées tournent réellement : le contrôle de conformité hebdomadaire a produit
ses alertes le dimanche 26 juillet 2026 — vérifiable en base.*

---

## Propriété — chaîne de titularité sans aucun trou

**Un seul auteur, un seul titulaire, aucun tiers.** Le produit a été développé intégralement
par une seule personne : pas de cofondateur, pas de freelance, pas de prestataire, pas de
stagiaire. Aucun tiers n'a jamais écrit une ligne de code, un design ou un texte, et personne
ne détient de droit sur quoi que ce soit.

L'actif est détenu **en nom propre** — il n'y a aucune société, donc aucun associé, aucun
organe social, aucun passé de structure à reprendre. L'opération est une **cession d'actif**
pure : le repreneur prend le code, le domaine et la marque, et rien d'autre.

Le closing se fait par **contrat de cession signé**, portant garantie d'éviction. C'est la
situation la plus simple qu'un acquéreur puisse rencontrer, et elle supprime le poste qui
fait habituellement échouer les due diligences sur les petits actifs.

---

## Ce qui est fourni à la signature

Dépôt Git complet et son historique · base de données et migrations · runbook d'exploitation
(déploiement, secrets, tâches planifiées, restauration de sauvegarde) · audit technique
indépendant daté du 21/07/2026 · document d'architecture · domaine, marque et identité ·
transfert ou recréation documentée des comptes tiers.

---

## Prix

**À négocier. Cession sèche, sans participation conservée** — le cédant ne garde aucune part,
aucun droit de regard, aucun lien continu. Le repreneur reprend l'actif en entier, libre de
toute clause.

Pas de prix de réserve affiché : une reprise rapide et propre prime sur une négociation
longue.

---

*Chiffres relevés le 1er août 2026 dans le dépôt et la base de production. Suite de tests
relancée le jour même : 267 tests, 28 fichiers, 0 échec.*
