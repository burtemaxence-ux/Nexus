# NEXUS BY QUARTZ — ANALYSE EXPERTE SaaS B2B

---

## SECTION 1 — ÉTAT RÉEL DU PRODUIT

### 1.1 MATURITÉ PRODUIT

Verdict : Beta avancée, frôlant la Production-ready.

C'est honnêtement impressionnant pour un dev de 19 ans. Mais "impressionnant" ne vend pas.

Ce qui est au niveau Production-ready :
- Architecture multi-tenant correcte (RLS Supabase, establishment_id partout)
- 33 migrations propres avec soft deletes et audit log
- Rôles et permissions bien structurés (manager / supervisor / employee)
- PWA avec Service Worker, push notifications, manifest — c'est pro
- Sentry intégré, rate limiting, tokens HMAC pour iCal — sécurité sérieuse
- Compliance légale française avec les 7 règles du Code du Travail — vraie valeur
- Streaming AI chat avec contexte métier — techniquement solide

Ce qui manque pour passer à Production-ready complète :
1. Stripe absent — impossible de facturer, c'est le seul bloquant commercial absolu
2. Onboarding zero — un nouveau client qui s'inscrit ne sait pas quoi faire
3. Landing page publique absente
4. Tests automatisés absents — risque de régression à chaque deploy
5. Documentation utilisateur absente

Ce qui est over-engineered pour le stade actuel :
- L'API publique REST v1 — aucun client n'en a besoin avant 50 clients
- Le marketplace de remplacement avec scoring IA — feature avancée, pas prioritaire
- Les webhooks / intégration Slack / iCal — utile plus tard, pas maintenant
- Le système d'audit log complet — bien fait, mais personne ne l'a demandé encore
- Multi-établissements dans l'UI — simplifie la démo, ajoute la complexité plus tard

Features critiques manquantes pour le premier client payant :
1. Stripe Subscriptions — sans ça, pas de business
2. Onboarding guidé (3 étapes : créer postes, inviter employés, créer premier planning)
3. Export PNG du planning pour WhatsApp
4. Page de connexion plus propre pour la démo

---

### 1.2 DETTE QUI BLOQUE LES VENTES

Ce qu'un patron verrait en 5 minutes qui lui ferait perdre confiance :

1. Pas de données de démo — si tu lui montres une app vide, il ne projette pas. Il faut une démo pre-remplie avec 8 employés fictifs, 3 postes, un planning déjà fait.

2. L'onboarding est inexistant — après inscription, l'utilisateur arrive sur un dashboard vide sans savoir quoi faire. Abandon garanti.

3. Mobile first mais les grilles de planning sont complexes sur mobile — le patron regarde sur son iPhone. Si le drag-and-drop ne fonctionne pas bien sur mobile, c'est éliminatoire.

4. Pas d'export WhatsApp-friendly — la réalité du terrain : les patrons envoient le planning par WhatsApp. PNG ou PDF simple, une touche.

Ce qui pourrait crasher avec un vrai usage :
- Le rate limiting est in-memory — en prod Vercel avec plusieurs instances serverless, chaque instance a son propre compteur. Configurer Vercel KV est listé comme optionnel mais devient nécessaire.
- Gestion des sessions multi-établissements sur deux onglets — comportement imprévisible.
- Les cron jobs Vercel : si CRON_SECRET n'est pas configuré, les endpoints cron sont exposés publiquement.

---

### 1.3 AVANTAGES CONCURRENTIELS RÉELS

Par rapport à Skello :

| Feature | Skello | Nexus |
|---------|--------|-------|
| Assistant IA intégré | Non | Oui — génération planning + chat |
| Compliance auto 7 règles | Basique | Automatique avec alertes |
| PWA installable | Non | Oui |
| Prix | 200€/mois | À définir (mais moins) |
| Multi-établissements | Oui | Oui, natif |
| Marketplace remplacement IA | Non | Oui |
| API publique | Payante | Incluse |

Les vrais différenciateurs IA :
- Génération de planning par IA en 1 clic avec contraintes configurables. Skello n'a pas ça. Vendable aujourd'hui comme "gain de 2h par semaine".
- Chat IA avec contexte métier complet : le manager peut demander "qui peut remplacer Marie vendredi ?" et l'IA répond avec les disponibilités réelles. C'est une démo qui impressionne.
- Scoring IA des candidats au remplacement : feature unique sur ce marché.

Ce qu'un client Skello trouverait immédiatement supérieur :
1. L'IA — Skello n'en a pas de réelle
2. Le prix si tu te positionnes à 50-80€/mois
3. L'app mobile installable (Skello a une app native payante en option)

---

## SECTION 2 — ANALYSE COMMERCIALE

### 2.1 PRICING

TIER 1 — "Essentiel" — 49€/mois (ou 490€/an)
- 1 établissement
- Jusqu'à 15 employés
- Planning drag-and-drop
- Congés et présences
- Export PDF/WhatsApp
- Support email
Pour qui : boulangerie artisanale, petit restaurant, patron solo

TIER 2 — "Pro" — 89€/mois (ou 890€/an)
- 1 établissement
- Jusqu'à 30 employés
- Tout Essentiel +
- Assistant IA (génération planning + chat)
- Compliance légale automatique
- Marketplace remplacement
- API publique
Pour qui : restaurant 15-25 personnes, multi-postes

TIER 3 — "Multi-site" — 149€/mois (ou 1490€/an)
- Jusqu'à 3 établissements
- Employés illimités
- Tout Pro +
- Tableau de bord multi-sites
- Rapports consolidés
- Support prioritaire
Pour qui : chaîne locale, franchisé 2-3 restos

Quel tier convertira le mieux au lancement : le Essentiel à 49€/mois. Psychologiquement, 49€ vs 200€ (Skello), c'est la décision facile. Le patron de boulangerie que tu as déjà ne paiera pas 89€ sans avoir utilisé 3 mois. 49€ = "moins cher qu'un sac de farine".

Structure de l'essai gratuit :
- 14 jours gratuits, carte bleue non requise
- Limitations : 5 employés max, pas d'IA, pas d'export PDF
- Trigger de conversion : email J+7 "Tu as créé ton premier planning — voici ce que l'IA peut faire pour toi"
- Email J+13 : "Ton essai se termine demain — 3 patrons nous ont dit que ça leur fait gagner 3h par semaine"

---

### 2.2 POSITIONNEMENT

La promesse en une phrase :
"Nexus génère votre planning en 2 minutes grâce à l'IA — et vous alerte si vous risquez une infraction au Code du Travail."

Segment à attaquer en priorité : les boulangeries artisanales. Pourquoi :
- Tu as déjà 1 client test boulangerie = tu connais le terrain
- Horaires complexes (nuit, week-end, extra) = douleur forte
- Réseau serré = bouche-à-oreille naturel
- Cycle de décision court : le patron est le seul décideur
- Churn faible (la boulangerie ne ferme pas du jour au lendemain)

Comment se positionner face à Skello sans les attaquer : Ne jamais mentionner Skello dans tes communications. Position : "Nexus est le premier logiciel de planning conçu pour les artisans de bouche et la restauration indépendante." Skello vise les chaînes et le corporate. Toi tu vises l'indépendant. Ce n'est pas la même bataille.

ICP — Ideal Customer Profile :
- Patron-boulanger, 35-50 ans, 1 établissement, 8-18 employés
- Gère encore le planning sur Excel ou tableau blanc
- A déjà eu un problème de remplacement de dernière minute
- N'utilise aucun logiciel RH, ou a trouvé Skello "trop compliqué et trop cher"
- Décide seul, paie avec la carte de l'entreprise
- Budget implicite : si ça lui fait gagner 2h/semaine, 50€/mois est une évidence

---

### 2.3 ESTIMATION DE MARCHÉ

Taille du marché France :
- Restaurants : ~175 000
- Boulangeries/pâtisseries artisanales : ~35 000
- Hôtels avec restauration : ~18 000
- Restauration rapide indépendante : ~45 000
- Total cible 5-30 employés : ~150 000 établissements

Calcul MRR à 0,1% du marché :
- 150 000 x 0,1% = 150 clients
- 150 clients x 50€/mois = 7 500€ MRR (90 000€ ARR)
- À 89€/mois de moyenne : 13 350€ MRR (160 000€ ARR)

Segments géographiques prioritaires :
1. Île-de-France — densité maximale, patrons tech-friendly
2. Lyon / Bordeaux / Nantes — villes dynamiques, moins saturées commercialement
3. Éviter Paris intra-muros au début — trop de grands groupes, pas ta cible

---

## SECTION 3 — LES 4 CHEMINS POSSIBLES

### CHEMIN A — "VALIDATION RAPIDE"
Objectif : premier client payant en moins de 30 jours

Étapes dans l'ordre :
- Jour 1-3 : Intégrer Stripe Payment Links. Ça prend 2h.
- Jour 4-5 : Créer un environnement de démo pré-rempli
- Jour 6 : Appeler le patron boulanger. Lui dire : "J'ai besoin de ton aide — peux-tu me présenter à 2-3 autres patrons ?"
- Jour 7-10 : Faire 5 démos en face-à-face ou visio
- Jour 11-15 : Collecter les objections, itérer sur les 2-3 points qui bloquent
- Jour 16-20 : Relancer les prospects avec les corrections faites
- Jour 21-30 : Convertir au moins 1 client sur Stripe Payment Link

Ce qu'il faut construire avant : Stripe Payment Link (2h), environnement de démo (4h), onboarding basique 3 écrans (4h)

Ce qu'il faut arrêter de faire : coder de nouvelles features, perfectionner l'UI, penser à l'API

Risque principal : les 5 démos donnent des retours contradictoires et tu te retrouves à coder au lieu de vendre.

MRR réaliste à 90 jours : 5-10 clients = 250€ à 500€ MRR

Scores :
- Facilité d'exécution : 8/10
- Potentiel revenus 6 mois : 6/10
- Risque de se perdre : 3/10
- Recommandation globale : 9/10 — C'est le chemin à suivre maintenant

---

### CHEMIN B — "CROISSANCE ORGANIQUE"
Objectif : 10 clients en 6 mois via contenu et bouche-à-oreille

Stratégie contenu :
- Plateforme principale : TikTok + Instagram Reels
- Contenu : "J'ai créé un logiciel pour les patrons de resto à 19 ans" — histoire personnelle = viralité
- Cadence : 3 vidéos/semaine, format 60-90 secondes
- Thèmes : coulisses du dev, problèmes que Nexus résout, témoignage client boulanger

Exploitation du client test :
- Filmer une vraie session de 5 minutes avec le patron boulanger (avec son accord)
- Lui demander 3 noms de collègues patrons
- Lui proposer 3 mois gratuits en échange d'un témoignage vidéo de 30 secondes

Partenariats prioritaires :
- Experts-comptables spécialisés CHR : ils connaissent tous les patrons de leur secteur. Commission 10% sur 12 mois pour chaque client référé.
- Moulins / fournisseurs farines : leurs commerciaux terrain voient les boulangers chaque semaine
- Groupements professionnels : Confédération Nationale de la Boulangerie-Pâtisserie, UMIH

MRR réaliste à 6 mois : 8-15 clients = 400€ à 1 350€ MRR

Scores :
- Facilité d'exécution : 6/10
- Potentiel revenus 6 mois : 7/10
- Risque de se perdre : 6/10
- Recommandation globale : 7/10 — À combiner avec Chemin A, pas à la place de

---

### CHEMIN C — "PRODUIT D'ABORD"
Objectif : atteindre un score technique 90+ avant de vendre

Les 10 améliorations produit à impact commercial, dans l'ordre :
1. Stripe Subscriptions complet + middleware de protection des routes
2. Onboarding guidé (3 étapes)
3. Export PNG du planning pour WhatsApp
4. Environnement de démo automatique
5. Landing page avec CTA "Essai 14 jours"
6. Email de bienvenue automatique à l'inscription
7. Email J+7 de nurturing avec vidéo démo IA
8. Tableau de bord simplifié pour petit établissement (<10 employés)
9. Tests end-to-end sur les flows critiques
10. Documentation utilisateur basique (5 pages)

À quel moment ce chemin devient une erreur : à partir du moment où tu passes plus de 2 semaines sans parler à un prospect réel. Si tu n'as pas 5 démos faites à la fin de la semaine 4, tu procrastines avec du code.

MRR réaliste à 6 mois : 3-8 clients = 150€ à 720€ MRR

Scores :
- Facilité d'exécution : 9/10
- Potentiel revenus 6 mois : 4/10
- Risque de se perdre : 8/10
- Recommandation globale : 4/10 — Le piège classique du développeur. Évite.

---

### CHEMIN D — "LEVIER IA"
Objectif : se positionner comme "le planning IA" plutôt que "alternative Skello"

Features IA à développer en priorité :
1. "Génère mon planning de la semaine" en 1 clic avec contraintes configurables — déjà partiellement implémenté, le finaliser et le rendre ultra-simple
2. Détection proactive des conflits : "Marie travaille 6 jours consécutifs — voulez-vous ajuster ?"
3. Optimisation des coûts : "Ce planning coûte 3 200€ — voici une version à 2 900€ avec les mêmes heures d'ouverture"
4. Prédiction des besoins : "Le vendredi 14 juin est la Fête de la Musique — vous avez habituellement +40% d'activité, ajuster le planning ?"

Comment packager l'IA comme différenciateur :
- Renommer le tier Pro en "Pro IA" et mettre "Propulsé par Claude" dans le footer
- La homepage montre l'IA en action en 15 secondes (GIF ou vidéo autoplay)
- Slogan : "Le seul planning qui pense à votre place"

Partenariats IA qui rendraient Nexus incontournable :
- Intégration avec les logiciels de caisse (Lightspeed, Sunday, Zelty) — récupérer les données de trafic pour optimiser le planning
- Partenariat avec Anthropic Startup Program (accès crédits API)

MRR réaliste à 6 mois : 10-20 clients = 500€ à 1 780€ MRR

Scores :
- Facilité d'exécution : 6/10
- Potentiel revenus 6 mois : 8/10
- Risque de se perdre : 7/10
- Recommandation globale : 8/10 — Le bon chemin à 3-6 mois, après avoir validé avec le Chemin A

MA RECOMMANDATION : Fais A + D en parallèle. Valide avec le Chemin A (premier euro en 30 jours), puis monte en gamme avec le positionnement IA du Chemin D. Le Chemin B est un amplificateur, pas un démarreur. Le Chemin C est un piège.

---

## SECTION 4 — LES 5 CHOSES NON-NÉGOCIABLES

### #1 — Intégrer Stripe cette semaine

Pourquoi : sans Stripe, tu n'as pas de business. Tu as un hobby.

Comment : commence par Stripe Payment Links (pas de code — tu génères un lien dans le dashboard Stripe). Crée 3 liens : Essentiel 49€/mois, Pro 89€/mois, Multi-site 149€/mois. Mets ces liens dans ton app derrière un bouton "Activer mon abonnement". L'intégration complète peut venir après le premier client.

Temps : 3 heures

Si tu ne le fais pas : dans 6 mois tu auras 15 features de plus et zéro euro.

---

### #2 — Faire 10 démos avant de coder quoi que ce soit de nouveau

Pourquoi : tu ne sais pas encore ce que les clients veulent. Tu supposes. Les démos t'apprendront plus en une semaine que 3 mois de code.

Comment :
- Demande au patron boulanger 5 contacts
- Cherche sur Google Maps "boulangerie [ta ville]" — appelle 10 numéros
- Script d'appel : "Bonjour, je développe un logiciel de planning pour les boulangeries, j'ai un client boulanger qui l'utilise depuis 3 mois. Est-ce que vous auriez 20 minutes pour me donner votre avis ?"
- L'objectif des 10 démos n'est pas de vendre — c'est d'identifier les 3 objections principales

Temps : 1 semaine

Si tu ne le fais pas : tu continues à construire pour un client imaginaire.

---

### #3 — Créer un environnement de démo pré-rempli

Pourquoi : personne ne peut s'imaginer utiliser un produit vide. La démo doit montrer le produit en action.

Comment : crée un compte demo@nexusbyquartz.fr avec password "demodemo". Peuple-le : 1 établissement "Boulangerie Le Pain d'Or", 3 postes, 10 employés fictifs, un planning de la semaine courante. Montre ce compte lors de toutes tes démos.

Temps : 4 heures

Si tu ne le fais pas : tes prospects voient un écran vide et n'imaginent pas la valeur.

---

### #4 — Collecter un témoignage vidéo du patron boulanger

Pourquoi : la preuve sociale est la chose la plus puissante en B2B SMB. Un patron qui parle à un autre patron vaut 10 landing pages.

Comment : demande-lui de filmer 30 secondes sur son téléphone en disant "J'utilise Nexus depuis X semaines, ça me fait gagner X heures par semaine sur mon planning". Mets cette vidéo sur ta landing page, ton LinkedIn, tes DMs. En échange : 3 mois gratuits ou accès à vie au tier Essentiel.

Temps : 1 conversation + 30 minutes de montage

Si tu ne le fais pas : tu n'as aucune preuve sociale et tes prospects ne font pas confiance à un 19 ans sans références.

---

### #5 — Créer une landing page en dehors de l'app

Pourquoi : ton app actuelle est protégée derrière un login. Les prospects ne voient rien. Tu as besoin d'une page publique.

Comment : utilise Framer, Webflow, ou une page Next.js simple. Structure minimale : Hero (headline + CTA) → 3 features clés → témoignage boulanger → pricing → CTA final. CTA principal : "Essayer 14 jours gratuit — sans carte bleue".

Temps : 1 week-end

Si tu ne le fais pas : tu n'as aucun canal d'acquisition automatique. Chaque client coûte 100% de ton temps.

---

## SECTION 5 — LES PIÈGES À ÉVITER

### 5.1 Les 5 erreurs classiques du développeur-fondateur à ce stade

Erreur 1 — "Le produit n'est pas prêt"
Le produit ne sera jamais prêt à ton avis. Skello a été vendu avec des bugs. Salesforce a été vendu avec des bugs. Le seuil minimal c'est : est-ce que ça fait le job de base ? Chez toi, oui. Vends maintenant.

Erreur 2 — Coder au lieu d'appeler
Chaque heure de code sans avoir parlé à un prospect est de la dette de validation. Tu peux coder infiniment dans la mauvaise direction. Un appel de 20 minutes te dit exactement quoi coder ensuite.

Erreur 3 — Attendre d'avoir Stripe parfaitement intégré avant de vendre
Un Payment Link Stripe en 2h suffit pour encaisser le premier euro. L'intégration complète peut attendre 5 clients.

Erreur 4 — Trop baisser le prix par insécurité
"Je vais mettre 19€/mois pour être sûr que ça prend." Non. À 19€, tu valides que les gens cliquent, pas que ton produit a de la valeur. À 49€/mois, la valeur perçue est plus haute. Un "non" à 19€ ne t'apprend rien.

Erreur 5 — Viser trop large
"Je vais faire les restaurants ET les boulangeries ET les hôtels ET les traiteurs." Non. Choisis un segment. Deviens la référence de ce segment. Ensuite tu étends.

---

### 5.2 Les 3 signes que tu procrastines sous couvert de "améliorer le produit"

1. Tu travailles sur une feature que personne n'a demandée — si aucun prospect ne t'a dit "j'achèterais si tu avais X", tu codes pour toi.

2. Tu refactores du code qui fonctionne — si ça marche et que ce n'est pas un blocage de sécurité, laisse.

3. Tu passes plus de temps dans ton éditeur que dans des conversations — la règle d'or : 50% du temps à parler à des clients, 50% à coder ce qu'ils t'ont demandé.

---

### 5.3 Les features inutiles à ce stade que beaucoup construisent à tort

- L'API publique REST v1 — zéro client n'en a besoin avant 50 clients
- Le système de webhooks et intégrations Slack
- L'audit log complet
- Les rapports et analytics avancés — le patron de boulangerie regarde le planning, pas les graphiques

Note : tout ça est déjà construit et c'est très bien. Mais ne continue pas à construire dans ces directions.

---

### 5.4 Comment éviter produit parfait + zéro client dans 6 mois

La règle des deux semaines : tu n'as pas le droit de coder plus de 2 semaines consécutives sans avoir une conversation commerciale. Une démo, un appel de discovery, un entretien client — n'importe quoi qui implique un vrai humain.

---

## SECTION 6 — STRIPE ET MONÉTISATION

### 6.1 Architecture Stripe recommandée

Phase 1 (maintenant — J+1 à J+7) : Stripe Payment Links
- Zéro code
- Crée 3 Payment Links dans le dashboard Stripe (Essentiel 49€, Pro 89€, Multi-site 149€)
- Active le mode subscription (paiement récurrent mensuel)
- Mets ces liens dans un bouton "Activer" dans l'app
- Durée : 2 heures

Phase 2 (J+14 à J+30, après les 5 premiers clients) : Stripe Checkout
- Stripe Checkout (redirect) plutôt que Stripe Elements (formulaire inline)
- Plus simple, plus sécurisé, conversions proches
- Subscription avec trial de 14 jours
- Durée : 2-3 jours de dev

Table Supabase à ajouter :

```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references establishments(id),
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text check (plan in ('essential', 'pro', 'multisite')),
  status text check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Gestion trials / upgrades / downgrades / churns :
- Trial : status = 'trialing', accès complet pendant 14 jours, webhook J-3 pour email de conversion
- Upgrade : Stripe facture la différence au prorata automatiquement
- Downgrade : update au prochain cycle de facturation
- Churn : webhook subscription.deleted → mettre status = 'canceled', bloquer l'accès mais garder les données 30 jours

---

### 6.2 Plan d'intégration Stripe étape par étape

Fichiers à créer :
- app/api/stripe/checkout/route.ts — crée une session Stripe Checkout
- app/api/stripe/portal/route.ts — accès au portail client Stripe
- app/api/stripe/webhook/route.ts — reçoit les événements Stripe
- lib/stripe.ts — client Stripe initialisé
- lib/subscription.ts — helpers : getUserPlan(), isPlanActive()

Modifier : middleware.ts pour vérifier subscription.status

Webhooks à écouter en priorité :
- checkout.session.completed → créer/mettre à jour la subscription en DB
- customer.subscription.updated → sync plan, status, period_end
- customer.subscription.deleted → mettre status = 'canceled', bloquer accès
- invoice.payment_failed → email d'alerte, mettre status = 'past_due'
- customer.subscription.trial_will_end → email J-3 pour conversion

Protection des routes selon le plan :

```typescript
// middleware.ts — ajouter après auth check
const subscription = await getSubscription(establishmentId)
const isPro = subscription?.plan === 'pro' || subscription?.plan === 'multisite'
const isActive = ['trialing', 'active'].includes(subscription?.status ?? '')

if (pathname.startsWith('/api/ai/') && (!isPro || !isActive)) {
  return NextResponse.json({ error: 'Upgrade required' }, { status: 402 })
}
```

Durée estimée intégration minimale fonctionnelle : 2-3 jours de développement concentré.

---

## SECTION 7 — LANDING PAGE

### 7.1 Structure recommandée

Section 1 — HERO
- Headline : "Créez le planning de votre équipe en 2 minutes. L'IA s'occupe du reste."
- Sous-titre : "Nexus est le logiciel de planning conçu pour les artisans et restaurateurs indépendants. Conforme au Code du Travail. Moins de 2€ par jour."
- CTA principal : "Démarrer mon essai gratuit — 14 jours sans carte bleue"
- Visuel : GIF animé de 8 secondes montrant la génération IA d'un planning

Section 2 — PROBLÈME (3 bullets)
- "Vous perdez 3h chaque semaine à faire et refaire votre planning"
- "Vous avez déjà eu une absence de dernière minute sans solution"
- "Vous risquez une infraction au Code du Travail sans même le savoir"

Section 3 — SOLUTION (3 features avec icônes)
- Planning IA en 2 minutes
- Alertes compliance automatiques
- Marketplace remplacement de dernière minute

Section 4 — PREUVE SOCIALE
- Vidéo ou photo du patron boulanger avec sa citation
- "Utilisé par les premiers artisans qui ont digitalisé leur planning"

Section 5 — DEMO VIDEO
- Vidéo de 90 secondes : "Regardez comment Nexus génère un planning complet en 90 secondes"

Section 6 — PRICING
- 3 tiers côte à côte, tier Pro mis en avant (badge "Le plus populaire")

Section 7 — FAQ (5 questions)
- Puis-je importer mes employés depuis Excel ? Oui
- Est-ce que c'est conforme RGPD ? Oui, hébergé en Europe
- Que se passe-t-il après les 14 jours ? Vous choisissez votre plan ou vous arrêtez
- Puis-je annuler à tout moment ? Oui, sans engagement
- Est-ce que vos données sont sécurisées ? Oui, chiffrement et backups quotidiens

Section 8 — CTA FINAL
- "Rejoignez les premiers artisans qui ont digitalisé leur planning"
- CTA : "Démarrer gratuitement"

---

### 7.2 Ce qu'il ne faut pas mettre

Erreurs classiques à éviter :
- Le jargon tech : "Multi-tenant", "API REST", "RLS", "PWA" — ton patron s'en fiche
- Trop de features listées — liste 3 bénéfices, pas 15 features
- Une démo qui demande un call de 30 minutes — trop de friction
- Les logos "Propulsé par Next.js / Supabase"
- Un pricing trop complexe avec des tableaux de 20 lignes

Ce qui ferait fuir un patron de restaurant non-tech :
- Interface qui ressemble à un logiciel d'entreprise
- Formulaire d'inscription avec plus de 3 champs
- Pas de numéro de téléphone ou de chat visible
- Prix affichés uniquement en HT (mets HT + TTC, les artisans pensent en TTC)

---

## SECTION 8 — ROADMAP 90 JOURS

Semaine 1 — Premier contact commercial
- Créer 3 Stripe Payment Links
- Appeler le patron boulanger, demander 5 contacts
- Créer compte démo pré-rempli
- Métrique : 5 prospects contactés

Semaine 2 — 5 démos réalisées
- Faire les 5 démos
- Noter les 3 objections principales
- Filmer témoignage patron boulanger
- Métrique : 5 démos faites, 1 objection principale identifiée

Semaine 3 — Corriger les 2 blocages identifiés en démo
- Fix les 2 points qui ont bloqué les 5 démos
- Relancer les 5 prospects
- Créer landing page basique
- Métrique : 1 prospect qui dit "je veux tester"

Semaine 4 — Premier client payant
- Onboarder le premier client gratuitement pendant 14 jours
- Lui parler tous les 2 jours
- Collecter son feedback en temps réel
- Métrique : PREMIER PAIEMENT STRIPE

Semaine 5 — Stripe Checkout complet
- Intégrer Stripe Checkout et webhooks
- Middleware de protection des routes
- Email de bienvenue automatique
- Métrique : processus d'inscription end-to-end fonctionnel sans intervention manuelle

Semaine 6 — 5 nouveaux prospects dans le pipeline
- Rechercher 20 boulangeries sur Google Maps, envoyer 20 DMs Instagram
- S'inscrire dans 2 groupes Facebook de patrons de resto
- Préparer cold email pour experts-comptables CHR
- Métrique : 5 nouvelles démos planifiées

Semaine 7 — 3 clients payants
- Convertir 2 clients de l'essai
- Contacter 3 experts-comptables CHR
- Créer 2 vidéos TikTok/Reels sur l'histoire du projet
- Métrique : 3 clients payants = 147€ MRR

Semaine 8 — Onboarding automatisé
- Séquence de 3 emails automatiques post-inscription
- Checklist d'onboarding dans l'app
- Documentation utilisateur (5 pages)
- Métrique : temps d'onboarding < 15 minutes

Semaine 9 — Feature prioritaire identifiée par les clients
- Appel de 30 minutes avec chaque client actif
- Identifier la feature la plus demandée
- La construire
- Métrique : NPS client > 7

Semaine 10 — 5 clients payants
- Relancer tous les prospects de la liste
- Demander à chaque client actif un contact
- Mettre les témoignages sur la landing page
- Métrique : 5 clients payants = 245€ MRR

Semaine 11 — Optimiser la conversion trial → payant
- Email J+7 "Voici ce que tu n'as pas encore essayé"
- Email J+13 de conversion
- Analyse du taux trial → payant
- Métrique : taux trial → payant > 40%

Semaine 12 — Premier partenariat comptable
- Convertir 1 expert-comptable CHR en partenaire affilié
- Lui préparer une page partenaire dédiée
- Mesurer le premier client venant du partenaire
- Métrique : 1 partenaire affilié actif

Semaine 13 — Bilan et pivot si nécessaire
- Analyser : quel segment convertit le mieux ?
- Doubler sur ce segment
- Définir les 3 features du prochain mois basées sur les demandes clients
- Métrique : 8-10 clients payants = 400-490€ MRR

---

## SECTION 9 — MÉTRIQUES À TRACKER

1. MRR — mesurer dans Stripe — cibles : 49€ / 245€ / 490€ à 30/60/90 jours — révèle la santé du business

2. Nb clients payants — mesurer dans Stripe — cibles : 1 / 5 / 10 — révèle la vitesse de croissance

3. Taux trial → payant — mesurer dans Stripe — cibles : N/A / 30% / 40% — révèle la valeur perçue du produit

4. Churn mensuel — clients annulés / total — cibles : 0% / <10% / <8% — révèle la rétention

5. Nb démos faites — mesurer dans Google Calendar — cibles : 5 / 15 / 30 — révèle ton activité commerciale

6. Taux démo → trial — démos / inscriptions — cibles : 40% / 50% / 60% — révèle l'efficacité du pitch

7. DAU/MAU ratio — mesurer dans les logs Supabase — cibles : N/A / 30% / 40% — révèle l'engagement produit

8. Temps d'onboarding — mesure manuelle — cibles : <30 min / <20 min / <15 min — révèle l'UX d'onboarding

9. NPS — email après 2 semaines d'utilisation — cibles : N/A / >6 / >7 — révèle la satisfaction

10. CAC — temps passé en vente / clients obtenus — cibles : <4h / <3h / <2h — révèle l'efficacité commerciale

---

## SECTION 10 — ANALYSE DE CIBLE

### 10.1 ICP Détaillé

Secteur exact : boulangeries artisanales en priorité, restaurants traditionnels en secondaire

Taille : 8 à 18 employés (mixte temps plein + temps partiel + extras)

Profil du décideur : patron-propriétaire, seul décideur, souvent également en production. Fait lui-même le planning. Pas de DRH.

Âge et rapport à la techno : 35-55 ans. Utilise un iPhone. Gère son planning sur WhatsApp + Excel ou sur un tableau en salle de pause.

Douleur principale : le planning de la semaine lui prend 2-3h chaque dimanche. Les remplacements de dernière minute créent un stress extrême. Il ne sait jamais si ses pratiques sont conformes au Code du Travail.

Déclencheur d'achat :
- Un contrôle de l'inspection du travail
- Un conflit avec un employé sur ses heures
- Une semaine particulièrement chaotique en planning
- Un ami patron qui lui recommande Nexus

Budget disponible : il dépense zéro en logiciel de planning, mais 2-3h/semaine = 10-15h/mois à 30€/h implicite = 300-450€/mois de coût caché. Lui faire réaliser ça est l'argument de vente.

---

### 10.2 Segmentation par priorité

1. Boulangeries artisanales (5-15 employés) — ~35 000 établissements — facilité de vente maximale — 49-89€/mois — churn très faible

2. Restaurants traditionnels (10-25 employés) — ~80 000 établissements — bonne facilité de vente — 49-89€/mois — churn faible

3. Restauration rapide indépendante (8-20 employés) — ~45 000 établissements — facilité moyenne — 49€/mois — churn moyen

4. Chaînes locales (plusieurs établissements) — ~5 000 — facilité faible — 149-300€/mois — churn faible (attendre 20 clients solo)

5. Hôtels avec restauration (15-30 employés) — ~18 000 — facilité faible — 89-149€/mois — churn moyen

6. Traiteurs/événementiel — ~8 000 — facilité très faible — 49€/mois — churn très élevé (activité saisonnière, éviter)

---

### 10.3 Anti-cible

Grandes chaînes nationales : cycle de vente 12-18 mois, appels d'offres, DSI impliqué. Tu mourras avant de signer.

Restaurants gastronomiques étoilés : leurs plannings sont ultra-complexes, leurs besoins dépassent ce que Nexus peut offrir. Exigeants, peu de ROI.

Établissements qui utilisent déjà Skello Enterprise : cycle de remplacement long, ROI difficile à prouver.

Hôtels avec département RH : ils ont un RH qui gère le planning. Ce n'est plus le patron qui décide.

---

### 10.4 Personas

PERSONA 1 — LE CLIENT IDÉAL

François, 44 ans — Patron-boulanger, "La Mie Dorée", Nantes, 14 employés

Journée type : levé à 3h30, au fournil jusqu'à 11h. Gestion administrative de 11h à 14h. Le dimanche soir, il passe 2h30 sur Excel pour le planning. Le lundi matin, Karim l'appelle à 6h : il est malade. François passe 45 minutes à appeler les autres pour trouver un remplaçant.

Outil actuel : Excel + groupe WhatsApp "Planning Semaine"

En voyant Nexus pour la première fois : "Attends, l'IA elle fait vraiment le planning toute seule ? Et elle me prévient si je suis pas dans les clous légalement ? C'est ça qui me fait peur, les heures, je sais jamais si je suis bon."

Objection principale : "C'est 49€/mois, c'est cher pour moi en ce moment."

Comment la lever : "François, tu passes 2h30 le dimanche sur le planning. À 30€ de l'heure, c'est 300€/mois que tu dépenses déjà. Nexus te rend 2 de ces heures pour 49€. Tu fais du bénéfice dès le premier mois."

---

PERSONA 2 — LE CLIENT DIFFICILE

Sylvie, 58 ans — Gérante salariée, brasserie "Le Commerce", Orléans, 22 employés, propriétaire absent

Journée type : elle gère tout mais ne prend aucune décision d'achat seule. Le propriétaire vit à Paris et regarde les chiffres une fois par mois.

En voyant Nexus : "Ça a l'air bien mais il faut que j'en parle à M. Dupont."

Pourquoi elle ne convertira pas maintenant : elle n'est pas la décideuse. Le propriétaire ne verra jamais la démo.

Dans quelles conditions elle pourrait devenir cliente : si le propriétaire cherche activement à réduire ses coûts, ou si Sylvie change d'établissement et devient elle-même patronne.

---

### 10.5 Où trouver la cible

Plateformes digitales :
- Facebook : groupes "Boulangers de France", "Restaurateurs Indépendants", "Gérants CHR"
- Instagram : hashtags #boulangerie #patisserie #restaurateur
- LinkedIn : recherche "gérant" + "boulangerie" ou "restaurant" dans ta région
- Google Maps : liste de toutes les boulangeries/restaurants avec numéro de téléphone

Événements physiques :
- Europain / Sirha (salons professionnels CHR)
- Confédération Nationale de la Boulangerie — réunions régionales mensuelles
- UMIH (Union des Métiers et Industries de l'Hôtellerie)
- Marchés professionnels locaux (Rungis si IDF)

Bases de données exploitables :
- SIRENE (INSEE) : base officielle gratuite. Code NAF 1071Z (boulangerie) = ~32 000 entrées avec SIREN et adresse
- Google Maps : boulangeries/restaurants avec note et numéro de téléphone
- Pages Jaunes : liste par ville et catégorie

Partenaires avec accès direct à la cible :
- Experts-comptables spécialisés CHR : un seul partenariat = 50 prospects qualifiés. Commission proposée : 10% récurrent sur 12 mois.
- Fournisseurs de farine (Moulins) : leurs commerciaux voient les boulangers chaque semaine
- Éditeurs de logiciels de caisse : Lightspeed, Sunday, Zelty — partenariat intégration
- Grossistes CHR : Metro, Transgourmet — newsletters lues par des milliers de patrons

---

### 10.6 Messages par segment

SEGMENT 1 — BOULANGERIES

Email froid :
Sujet : "2h30 de dimanche soir récupérées, François ?"
Première phrase : "Bonjour [prénom], je développe un logiciel utilisé par des boulangers à [ville] qui génère le planning de la semaine en 2 minutes grâce à l'IA — et qui alerte si quelque chose risque de poser problème à l'inspection du travail."

DM Instagram :
"Bonjour [prénom], j'ai créé Nexus, utilisé par des boulangers pour faire leur planning en 2 min avec l'IA. Droit du travail inclus. 14 jours gratuits. Vous avez 5 min pour voir ?"

Argument en démo :
"Regardez — je tape juste vos contraintes d'ouverture et vos postes, et l'IA vous génère le planning complet. Vous passez votre dimanche soir différemment."

---

SEGMENT 2 — RESTAURANTS TRADITIONNELS

Email froid :
Sujet : "Votre planning de la semaine en 2 minutes ?"
Première phrase : "Bonjour [prénom], je m'appelle Maxence, j'ai 19 ans et j'ai construit Nexus pour que les restaurateurs indépendants ne perdent plus leurs soirées à refaire leur planning."

DM LinkedIn :
"Bonjour [prénom], j'ai construit un logiciel de planning IA pour les restaurateurs. Conforme droit du travail, moins de 2€/jour. Vous avez 20 minutes cette semaine pour une démo ?"

Argument en démo :
"La plupart de mes clients me disent que leur hantise c'est le remplacement de dernière minute. Nexus a un marketplace intégré — vos employés voient le créneau ouvert et postulent directement."

---

SEGMENT 3 — RESTAURATION RAPIDE INDÉPENDANTE

Email froid :
Sujet : "Vous gérez encore le planning sur WhatsApp ?"
Première phrase : "Bonjour [prénom], vos employés vous envoient leurs dispos sur WhatsApp et vous faites le planning à la main ? Nexus centralise tout ça et le génère automatiquement."

DM Instagram :
"Hey [prénom], j'aide les restos rapides indépendants à faire leur planning auto avec l'IA. Essai 14 jours gratuit. C'est 49€/mois après. Ça vous dit ?"

Argument en démo :
"Avec le turnover que vous avez, la gestion des dispos et des remplacements c'est votre enfer. Nexus automatise ça — les employés renseignent leurs dispos sur leur téléphone, vous publiez en un clic."

---

## SECTION 11 — VERDICT FINAL

### 11.1 En 5 phrases

Tu as construit en quelques mois un produit qui ferait honte à des équipes de 5 personnes. L'architecture est solide, les features sont pensées, la compliance légale est un vrai avantage concurrentiel. Mais tu as fait l'erreur classique du développeur brillant : tu as construit une Ferrari dans un garage fermé. Le seul problème de Nexus aujourd'hui n'est pas technique — c'est que personne ne paie. Stripe doit être intégré cette semaine, même avec un Payment Link basique, et ensuite tu décroches ton téléphone pour appeler 10 patrons de boulangeries.

---

### 11.2 Si j'étais le fondateur demain matin

Demain matin à 9h : j'ouvre le dashboard Stripe, je crée 3 Payment Links en 30 minutes. Puis j'appelle le patron boulanger et je lui dis : "J'ai besoin que tu me présentes à 5 de tes collègues patrons cette semaine. En échange, tu auras Nexus gratuit à vie." L'après-midi, je fais ma première démo avec l'un de ses contacts.

Pas de code. Pas de Slack. Pas de GitHub. Juste des appels.

---

### 11.3 Scénarios à 6 mois

Scénario optimiste : tu as 15 clients payants à 49-89€/mois = 735-1 335€ MRR. Un expert-comptable CHR t'envoie 5 clients par mois. Tu commences à voir arriver des leads entrants via TikTok. Tu intègres un incubateur régional.

Scénario pessimiste : tu passes 6 mois à coder de nouvelles features sans avoir fait 10 démos. En fin d'année, tu as le meilleur logiciel de planning de France et zéro client payant. Tu burn out, tu abandonnes, et tu te demandes ce qui s'est passé. Ce scénario est le plus probable statistiquement si tu ne changes rien à ta routine aujourd'hui.

La différence entre les deux : combien de fois tu décroches le téléphone cette semaine.

---

### 11.4 LA chose que la majorité des gens ne font pas et qui change tout

Demander de l'argent.

Pas "voir si ça intéresse". Pas "essaie pendant 14 jours". Demander : "Est-ce que tu paierais 49€/mois pour ça ? Tu veux démarrer avec ta carte bleue ?"

La plupart des développeurs-fondateurs font des dizaines de démos, collectent des "c'est très bien !", et n'encaissent jamais un euro parce qu'ils n'ont jamais demandé explicitement le paiement. La démo n'est pas une fin en soi. C'est un prélude à la question : "On y va ?"

Demande. Le premier non ne te tue pas. Le premier oui change ta vie.

---

Nexus a tout pour réussir. La seule question c'est : est-ce que tu vas vendre, ou continuer à coder ?
