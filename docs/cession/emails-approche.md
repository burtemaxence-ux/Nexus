# Emails d'approche & annonce — prêts à envoyer

**Statut : rédigés, non envoyés.** L'envoi et la publication sont des actions vers
l'extérieur, irréversibles — elles restent ta décision. Tout ce qui est entre `[crochets]`
doit être remplacé avant envoi.

**Règles qui s'appliquent aux trois thèses :**
1. **Aucun prix dans le premier email.** Ni fourchette, ni « à partir de ». Cf. §2 du plan.
2. **Une seule relance**, à J+7, deux lignes. Pas de troisième.
3. **La ligne `[pourquoi eux]` n'est pas décorative** — c'est elle qui fait la différence
   entre un email lu et un email supprimé. Si tu ne sais pas quoi y écrire, la cible n'en
   est pas une : retire-la de la liste.
4. **Pas de pièce jointe au premier email.** Une pièce jointe non sollicitée déclenche les
   filtres et se fait ignorer. Le one-pager part au deuxième échange.
5. **Cession sèche.** Aucune participation conservée, aucune clause de suite. C'est un
   argument de vente en soi — à dire dès que la question de la structure se pose : *« vous
   reprenez tout, je ne garde rien, il n'y a personne derrière moi. »*

---

## Thèse A — Time-to-market conformité

**Cible :** acteur RH / planning étranger ou adjacent qui veut entrer sur le marché français.
**Destinataire :** Head of Product, VP Product, ou Country Manager France.
**Ce qu'on lui vend :** 6 mois gagnés sur la partie la plus ingrate du marché français.

> **Objet :** Moteur de conformité au droit du travail français — 17 règles testées

> Bonjour [Prénom],
>
> [pourquoi eux — une phrase concrète et vérifiable : « J'ai vu que [Société] a ouvert
> une offre France en [mois] » / « Votre page tarifs mentionne le marché français mais pas
> la conformité horaire » / « Vous couvrez [pays] où la réglementation horaire est proche »]
>
> J'ai développé Quartzbase, un SaaS de planning pour la restauration. Je l'arrête pour
> raisons personnelles et je cède l'actif.
>
> La partie qui peut vous intéresser est isolée et autonome : un moteur qui analyse un
> planning et remonte les infractions au Code du travail français — 17 règles implémentées
> (repos quotidien et hebdomadaire, durées maximales, amplitude, coupures des temps
> partiels, travail de nuit, et 5 règles spécifiques aux mineurs). Les 17 sont couvertes
> par des tests unitaires.
>
> C'est le genre de brique qui coûte plusieurs mois entre le dev et la validation
> juridique. Elle est écrite, testée, et se branche indépendamment du reste.
>
> Est-ce que ça a une valeur pour vous ? Je peux vous envoyer le détail technique.
>
> Maxence Burte
> quartzbase.fr

**Pourquoi c'est construit comme ça :** on ne vend pas « mon SaaS », on vend une brique
qu'il connaît et qu'il redoute. La transparence sur l'arrêt en deuxième ligne désamorce la
question qu'il se pose de toute façon. Aucune demande de rendez-vous — juste une question
fermée à laquelle répondre coûte dix secondes.

---

## Thèse B — Comblement de gamme

**Cible :** éditeur de caisse, de paie ou de compta qui a déjà des clients CHR mais pas de
module planning.
**Destinataire :** fondateur, directeur produit, ou responsable partenariats.
**Ce qu'on lui vend :** un module fini à brancher sur une base clients qu'il a déjà.

> **Objet :** Module planning conforme, fini et testé — cession

> Bonjour [Prénom],
>
> [pourquoi eux — « [Société] équipe des restaurants et des boulangeries en caisse, mais
> je ne vois pas de gestion de planning dans votre offre » / « vos clients CHR gèrent
> encore leurs plannings sur Excel à côté de votre solution »]
>
> Je cède Quartzbase, un SaaS de planning et de conformité pour la restauration : produit
> fini, en production, audité — mais jamais commercialisé. Je l'arrête : j'ai construit le
> produit, faire la vente ne m'intéresse pas, et sans ça il ne se passera rien.
>
> Concrètement : planning par glisser-déposer, pointage mobile, congés, contrôle
> automatique du droit du travail (17 règles testées), export DSN, facturation Stripe
> branchée. 262 tests verts, 0 dette technique signalée à l'audit.
>
> Pour un éditeur qui a déjà les clients, c'est un module à rebrander plutôt que six mois
> de développement. Je suis transparent d'emblée : il n'y a aucun client ni aucun revenu à
> reprendre — c'est un actif technique, pas un business.
>
> Ça vaut un échange de 20 minutes ?
>
> Maxence Burte
> quartzbase.fr

**Pourquoi c'est construit comme ça :** l'aveu « 0 client » est placé *avant* la demande,
volontairement. Il coûte peu ici — cet acheteur achète une capacité, pas une traction — et
il achète en échange toute la crédibilité du reste du message. Un éditeur qui découvrirait
l'absence de clients en due diligence après un premier email flatteur arrêterait tout.

---

## Thèse C — Reprise d'actif (annonce)

**Canal :** marketplaces de projets (Acquire.com, Flippa, side-project boards) et
communautés indie francophones.
**Format :** annonce publique, pas un email. Ici le prix *doit* être affiché — une annonce
sans prix ne reçoit que des curieux.

> **Titre :** SaaS de planning RH (France) — produit fini, 262 tests, 0 client, à relancer
>
> **En une ligne.** SaaS de planning et de conformité au droit du travail pour la
> restauration. Construit, mis en production, audité — jamais commercialisé. Le fondateur
> s'arrête pour raisons personnelles.
>
> **Ce qui est vendu.** Application Next.js 14 / TypeScript complète : 63 pages, 99 routes
> API, 57 000 lignes. Supabase (Postgres, Auth, RLS multi-tenant), 48 migrations tracées,
> CI, Sentry, PWA. Stripe branché et testé (3 plans, essai, parrainage). Intégration IA
> pour la génération de plannings. Domaine `quartzbase.fr`, marque et identité graphique.
>
> **Ce qui fait la valeur.** Un moteur de conformité au droit du travail français : 17
> règles implémentées, les 17 couvertes par des tests. Générer ce code est facile
> aujourd'hui — savoir qu'il est juste ne l'est pas. L'interprétation de chaque règle est
> tranchée et verrouillée par des tests.
>
> **Ce qu'il n'y a pas.** Aucun client, aucun revenu, aucun trafic. La base ne contient que
> des données de démonstration. Le repreneur repart de zéro sur le commercial — et hérite
> en échange d'une base technique auditée avec 0 avertissement de performance et 0 TODO
> dans le code.
>
> **Fourni.** Dépôt Git et historique, base et migrations, runbook d'exploitation complet,
> audit technique daté, document d'architecture, transfert des comptes tiers.
>
> **Prix : 4 500 €**, négociable. Cession sèche : aucune participation conservée, aucune
> clause de suite, le repreneur reprend l'actif en entier.

*(Prix issu de `valorisation.md` §3. Sur un petit actif, un prix précis vend plus vite qu'un
« faites une offre ». Si aucun contact au bout de deux semaines : descendre à 2 500 € plutôt
que de laisser l'annonce dormir.)*

---

## La relance — J+7, thèses A et B

Deux lignes. Pas de nouvel argument, pas de relance de la relance.

> Bonjour [Prénom],
>
> Je remonte ce message au cas où il serait passé à la trappe. Si le sujet n'est pas pour
> vous, un simple « non » me suffit et je n'insiste pas — ça m'aide à savoir où concentrer
> mes efforts.
>
> Maxence

**Pourquoi ça marche :** rendre le « non » facile augmente le taux de réponse total. Et un
non net vaut mieux qu'un silence : il libère du temps sur un calendrier de 5 semaines.

---

## Le moment critique : « Combien vous en voulez ? »

C'est la première question qui arrivera, et c'est là que la valeur se joue. Le réflexe —
annoncer un chiffre — plafonne définitivement la discussion : personne ne propose plus que
le prix demandé.

> Je n'ai pas de prix affiché, et je préfère être franc sur la raison : un actif sans
> revenu ne se valorise pas sur un multiple, donc n'importe quel chiffre que je sortirais
> serait arbitraire.
>
> Ce que je regarde, c'est ce que ça représente de votre côté — le temps de développement
> et de validation juridique que ça vous économise. Vous êtes mieux placé que moi pour
> l'estimer. Qu'est-ce que ça vaudrait pour vous ?

Si on insiste pour que tu ouvres : renvoyer sur le temps gagné, **jamais sur le volume de
code**. En 2026, « 57 000 lignes, six mois de travail » appelle immédiatement « je refais ça
avec une IA en trois semaines » — et ce n'est pas faux. Dire plutôt :

> Ce que je peux vous dire, c'est ce qu'il y a dedans : 17 règles du Code du travail dont
> l'interprétation est tranchée et verrouillée par des tests, une isolation multi-tenant
> vérifiée, un webhook de paiement idempotent testé. Générer ce code est facile aujourd'hui.
> Savoir qu'il est juste, non — c'est là qu'est le temps.

Cf. `valorisation.md` §4 pour l'argumentaire complet, et §3 pour les fourchettes.

**Et note chaque chiffre entendu.** Trois réponses suffisent à connaître ta fourchette
réelle — c'est ce qui te permettra d'afficher un prix dans l'annonce de la thèse C.

---

## Avant le premier envoi — vérifications

- [ ] `quartzbase.fr` répond, la landing s'affiche, aucune donnée de démonstration visible
      publiquement
- [ ] L'adresse d'envoi est celle du one-pager (`maxence.burte@gmail.com`)
- [ ] Les `[pourquoi eux]` sont écrits pour les 10 cibles — pas 8, pas « je verrai »
- [ ] Les 2 abonnements Stripe personnels sont résiliés (J-7) : ils ne doivent pas
      apparaître comme des clients dans une capture d'écran ou un accès de démonstration
- [ ] Envoi le matin, en semaine. Pas le vendredi après-midi, pas en août pour les cibles
      françaises si tu peux l'éviter — d'où l'importance de partir le 31/07
