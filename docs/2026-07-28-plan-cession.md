# PLAN DE CESSION — QUARTZBASE

**Date :** 28 juillet 2026
**Décision source :** `docs/2026-06-16-decision-trajectoire.md` (point de contrôle du 28/07 —
0 client payant mesuré en base → Piste B)
**Horizon :** ⚠️ **Calendrier révisé le 30/07 — l'échéance de septembre ne s'applique plus.**
Il n'y a plus de butée externe. Le rythme est donné par deux contraintes réelles : **août est
mort en France** (personne ne lit ses emails entre le 1er et le 25), et **l'actif se déprécie**
(dépendances, coûts d'infra, marché qui bouge). D'où : préparation en août, envoi le 25 août,
décision mi-septembre.
**Budget d'effort total :** ~5 jours de travail, étalés. Si une action de ce plan demande plus
que son estimation, c'est qu'elle est mal cadrée — la couper, pas l'étirer.

---

## 0. LE RAISONNEMENT (pourquoi ce plan est dans cet ordre)

La tentation naturelle est de préparer d'abord (runbook, dossier, valorisation) puis de
contacter. **C'est l'ordre qui fait échouer les cessions courtes.**

La ressource rare ici n'est pas ton temps de travail : c'est le **temps calendaire**. Un
éditeur met 1 à 3 semaines à répondre à un email entrant, et autant à faire tourner une
décision en interne. Compte **deux mois entre le premier email et une réponse ferme**, quelle
que soit la qualité du dossier. C'est incompressible, et c'est le seul poste du plan que tu
ne contrôles pas.

Conséquence, qui structure tout le reste :

> **Les premiers emails partent le 25 août** — le premier jour où les décideurs français
> sont rentrés. Envoyer avant, c'est écrire dans le vide ; envoyer plus tard, c'est laisser
> l'actif se déprécier pour rien.
>
> **La contrepartie de ce report : le paquet part complet.** Sans butée, la raison qui
> imposait d'envoyer un one-pager seul disparaît — autant approcher avec `lib/compliance`
> déjà packagé, ce qui se voit directement dans le prix.

Le deuxième principe : **ne pas jouer une seule thèse d'acquisition.** Les trois thèses du
§2 s'adressent à des acheteurs différents, avec des pitchs et des prix différents, et
surtout **elles ne se disputent pas ton temps** — les emails partent le même jour. Jouer la
seule thèse « un éditeur va acheter mon SaaS » revient à tout miser sur l'issue la moins
probable.

---

## 1. CE QUI EST VENDU — inventaire vérifié le 28/07/2026

Chiffres relus dans le repo et la prod ce jour, pas repris des audits (certains y sont
sous-estimés).

| Actif | État vérifié |
|---|---|
| **Moteur de conformité** `lib/compliance` | **17 règles** de droit du travail français implémentées, **les 17 couvertes par des tests** — repos quotidien/hebdo, durées max jour/semaine/moyenne, pauses, jours consécutifs, dimanche, nuit, amplitude, heures contractuelles, coupures temps partiel, **et 5 règles spécifiques aux mineurs**. *(L'audit du 21/07 annonçait 8 règles : il sous-comptait.)* |
| Base de code | 57 189 lignes TS/TSX, Next.js 14 App Router, TypeScript strict, 0 TODO/FIXME |
| Tests | **267 tests / 28 fichiers, tous verts** (relancés le 01/08) — dont les circuits d'argent Stripe |
| Base de données | Supabase Postgres, 39 migrations trackées, RLS multi-tenant vérifiée, **0 advisor de performance** |
| Surface applicative | 63 pages, 99 routes API, PWA installable, API REST v1, webhooks sortants, Slack, iCal |
| Facturation | Stripe branché et testé : 3 plans (49 / 89 / 149 €/mois), essai 30 j, parrainage, dunning |
| IA | Intégration Anthropic : génération de planning, briefs hebdo (Batch API), chat manager |
| Marque & domaine | `quartzbase.fr`, identité complète (SVG lockup + symbole, mono clair/sombre) |
| Vitrine | Landing + 6 pages SEO réglementaires (`/code-du-travail`, `/conformite`, `/securite`…) |
| Exports métier | PDF, iCal, **DSN mensuelle (NEODeS) pré-remplie** |
| **Ce qui n'est PAS vendu** | **Aucun client, aucun revenu, aucun trafic.** À dire en premier, pas à faire découvrir. |

**Le point à comprendre pour vendre :** ce qui a de la valeur ici n'est pas « une app de
planning » — il en existe trente. C'est **le moteur de conformité au droit du travail
français, testé**, plus le fait qu'il soit déjà emballé dans un produit fini. Ça ne
s'achète pas pour gagner de l'argent tout de suite, ça s'achète pour **gagner 6 mois**.

---

## 2. TROIS THÈSES D'ACQUISITION — à jouer en parallèle, jamais à mélanger

| | **A — Time-to-market conformité** | **B — Comblement de gamme** | **C — Reprise d'actif** |
|---|---|---|---|
| **Qui** | Acteur RH/planning étranger ou adjacent qui veut entrer sur le marché français CHR | Éditeur caisse / paie / compta qui a déjà des clients CHR mais pas de module planning | Développeur indépendant, petit studio, repreneur de side-projects |
| **Ce qu'il achète** | Le moteur `lib/compliance` + les pages réglementaires. Le reste est un bonus | L'app entière, à rebrander et brancher sur sa base clients | Un codebase fini, auditté, qu'il relance sous son nom |
| **Ce à quoi il compare** | Le coût de faire coder + valider 17 règles de droit français : plusieurs mois de dev + conseil juridique | Son coût de build interne (~6 mois de dev pour cette surface) | Le prix d'autres projets finis sans traction |
| **Pitch en une ligne** | « 17 règles du Code du travail français, implémentées et testées, prêtes à brancher » | « Votre module planning conforme, livré fini, à votre marque » | « SaaS complet, 267 tests verts, 0 dette, prêt à relancer » |
| **Canal** | Email direct au Head of Product / Country Manager France | Email direct au fondateur / dir. produit | Marketplaces (Acquire.com, Flippa, side-project boards) + communautés indie FR |
| **Probabilité** | 🔴 Faible | 🟠 Moyenne-faible | 🟢 La plus élevée |
| **Délai de closing** | 4-8 semaines | 3-6 semaines | 1-3 semaines — **de loin le plus rapide** |
| **Ordre de grandeur** | Le plus haut | Intermédiaire | Le plus bas |

**Sur les prix — à lire avant de citer un chiffre à qui que ce soit.** Je ne mets pas de
fourchette en euros dans ce plan : je n'ai pas de comparables sourcés, et un chiffre inventé
ici deviendrait ton point d'ancrage en négociation, ce qui est le pire résultat possible.
La méthode correcte, et elle est simple :

1. **Ne cite aucun prix dans le premier email.** Tu n'as pas l'information ; l'acheteur, si.
2. **Fais parler le premier.** « Qu'est-ce que ça représente pour vous ? » En cession
   d'actif sans revenu, celui qui annonce un chiffre en premier plafonne la discussion.
3. **Les 3 premières réponses fixent la fourchette réelle.** Note-les, elles valent tous
   les benchmarks.
4. **Le seul plancher qui se défend :** un actif sans revenu ne se valorise pas sur un
   multiple — l'acheteur compare à son coût de *build*. ⚠️ **Mis à jour le 28/07 :** ce coût
   s'est effondré de 65-75 % avec les agents de codage. **Ne plus argumenter sur le volume
   de code** — ça appelle « je le refais avec une IA ». Argumenter sur le droit vérifié et
   le durcissement production. Analyse chiffrée et fourchettes : `docs/cession/valorisation.md`.

**Attention, contre-intuitif :** les concurrents directs sur le planning CHR sont les
**pires** cibles. Ils ont déjà le module, ils préfèrent recoder, et une prise de contact
leur donne surtout de l'information gratuite sur toi. Ne les approche qu'en dernier recours.

---

## 3. CALENDRIER

### Cette semaine — 30 juillet → 3 août : **débloquer**

Quatre choses, et elles ne dépendent que de toi. Total : **~2 heures.** Tout le reste est déjà écrit.

| ID | Action | Effort | Critère de succès |
|----|--------|--------|-------------------|
| **C-1** | ~~One-pager de cession~~ | — | ✅ **fait le 28/07** → `docs/cession/one-pager.md`. Reste : l'exporter en PDF et y ajouter 4 captures |
| **C-2** | ~~Liste de cibles~~ | — | ✅ **fait le 28/07** → `docs/cession/cibles.md` : 15 cibles, « pourquoi eux » rédigé pour les 10 de A et B, sources vérifiées. **Reste à Maxence : trouver les 10 contacts nominatifs** (méthode dans le fichier) |
| **C-3** | ~~Vidéo démo~~ | — | ✅ **remplacée le 01/08 par mieux : deux démos en libre-service.** `quartzbase.fr/demo?role=manager` et `?role=employee` ouvrent l'application réelle sur un établissement peuplé, avec visite guidée intégrée. Un acquéreur se sert lui-même à 2 h du matin au lieu de demander un rendez-vous — et il n'y a aucune vidéo à refaire quand le produit bouge |
| **C-4** | **Envoi de la vague 1 : 10 emails** (5 thèse A + 5 thèse B), personnalisés sur la ligne « pourquoi eux » | 2 h | ✍️ trames prêtes → `docs/cession/emails-approche.md` (+ script de réponse à « combien vous en voulez ? »). **10 emails partis le 31/07** |
| **C-5** | **Annonce marketplace (thèse C)** publiée en parallèle | 1 h | ✍️ texte prêt → `docs/cession/emails-approche.md`. Annonce en ligne le 3/08 (**le prix reste à fixer**) |

> **Le seul indicateur qui compte cette semaine : 10 emails partis + 1 annonce en ligne.**
> Pas « dossier avancé ». Si le 31/07 au soir rien n'est parti, le plan a déjà échoué.

### Août — 4 → 24 août : **préparer sans se presser**

| ID | Action | Effort | Critère de succès |
|----|--------|--------|-------------------|
| **C-6** | **Relance unique** de la vague 1 à J+7, deux lignes. Une seule. Pas de troisième email | 30 min | relances parties le 7/08 |
| **C-7** | **Vague 2 : 5 emails** (le reste de la liste C-2) | 1 h | envoyés le 1er septembre |
| **C-8** | ~~T-1 — Runbook de reprise~~ | — | ✅ **fait le 28/07** → `docs/cession/runbook-reprise.md` : 9 comptes tiers et leur mode de transfert, rotation exhaustive des secrets, les 9 tâches planifiées, échéances silencieuses, première semaine du repreneur, points d'attention hérités |
| **C-9** | ~~T-2 — Dossier de cession~~ | — | ✅ **complet le 30/07** : one-pager + due-diligence (7/7) + runbook + valorisation + `lib/compliance/README.md` + audit du 21/07 + `ARCHITECTURE.md`. **Coûts d'exploitation renseignés : ≈ 0 €/mois**, toute la pile étant sur paliers gratuits — c'est un argument de vente, pas une ligne de tableau |
| **C-10** | ~~Lever les blocages du §4~~ | — | ✅ **fait — 7 points sur 7 fermés** : J-3, J-4, J-6 le 28/07 ; J-1, J-2, J-5, J-7 le 30/07. `docs/cession/due-diligence.md` est complet et répond à tout ce qu'un acquéreur demandera |

### 25 août → mi-septembre : **envoyer, puis conclure ou refermer**

**25 août** : les 10 emails partent, l'annonce marketplace est publiée.
**1er septembre** : relance unique (C-6), vague 2 (C-7).
**15 septembre** : le gate du §5 décide laquelle des deux branches s'exécute.

---

## 4. BLOCAGES À LEVER TÔT — ils tuent une cession en due diligence

À traiter en semaine 2, pas au moment où un acheteur les demande.

**→ Réponses rédigées dans `docs/cession/due-diligence.md`.** Les trois points vérifiables
l'ont été le 28/07 ; les quatre autres n'existent que dans ta tête et attendent une phrase
de toi chacun.

| # | Question | État |
|---|---|---|
| J-1 | **Y a-t-il une société** ou l'actif est-il détenu en nom propre ? | ✅ **répondu le 30/07 — aucune société, détention en nom propre.** Donc cession d'actif pure, closing par **contrat de cession** (pas de facture). Fiscalité : une question à un comptable, sans enjeu aux montants visés |
| J-2 | **Qui détient l'IP ?** | ✅ **répondu le 30/07 — auteur unique, aucun tiers n'a jamais contribué.** Chaîne de titularité sans trou : c'est un **argument de vente**, à écrire dans le dossier |
| J-3 | **Transférabilité des comptes** | ✅ 9 services inventoriés (runbook §1). Seul point dur : **Stripe ne se transfère pas** — compte à recréer, indolore ici faute d'abonnés |
| J-4 | **Nom de code `Nexus` vs marque `Quartzbase`** | ✅ résidu inventorié : 6 endroits, aucune dépendance externe cassée, webhooks déjà en double émission |
| J-5 | **Marque déposée ?** | ✅ **répondu le 30/07 — aucun dépôt INPI.** Nom d'usage + domaine + identité graphique (droits d'auteur cédés), pas de titre de propriété industrielle. Sans impact sur le prix : l'acquéreur déposerait à son nom de toute façon |
| J-6 | **Données personnelles en base** | ✅ **aucune donnée réelle** : IBAN 0/19, NIR 0/19, date de naissance 0/19, adresse 0/19. Argument de vente. ⚠️ **mais le schéma prévoit de collecter NIR et IBAN en clair** — à déclarer spontanément (cf. due-diligence.md) |
| J-7 | **Les 2 abonnements Stripe `active`** | ✅ **résolu le 30/07 — supprimés.** Leurs identifiants Stripe n'existaient ni en live ni en test : valeurs semées en dur, aucun paiement réel. La table `subscriptions` est vide |

---

## 5. GATE DU 15 SEPTEMBRE — et plan de repli daté

Le 15 septembre au soir, compter les **réponses de fond** reçues (une réponse de fond = un
échange où l'acheteur pose une question sur l'actif ; un « merci, pas pour nous » n'en est
pas une).

```
Réponses de fond au 15/09 ?
│
├── ≥ 1 sur thèse A ou B ──► BRANCHE 1 : conclure.
│      Tout le temps restant sur cette discussion. C-8/C-9 finalisés à sa demande.
│      Ne pas ouvrir de nouveau front, ne pas relancer les autres.
│
└── 0  ──────────────────► BRANCHE 2 : bascule intégrale sur la thèse C (marketplace),
       prix affiché, closing rapide visé au 30/09. Si aucune offre au 30/09 → §6.
```

**Critère de succès du gate :** une ligne écrite et datée en tête de ce fichier, le 15/09.
Comme le point de contrôle du 28/07 — le même mécanisme, il a fonctionné.

---

## 6. SI RIEN NE SE VEND — la sortie propre (à exécuter avant le 30 septembre)

Un plan de cession sans plan de non-vente n'est pas un plan. Le scénario le plus probable
reste « pas d'acheteur du tout », et il ne doit pas se solder par un actif qui pourrit
en silence pendant que tu es injoignable.

| ID | Action | Pourquoi |
|----|--------|----------|
| F-1 | **Ouvrir `lib/compliance` en open source** (licence permissive), avec un README qui cite les articles de loi | La partie qui a une valeur d'usage réelle et une durée de vie longue. Ça te construit un actif de réputation là où l'actif commercial n'a rien donné |
| F-2 | **Couper les coûts récurrents** : Anthropic, Resend, Twilio, Vercel → plan gratuit ou résiliation ; Supabase → pause du projet | Un actif dormant qui coûte 50 €/mois pendant 2 ans, c'est 1 200 € pour rien |
| F-3 | **Renouveler `quartzbase.fr` pour 2 ans** et poser une page statique | Le domaine est la seule chose qui devient irrécupérable si elle expire. 2 ans coûtent une dizaine d'euros et gardent la porte ouverte |
| F-4 | **Archiver le repo** avec le runbook (C-8) et le dossier (C-9) dedans | Tu reprends là où tu t'es arrêté dans 2 ans, sans rien avoir à reconstituer |

> **F-1 ne s'exécute qu'après le 30 septembre.** Ouvrir le moteur de conformité avant la fin du
> processus détruit exactement ce qui se vend dans les thèses A et B. C'est une porte à sens
> unique : elle ne s'ouvre qu'une fois la vente déclarée close.

---

## 7. À NE PAS FAIRE

- ❌ **Coder quoi que ce soit.** Gel des features acté le 28/07. Aucun acheteur n'a jamais
  payé plus cher pour une feature ajoutée pendant la négociation. Seuls passent les bugs
  bloquants pour une démo.
- ❌ **Polir avant d'envoyer.** Le one-pager de C-1 est bon quand il est envoyable, pas quand
  il est beau.
- ❌ **Annoncer un prix en premier** (§2).
- ❌ **Approcher les concurrents directs du planning CHR** avant d'avoir épuisé A, B et C.
- ❌ **Signer un client payant** pour « améliorer le dossier ». Un client acquis maintenant
  est un client abandonné en septembre, et un passif dans une due diligence.
- ❌ **Refaire un audit.** Celui du 21/07 + le §1 de ce fichier suffisent.
- ❌ **Attendre une réponse avant d'envoyer la suivante.** Les 15 cibles partent en 2 vagues
  planifiées, pas en réaction.

---

## 8. SUIVI — 4 chiffres, chaque dimanche, 3 minutes

| Semaine | Emails envoyés | Réponses de fond | Discussions actives | Offres reçues | Note |
|---------|:---:|:---:|:---:|:---:|------|
| 03/08 | | | | | J-1, J-2, Stripe résilié, vidéo faite |
| 24/08 | | | | | 10 contacts trouvés, `lib/compliance` packagé |
| 31/08 | | | | | **objectif : 10 emails envoyés le 25/08 + annonce en ligne** |
| 07/09 | | | | | relance faite, vague 2 partie |
| 15/09 | | | | | **GATE — décision écrite (§5)** |
| 30/09 | | | | | **bilan : closing, ou §6 exécuté** |

**Ce plan a réussi si, au 30 septembre :** soit une cession signée ou une discussion sérieuse en
cours avec un acheteur identifié, soit le §6 exécuté en entier — coûts coupés, domaine
sécurisé, `lib/compliance` ouvert, repo archivé.

**Il a échoué si** le 30 septembre arrive sans qu'aucune des deux branches n'ait été menée à son
terme : un actif laissé en l'état, qui continue à coûter, sans personne pour s'en occuper.

---

*Plan dérivé de la décision de trajectoire du 28/07/2026. À mettre à jour en cochant, pas en
réécrivant.*
