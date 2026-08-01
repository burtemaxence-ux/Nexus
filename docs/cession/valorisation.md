# Valorisation — estimation de marché

**Établi le 28/07/2026.** Recherche de comparables faite ce jour ; sources en fin de document.

**Avertissement d'honnêteté, à lire en premier :** il n'existe **pas de base de transactions
publiques pour les SaaS sans revenu**. Les recherches confirment que les places de marché
publient des multiples pour les entreprises *qui gagnent de l'argent*, pas pour les actifs
pré-revenu. Les fourchettes ci-dessous sont donc des **constructions raisonnées** à partir
du coût de reconstruction et de la structure du marché — pas des comparables sourcés. Elles
sont faites pour être **corrigées par les trois premières réponses réelles**, pas pour être
défendues.

---

## 1. Pourquoi la méthode habituelle donne zéro

Le marché valorise un SaaS par un multiple : 🔎

- Micro-SaaS sous 10 k$ de MRR : **2 à 3,5 × l'ARR**, avec des tickets de 50 k$ à 300 k$
- Flippa : **2,5 à 4,5 × le résultat annuel** du vendeur
- Acquire.com : **multiple médian de 3,9 ×** sur les opérations sous 10 M$

**Quartzbase a 0 € de revenu. N'importe lequel de ces multiples appliqué à 0 donne 0.**

Ce n'est pas une figure de style : la recherche remonte explicitement que **les sociétés
pré-revenu ne passent généralement pas par un processus de valorisation**. Il n'existe pas de
méthode standard pour ce qu'on vend ici.

Il ne reste donc qu'une méthode applicable : **le coût de reconstruction**. Combien coûterait,
à l'acquéreur, de refaire lui-même ce qu'il achète. Et c'est exactement là que ton intuition
sur l'IA fait mal.

---

## 2. Le coût de reconstruction s'est effondré — c'est documenté

> « Le développement assisté par IA a compressé le coût et le délai des développements sur
> mesure **au point de rendre caduques la plupart des estimations d'avant 2024**. » 🔎

C'est précisément le raisonnement qu'un acquéreur va tenir en 2026, et il aura raison.

| | **Anchor pré-IA (2023)** | **Réalité 2026** |
|---|---|---|
| Reconstruire 57 000 lignes, 63 pages, 99 routes, 267 tests | ~5-6 mois de développeur senior | **6 à 10 semaines** avec un agent de codage |
| Coût équivalent (~500 €/jour) | **50 000 – 70 000 €** | **12 000 – 25 000 €** |

**Décote d'environ 65 à 75 % sur l'argument principal du dossier.**

Le détail compte, parce que tout ne se reconstruit pas au même rythme :

| Ce qui s'est effondré | Ce qui résiste |
|---|---|
| Échafaudage Next.js / Supabase / auth | Les **17 règles de droit** : l'IA en écrit de plausibles, elle ne dit pas si elles sont *justes* |
| CRUD, interfaces, composants | L'**export DSN (NEODeS)** : format administratif ingrat, mal documenté |
| Intégrations (Stripe, Resend, iCal, webhooks) | Le **durcissement production** : RLS réellement correcte, webhook Stripe réellement idempotent — l'IA échoue caractéristiquement là |
| Les tests eux-mêmes | La **preuve** : audit, 0 advisor, 0 TODO, décisions documentées. L'IA produit du code, pas des antécédents |

Et le marché a acté le déplacement de la valeur :

> « La vélocité de livraison n'est plus une barrière : quand la vitesse est banalisée par
> l'IA, elle cesse d'être un différenciateur. » — « **La distribution est la dernière
> barrière durable.** » 🔎

**C'est le coup double pour Quartzbase :** l'IA a dévalué ce que tu as (du code), et le
marché a revalorisé ce que tu n'as pas (des clients et un canal).

**Le contrepoids, réel mais limité :** le code généré par IA « a toujours besoin d'un
responsable, de tests, d'une revue de sécurité, et de mises à jour quand les dépendances et
**les réglementations** changent » 🔎. Un moteur de conformité déjà écrit *et déjà testé*
garde une valeur — mais c'est une valeur de **temps et de risque évité**, plus une valeur
de code.

---

## 3. Estimation

**Coût de reconstruction 2026 : 12 000 – 25 000 €.** C'est un **plafond théorique**, pas un
prix : un acheteur paie toujours une fraction du coût de reconstruction, parce qu'il hérite
en plus de code qu'il n'a pas écrit, sans garantie, sans support dans la durée, et sans
pouvoir vérifier à bas coût que les 17 règles sont justes. La fraction usuelle pour un actif
non éprouvé se situe autour de **20 à 40 %**.

| Scénario | Fourchette | Probabilité | Ce qui la justifie |
|---|---|:---:|---|
| **Thèse C — marketplace** | **1 500 – 5 000 €** | La plus élevée | Acheteurs sensibles au prix, comparant à ce qu'ils feraient eux-mêmes avec une IA. Places de marché adaptées : Microns (< 100 k$), SideProjectors, Tiny Acquisitions 🔎 |
| **Thèse B — éditeur** | **8 000 – 25 000 €** | Moyenne-faible | Il n'achète pas des lignes : il achète 2 à 3 mois de calendrier et une base déjà durcie, sur un marché où il a déjà les clients |
| **Thèse A — stratégique** | **15 000 – 40 000 €** | Faible | Time-to-market France : moteur de conformité + pages SEO réglementaires + marque. C'est le seul scénario où l'IA ne réduit pas la valeur, parce que ce qui est acheté est du **temps calendaire**, pas du code |
| **Domaine seul** | quelques centaines d'euros | — | Un `.fr` sur un nom inventé, sans trafic, n'a quasiment pas de marché secondaire |
| **Aucune vente** | **0 €** | **Réelle** | À intégrer au raisonnement : c'est pour ça que le §6 du plan (sortie propre) existe |

**Espérance honnête : quelques milliers d'euros.** Pas de quoi changer quoi que ce soit à ta
situation — ce qui est un argument de plus pour ne pas y passer plus que les 5 jours prévus,
et pour ne pas laisser une négociation traîner indéfiniment.

### Prix à afficher

- **Thèse C — afficher 4 500 €**, négociable. Sur un petit actif, un prix précis vend
  plus vite qu'un « faites une offre », qui n'attire que des curieux. Descendre à
  2 500 € au bout de deux semaines sans contact plutôt que de laisser l'annonce dormir.
- **Thèses A et B — ne rien annoncer.** Le raisonnement du §2 du plan tient toujours : ces
  acheteurs valorisent le temps gagné, pas le coût de reconstruction, et ils sont les seuls
  à savoir ce que ce temps vaut chez eux. Un chiffre annoncé plafonnerait la discussion très
  en dessous.

---

## 4. Conséquence directe : l'argumentaire doit changer

**C'est le point le plus utile de ce document.** Le dossier s'appuyait sur
« 57 000 lignes, 267 tests, environ six mois de travail ». **En 2026, cet argument travaille
contre toi** : il invite exactement la réponse « je refais ça avec une IA en trois semaines ».

Il faut cesser de vendre du **volume de code** et vendre ce que l'IA ne produit pas :

| ❌ Ne plus dire | ✅ Dire à la place |
|---|---|
| « 57 000 lignes de code » | « 63 pages et 99 routes **en production**, pas une démo » |
| « environ six mois de travail » | « **du temps calendaire vers un état fiable** — pas vers un prototype » |
| « 267 tests » (seul) | « 267 tests **qui verrouillent les circuits d'argent et les 17 règles de droit** » |
| « le moteur fait 17 règles » | « 17 règles **dont l'interprétation a été tranchée et figée par des tests** — une IA en écrit de plausibles, elle ne vous dit pas si elles sont justes » |
| « code propre, 0 TODO » | « **0 avertissement de performance sur la base, RLS multi-tenant vérifiée, webhook Stripe idempotent testé** — les trois endroits où le code généré casse » |

**La phrase à retenir :** *« Ce qui s'achète ici, ce n'est pas du code — il est devenu bon
marché. C'est du droit français vérifié, une base déjà durcie en production, et le temps que
ça représente. »*

---

## 5. Ce qui ferait monter le prix — et ce que ça coûte

| Levier | Effet | Coût | Verdict |
|---|---|---|---|
| **1 seul client payant** | Fait basculer d'une vente d'actif à une vente d'entreprise, avec un multiple applicable. **C'est le seul levier qui change l'ordre de grandeur** | Plusieurs semaines de vente, et un client à supporter ensuite | ❌ Écarté le 28/07, à raison |
| **Packager `lib/compliance` seul** (README, articles de loi, tests lisibles) | Rend la partie qui résiste à l'IA évaluable en 10 minutes par un acheteur | ~½ journée | ✅ **Le meilleur rapport effort/prix du dossier** |
| **Vidéo de 3 min** (C-3) | Un acheteur qui voit tourner un produit ne se demande plus s'il tourne | 30 min | ✅ Fais-la |
| **Réponse à J-2** (titularité IP) | Ne fait pas monter le prix, mais son absence tue le deal | 1 phrase | ✅ Indispensable |
| Refonte, nouvelles features, migration Next 15 | Aucun | Des jours | ❌ Interdit par le §7 du plan |

---

## Sources 🔎

- [What Is My SaaS Worth? 2026 Valuation Multiples From 520+ Real Deals — BigIdeasDB](https://bigideasdb.com/saas-valuation-guide-2026)
- [How to Value a SaaS Company in 2026 — Flippa](https://flippa.com/blog/how-to-value-a-saas-company/)
- [How to Sell Your Micro-SaaS — 2026 Valuation Guide](https://www.mediafa.st/how-to-sell-your-micro-saas)
- [How to Sell Your Side Project or Micro-SaaS in 2026 — Microns](https://www.microns.io/blog/how-to-sell-your-side-project)
- [What is the average pre-money valuation of a pre-revenue SaaS start-up? — Startups.com](https://www.startups.com/questions/1245/what-is-the-average-pre-money-valuation-of-a-enterprise-saas-stat-up-that-is)
- [AI-Assisted Development Changed the Build vs. Buy Math — KDG](https://kyledavidgroup.com/articles/ai-assisted-development-changed-the-build-vs-buy-math/)
- [WTF is a Software Moat in 2026? — Joe Reis](https://joereis.substack.com/p/wtf-is-a-software-moat-in-2026)
- [Distribution Is The New Moat And VCs Are Betting Billions On It — Forbes](https://www.forbes.com/sites/josipamajic/2026/04/14/distribution-is-the-new-moat-and-vcs-are-betting-billions-on-it/)
- [AI Moats in 2026: What Still Defends Your Product — Valtorian](https://www.valtorian.com/blog/ai-moats-2026)
- [Build vs Buy Software: AI's Impact in 2026 — Blck Alpaca](https://blckalpaca.at/en/blog/build-vs-buy-software-ais-impact-in-2026)
