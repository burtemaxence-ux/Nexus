# Audit responsive & mobile — Quartzbase

**Date** : 26/07/2026
**Périmètre** : UX/UI mobile, responsive, PWA, ergonomie tactile, accessibilité mobile
**Hors périmètre** : sécurité (audit du 25/07/2026 déjà réalisé), logique métier, conformité légale
**Nature** : lecture seule — aucune correction appliquée, aucun fichier produit modifié

---

## 1. Executive summary

Le responsive « de base » est bon et ce n'est pas là que se situe le problème : il existe de vrais
composants mobiles dédiés (le planning hebdo n'est jamais rendu en grille 7 colonnes sur téléphone), la
badgeuse a des boutons de 58 px avec retour haptique, la barre de navigation basse gère `env(safe-area-inset)`,
et le poids des bundles est raisonnable (153 kB partagés, 170 kB sur le planning salarié). Sur 85
couples page × largeur mesurés, un seul débordement horizontal réel a été trouvé.

Le problème est ailleurs, sur trois points qui touchent le cœur de la promesse produit. **Un** : le
service worker ne met aucune page en cache (bug de `clone()` asynchrone) et le fallback hors-ligne
contient la page de connexion — un salarié en sous-sol obtient l'écran d'erreur brut de Chrome, pas le
planning. **Deux** : sur iPhone, le bandeau « Sur l'écran d'accueil » est rendu *derrière* la barre de
navigation et l'invite de notification ne s'affiche jamais — les salariés iOS ne recevront donc aucune
notification, sans explication. **Trois** : la proposition d'échange de shift n'existe pas côté interface
(l'API existe, aucun bouton ne l'appelle) alors que l'écran invite explicitement à cliquer sur « Proposer ».

En clair : ce ne sont pas des défauts de mise en page, ce sont trois fonctionnalités annoncées qui ne
fonctionnent pas sur le parc réel. Elles doivent être corrigées avant commercialisation. Le reste
(cibles tactiles secondaires, contrastes, tablette portrait) est réel mais peut suivre.

---

## 2. Scores par domaine

**Méthodologie de notation.** Chaque domaine part de 100. Déduction par finding selon la sévérité :
Bloquant −30, Critique −18, Majeur −10, Mineur −4, Cosmétique −1 (plancher 0). Le résultat est ensuite
confronté à ce qui a été réellement observé pour éviter les scores absurdes, et l'écart est justifié.
Un finding qui pèse sur deux domaines est compté dans les deux.

| # | Domaine | Score | Confiance | Base de la note |
|---|---------|-------|-----------|-----------------|
| 1 | Mise en page responsive | **62 / 100** | Élevée | Vérifié visuellement aux 5 largeurs. 1 seule source de débordement sur 85 mesures, mais elle touche la page la plus consultée ; tablette portrait dégradée. |
| 2 | PWA (installabilité, offline, notifications) | **15 / 100** | Élevée | Manifest correct et plomberie push côté SW correcte, mais l'offline ne fonctionne pas du tout (prouvé serveur coupé) et iOS est sans issue. Le modèle donnerait 0 ; 15 reconnaît ce qui est déjà en place. |
| 3 | Ergonomie tactile & conditions terrain | **62 / 100** | Élevée | Actions primaires réellement bien dimensionnées (58 px badgeuse, ~52 px Valider/Refuser, onglets ≥44 px). Le déficit est concentré sur le chrome secondaire (18–38 px) et les contrastes. |
| 4 | Performance mobile | **80 / 100** | **Faible** | Bundles et assets analysés (build de production réel, aucune image raster). **Ni Lighthouse ni throttling 4G n'ont pu être exécutés** — note provisoire portant sur l'analyse statique uniquement. |
| 5 | Flux critiques mobile-first | **34 / 100** | Élevée | Sur 3 flux demandés : 1 impossible (échange de shift), 1 amputé de sa dernière étape sur iOS (notification), 1 fonctionnel mais recouvert par un calque. |
| 6 | Accessibilité mobile | **68 / 100** | Moyenne | Contrôles icône sans nom accessible et textes 9 px mesurés. **L'agrandissement de police système n'a pas pu être testé** (impossible en Chromium headless) — voir observations. |

### Ce qui a été vérifié visuellement vs par lecture de code

**Vérifié par rendu réel** (Chromium 1194 via Playwright, 85 captures pleine page aux largeurs
320/375/390/414/768 px, en `isMobile` + `hasTouch`, locale fr-FR, sur les **vraies pages** — server
components, middleware et authentification réels) :

- tous les débordements horizontaux (mesure `scrollWidth − clientWidth` sur 85 pages)
- toutes les tailles de cibles tactiles (`getBoundingClientRect` sur les éléments interactifs)
- toutes les tailles de police d'input et les textes < 11 px (`getComputedStyle`)
- les contrôles icône sans nom accessible
- le contenu réel du cache du service worker, et le comportement hors-ligne **serveur réellement arrêté**
- le bandeau d'installation iOS et l'absence d'invite de notification (UA iPhone, `PushManager` retiré)
- le chevauchement des boutons flottants avec la barre de navigation (safe-area de 34 px simulée
  géométriquement, Chromium ne simulant pas l'encoche)
- les tailles de bundles (build de production réel)

**Par lecture de code seule — à confirmer sur appareil** : le conflit pull-to-refresh, le
comportement du clavier virtuel dans le panneau de l'assistant IA, le rendu de l'icône maskable sur
Android, l'agrandissement de police système. Ces points sont signalés comme tels dans les findings et
les observations.

**Méthode de rendu.** Un serveur Supabase factice (auth + REST) a été monté en local pour que les
vraies pages Next se rendent avec un jeu de données de restaurant réaliste (7 salariés, noms longs et
accentués, services coupés midi/soir, congés en attente). Aucun fichier du dépôt n'a été modifié pour
cela : seul `.env.local` pointe vers ce faux backend. Les captures montrent donc le code de production
tel quel, pas une maquette.

**Limite connue** : `/manager` (tableau de bord manager) n'a pas pu être instrumenté
automatiquement — `manager-metrics-client.tsx:97` déclenche un `window.location.reload()` quand
`/api/auth/set-role` ne répond pas `already_setup: true`, ce que le jeu de données factice ne
satisfaisait pas, détruisant le contexte de mesure. En production un manager déjà installé reçoit
`already_setup: true` et il n'y a pas de rechargement. Cette page a donc été auditée visuellement
uniquement.

---

## 3. Tableau des findings

| ID | Sévérité | Page / composant | Largeurs | OS | Description | Impact usage réel | Effort | Recommandation |
|----|----------|------------------|----------|----|-------------|-------------------|--------|----------------|
| M-01 | **Bloquant lancement** | `employee/echanges` + planning salarié | toutes | tous | `POST /api/exchanges` existe et est complet (vérifie propriété, date future, doublon) mais **aucune interface ne l'appelle**. L'état vide indique « cliquez sur « Proposer » sur un shift futur » ; le mot « Proposer » n'existe nulle part comme action (seules 2 occurrences sans lien, dans des réglages). Les shifts du planning salarié sont des `<div>` non interactifs. | Le salarié peut *accepter* l'offre d'un collègue mais ne peut **jamais en créer une**. Un des 3 flux critiques est impossible, sur tout appareil. L'écran donne une consigne qui ne mène à rien. | 6–10 h | Ajouter une action « Proposer à l'échange » sur la carte de shift du planning salarié (feuille de confirmation), branchée sur l'API existante. |
| M-02 | **Bloquant lancement** | `public/sw.js:47-52` | toutes | Android Chrome, iOS installé | `res.clone()` est appelé **dans le callback** de `caches.open().then()`, donc après que le corps de la réponse a été remis au navigateur → lève « body already used », avalé faute de `.catch`. **Aucune navigation n'est jamais mise en cache.** Vérifié : après une visite normale de `/employee/planning`, le cache ne contient que `/offline`. Serveur coupé → Chrome affiche « This site can't be reached — ERR_FAILED », y compris sur la page déjà visitée. | Le cas terrain annoncé (sous-sol, 4G coupée) échoue totalement : le salarié ne voit pas son planning, il voit une erreur navigateur en anglais. La page `/offline` promet « Certaines pages récentes restent accessibles hors ligne » : c'est faux. | 1–2 h | Cloner **avant** de rendre la réponse : `const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy))`, + `.catch()` explicite. |
| M-03 | **Bloquant lancement** | `middleware.ts:29-40` + `sw.js:6-8` | toutes | tous | `/offline` n'est pas dans la liste d'exemption du middleware (contrairement à `sw.js` et `manifest.webmanifest`) → 307 vers `/login`. `cache.addAll(['/offline'])` suit la redirection et **stocke la page de connexion**. Vérifié : entrée `/offline` → `redirected: true`, `url: /login`, 22 612 octets de HTML de login. | Une fois M-02 corrigé, l'utilisateur hors ligne atterrirait sur un écran de connexion inutilisable (se connecter exige le réseau) et croirait avoir été déconnecté. | 0,5 h | Ajouter `/offline` aux exemptions du middleware, comme `sw.js`. |
| M-04 | **Critique** | `ical-copy-button` / `employee/planning` | 320 → 768 | tous | L'URL iCal est rendue dans un `<p>` en `white-space: nowrap`, largeur 548 px, sans troncature ni conteneur de défilement. Débordement de page mesuré : **+418 px à 320 px**, +363 à 375, +348 à 390, +324 à 414, +218 à 768. Le bouton « Copier » est poussé hors écran. | La page la plus consultée par le salarié défile latéralement sur **tous** les téléphones. Le sélecteur de jour et le contenu se décalent ; « Copier » est inatteignable sans défilement horizontal. | 0,5 h | Tronquer l'URL (`overflow-hidden text-ellipsis`) ou, mieux, la masquer sur mobile et ne garder que le bouton « Copier ». |
| M-05 | **Critique** | `pwa-install-banner` + `push-subscribe` | toutes mobiles | **iOS Safari** | Mesuré à 390 px : le bandeau occupe y 777→844 (67 px) ; la barre de navigation occupe 784→844 et se peint **au-dessus** (son contexte d'empilement l'emporte malgré z-50 vs z-30). **60 des 67 px du bandeau sont masqués** — la capture montre le texte fantôme à travers la nav translucide. Simultanément `PushSubscribeBanner` retourne `null` sur iOS Safari (`'PushManager' in window` faux) : vérifié, aucune invite. | Le salarié iPhone ne voit jamais comment installer l'app ; or iOS exige l'installation pour le push web. Il ne recevra donc **jamais** la notification « planning publié », sans aucune explication. C'est une fonctionnalité mise en avant. | 3–5 h | Remonter le bandeau au-dessus de la nav (`bottom: calc(60px + env(safe-area-inset-bottom) + 8px)`) et le monter à la racine du DOM ; ajouter un message iOS expliquant que l'installation conditionne les notifications. |
| M-06 | **Critique** | `push-subscribe.tsx:60-67` | toutes mobiles | tous | `if (permState === 'denied') return null` : refus ou révocation → le bandeau disparaît définitivement. `dismiss()` écrit `push-dismissed` sans expiration. Aucun point de réactivation dans le profil ni les réglages. | Un « Bloquer » par erreur, ou une croix touchée par mégarde, et le salarié ne reçoit plus jamais de notification de planning — sans indication ni moyen de revenir en arrière. En restauration cela signifie manquer les changements de service. | 2–3 h | Exposer l'état des notifications dans `/employee/profil` avec la marche à suivre pour réautoriser ; faire expirer le rejet. |
| M-07 | **Majeur** | `app-shell` (breakpoint `md:`) + `planning-week-timeline` | **768** | iPad, tablettes Android | À 768 px la mise en page desktop s'active : sidebar (~260 px) + grille `minWidth: 860px` dans une fenêtre de 768. Mesuré : `mgr-planning` déborde de **+92 px** ; **367 cibles < 44 px** sur 16 pages à 768 px contre 161 à 414 px. Visuellement : noms tronqués en « Kevi… / Mari… / Lu… », libellés KPI coupés en plein mot (« Tota… », « Heu… », « Cou… »), 3 jours sur 7 visibles, horaires sur 2 lignes. Les protections `≤767px` (`.dp-input` 16 px / 44 px) cessent de s'appliquer : les inputs 13–14 px reviennent (zoom iOS). | Une tablette en arrière-cuisine offre une expérience **pire** qu'un téléphone. Le manager ne peut pas identifier ses salariés dans le planning. | 4–8 h | Basculer le shell desktop sur `lg:` (1024 px), ou replier la sidebar par défaut sous ~1100 px. Étendre les règles d'input au-delà de 767 px sur appareil tactile. |
| M-08 | **Majeur** | `onboarding-wizard.tsx:129-131,162` | 320 (coupé), toutes mobiles (recouvrement) | tous | Carte `position: fixed; right: 24px; bottom: 88px` en `w-80` (320 px). À 320 px de fenêtre, les 24 px de gauche sont **hors écran** — vérifié : « TAPE 1 / 5 », « 3ienvenue », « otre outil ». Sur chaque page manager elle recouvre le contenu : à 390 px elle masque la 2ᵉ demande de congé **et ses boutons Valider/Refuser** ; à 768 px la grille de planning. `bottom: 88px` ignore `env(safe-area-inset-bottom)`. `.catch(() => setVisible(true))` : le calque **réapparaît dès que le réseau échoue**, donc précisément sur la 4G dégradée visée. | Touche tout nouveau manager pendant ses premiers jours, sur les écrans qu'il est en train d'apprendre. Bloque la validation des congés depuis le téléphone. | 3–4 h | Feuille inférieure pleine largeur sur mobile, `max-width: calc(100vw - 32px)`, safe-area ; ne pas ouvrir le calque en cas d'échec de `fetch`. |
| M-09 | **Majeur** | Chrome global + planning | 320–414 (aggravé à 320) | tous | **169 occurrences < 44 px à 320 px** sur 16 pages. Récurrentes sur presque toutes les pages : retour fil d'Ariane « Accueil » 63×**18**, icône maison 12×**12**, cloche de notifications 28×**28**, « Activer » du bandeau push 65×**31** et sa croix 18×**18**, contrôles de l'assistant 22×22 et pastilles 6×6, logo d'en-tête 84×26. Spécifiques : chevrons de semaine 36×36, « Copier » 84×32, sélecteur de jour **38**×62 à 320 px uniquement, « + » ajout de shift 28×28 (manager mobile), onglets de réglages 33 px, « Annuler » une demande de congé 78×31. | Doigts humides ou gantés, écrans fissurés. La cloche à 28 px est le point d'entrée du flux « vérifier la réponse à ma demande de congé ». « Annuler » un congé est une action destructive à 31 px de haut. | 4–6 h | Porter le chrome secondaire à 44 px via zone tactile étendue (`-m-*` comme déjà fait pour l'avatar). Sélecteur de jour : passer à un défilement horizontal sous 360 px. |
| M-10 | **Majeur** | `app/globals.css` (tokens) | toutes | tous | Ratios WCAG 2.1 calculés sur les tokens réels. **Clair** : `--text-tertiary` #79828f = 3,89:1 sur carte et **3,57:1** sur page (AA texte normal exige 4,5) — c'est la couleur des libellés 9 px de la barre de navigation ; `--warning` #D97706 sur `--bg-page` = **2,92:1**, sous le plancher de 3:1 même pour du grand texte ; `--success` 3,03:1. **Sombre** : `--text-tertiary` #5a5a72 = **2,76:1** sur carte, pire que le clair. **Blanc sur `--accent` #6C63FF = 4,32:1** → tous les libellés de boutons primaires (« Publier », « Activer », « Pointer mon arrivée », « Nouveau ») sont sous AA (15 px semibold n'est pas du « grand texte »). Le commentaire de `globals.css` affirme ≥3:1 sur fond blanc : exact sur blanc, faux sur `--bg-page`, et 3:1 n'est pas le seuil du texte normal. | Cuisine très éclairée et écran de service devant une fenêtre sont précisément les conditions citées. Le mode clair est bien le défaut dans l'app (ce n'est pas du sombre imposé), mais l'écran de connexion est exclusivement sombre — le pire cas sur le premier écran. | 2–3 h | Assombrir `--text-tertiary` clair vers ~#5F6875, éclaircir le sombre vers ~#8A8AA3, `--warning` clair vers ~#B45309, et utiliser ~#5B52E8 pour le texte sur accent. |
| M-11 | **Majeur** | `mobile-planning.tsx:183-185` + `grid-cell.tsx` | < 768 (appui long), 768 (clic droit) | tous, iOS aggravé | Sur mobile, « Absence imprévue → rechercher un remplaçant » n'est atteignable que par un **appui long de 500 ms** sur un shift, sans aucune affordance (pas de menu ⋯, pas d'indice) et sans `user-select: none` / `-webkit-touch-callout: none` → iOS affiche la bulle de sélection de texte pendant l'appui. Sur desktop/tablette c'est `onContextMenu` (clic droit), impossible sur écran tactile. | Une absence imprévue 30 min avant le service est l'événement le plus urgent en restauration. La fonctionnalité existe mais est indécouvrable sur l'appareil que le manager a en main. | 3–4 h | Bouton ⋯ explicite sur chaque carte de shift, ouvrant la même feuille. |
| M-12 | **Mineur** | `globals.css` `.auth-input` | toutes mobiles | **iOS** | `.auth-input` est en `font-size: 14px` et le bloc `@media (max-width: 767px)` ne couvre que `.dp-input` et `.btn-*`. Mesuré à 375 px : `/login` #email et #password à 14 px, `/register` #fullName/#email/#password à 14 px (hauteurs 48 px, correctes). Safari zoome à la mise au point et ne dézoome pas. | Premier écran vu par chaque salarié : la page saute au premier appui. Cosmétique, mais donne le ton. | 0,5 h | Ajouter `.auth-input { font-size: 16px }` sous 768 px, à côté de la règle `.dp-input` existante. |
| M-13 | **Mineur** | `(auth)/login/page.tsx:44-52` | toutes | tous | Le gestionnaire ne traduit que « Email not confirmed » et « Invalid login credentials » ; tout le reste affiche `error.message` brut. Observé en conditions de backend injoignable : la carte affiche « **Failed to fetch** », en anglais. | Exactement le cas 4G de sous-sol : le salarié reçoit une chaîne technique anglaise au lieu de « Connexion indisponible, vérifiez votre réseau ». | 0,5 h | Intercepter les erreurs réseau et afficher un message français explicite. |
| M-14 | **Mineur** | `middleware.ts` (matcher) + `api/pwa/icon` + `manifest.ts` | toutes | Android surtout | Vérifié : `/api/pwa/icon?size=192` → **307 vers /login** hors session ; idem `/icon` et `/apple-icon` (le matcher exempte `sw.js` et `manifest.webmanifest`, pas ceux-là). Par ailleurs l'icône 512 est déclarée `purpose: 'maskable'` alors que la route incruste un arrondi de 18 % et dimensionne le symbole à 82 % du canevas — Android recadre dans son propre masque (double arrondi, coins rognés ; la zone sûre maskable est ~80 % de diamètre). Aucun `Cache-Control` sur la route, aucune icône 512 en `purpose: any`. | Pas de favicon ni d'icône de touche pour les visiteurs déconnectés. Les icônes de notification récupérées sans cookie résolvent vers du HTML de connexion au lieu d'un PNG → icône vide dans le volet de notifications. Icône d'écran d'accueil déformée sur Android (à confirmer sur appareil). | 1–2 h | Exempter `/api/pwa/`, `/icon`, `/apple-icon` dans le middleware ; produire une icône maskable pleine page sans arrondi incrusté, symbole à ~70 % ; ajouter une 512 `purpose: any` et un `Cache-Control` long. |
| M-15 | **Mineur** | `report-button.tsx:57` + `ai-assistant.tsx:393` | toutes mobiles | iPhone à barre de gestes, Android gestes | La barre de navigation mesure `calc(60px + env(safe-area-inset-bottom))` ; les deux boutons flottants sont à un `bottom-[80px]` en dur. Safe-area de 34 px simulée : nav en 750, hauteur 94 ; bas des boutons à 764 → **chevauchement de 14 px** pour les deux (support 48×48 z-40, assistant IA 52×52 z-50). À noter : `mobile-planning.tsx:210` applique la bonne formule `calc(60px + env(safe-area-inset-bottom,0px) + 16px)` — le motif correct existe déjà dans le dépôt. Par ailleurs `.safe-area-bottom`, utilisée par `pwa-install-banner`, **n'est définie nulle part** (ni `globals.css` ni `tailwind.config.ts`). | Deux boutons flottants empiètent sur la barre d'onglets sur les iPhone récents, gênant les appuis en bordure. | 1 h | Reprendre la formule de `mobile-planning.tsx` dans les deux composants ; définir ou retirer `.safe-area-bottom`. |
| M-16 | **Mineur** | `breadcrumb-nav.tsx:159` | toutes | tous | `/employee/profil`, `/employee/notifications` et `/employee/replacement/[id]` sont absents de `ROUTES` → miette de repli `'…'`. Vérifié visuellement à 320 px sur le profil : « Accueil │ ⌂ / … ». | La page d'acceptation de remplacement — atteinte depuis une notification push — n'a pas de titre dans le fil d'Ariane. Le salarié ne sait pas où il est. | 0,5 h | Ajouter les 3 routes manquantes à `ROUTES`. |
| M-17 | **Mineur** | `manager/rapport/pdf-button.tsx:3` | toutes | tous | `import { PDFDownloadLink } from '@react-pdf/renderer'` en haut d'un composant `'use client'` → la bibliothèque part dans le bundle de la route au chargement, même si le manager ne télécharge rien. Mesuré : `/manager/rapport` = **238 kB** de First Load JS contre 153 kB de socle (+85 kB). `compliance-options-panel.tsx` fait le même travail en `await import()` : le bon motif existe déjà. | 85 kB inutiles sur une page manager consultée en 4G dégradée. | 1 h | Passer `pdf-button.tsx` en import dynamique, comme `compliance-options-panel.tsx`. |
| M-18 | **Mineur** | `app/offline/page.tsx` | toutes | tous | La page rend ses propres `<html>/<head>/<body>` **à l'intérieur** de ceux du layout racine → imbrication invalide, `<meta viewport>` et `<title>` internes non fiables. Étant une route sous `app/`, elle hérite du layout racine : Analytics, SpeedInsights, Toaster, PwaRegister et le CSS des polices sont chargés. Mesuré : **155 kB** de First Load JS pour la page censée fonctionner sans réseau. | Contradiction de principe : la page de secours dépend de 155 kB de JS qu'elle ne peut pas télécharger hors ligne. | 1 h | Servir un fichier statique depuis `public/` (référencé par le SW), ou au minimum supprimer l'imbrication `<html>`. |
| M-19 | **Cosmétique** | `bottom-nav.tsx:62,84` | toutes mobiles | tous | Libellés « Accueil / Badgeuse / Planning / Congés » en **9 px**, couleur `--text-tertiary` (voir M-10 : 3,57:1 en clair, 2,76:1 en sombre) — présents sur les 16 pages mesurées. | 9 px en couleur faible dans une cuisine éclairée : les icônes portent seules la compréhension. | 0,5 h | Passer à 11 px et à `--text-secondary`. |
| M-20 | **Cosmétique** | `manager/conges` | 390 et moins | tous | L'onglet « En attente » passe sur deux lignes (« En » / « attente ») dans la rangée de 3 onglets. | Aucun impact fonctionnel, mais visible sur l'écran manager le plus utilisé sur mobile. | 0,5 h | Réduire le padding horizontal ou abréger le libellé. |

---

## 4. Priorisation

### Bloquant pour le lancement

Ce qui rend un flux critique inutilisable sur le parc réel de téléphones des utilisateurs.

1. **M-01 — Proposer un échange de shift est impossible.** L'API est complète, l'interface est absente,
   et l'écran donne une consigne qui ne mène à rien. Un des trois flux critiques annoncés.
2. **M-02 — Aucune page n'est mise en cache : hors-ligne = écran d'erreur Chrome.** Prouvé serveur
   coupé. C'est le scénario terrain central (sous-sol de cuisine, 4G intermittente).
3. **M-03 — Le fallback hors-ligne contient la page de connexion.** À corriger avec M-02, sinon
   corriger M-02 fait apparaître un écran de connexion inutilisable.
4. **M-05 — iOS : ni installation découvrable, ni notification.** Tout salarié sous iPhone est privé
   des notifications de planning, silencieusement. Sur un parc mixte Android/iPhone c'est la moitié
   des utilisateurs.
5. **M-06 — Notification refusée = plus jamais de notification, sans recours.** Un appui malheureux
   suffit ; aucune trace, aucun moyen de revenir.

**Charge totale du bloquant : environ 13 à 21 heures.** C'est peu au regard de l'enjeu : trois
fonctionnalités annoncées ne fonctionnent pas, et deux des cinq corrections (M-02, M-03) sont des
correctifs de quelques lignes.

### Peut attendre

Réel, mesuré, mais ne rend aucun flux impossible.

- **M-04** (débordement horizontal du planning, 0,5 h) — techniquement mineur en effort et très
  visible : à faire avec le lot bloquant, c'est une demi-heure.
- **M-07** (tablette portrait dégradée) — à traiter si la tablette fait partie des usages visés ;
  sinon reportable, les téléphones ne sont pas concernés.
- **M-08** (assistant d'onboarding qui déborde et recouvre) — n'affecte que la période d'onboarding,
  mais affecte 100 % des nouveaux managers.
- **M-09** (cibles tactiles secondaires 18–38 px) — chantier de fond, à étaler.
- **M-10** (contrastes sous AA) — important pour les conditions d'éclairage réelles, mais c'est un
  ajustement de tokens sans risque, à planifier sereinement.
- **M-11** (SOS remplacement indécouvrable) — la fonctionnalité existe, elle est juste cachée.
- **M-12 à M-20** — finitions : zoom iOS sur la connexion, message d'erreur réseau, icônes PWA,
  safe-area des boutons flottants, fil d'Ariane, react-pdf, page offline, 9 px, onglets.

---

## 5. Ce qui est bien fait

Signalé brièvement parce que c'est vrai et que cela oriente les corrections : le socle existe, il ne
faut pas le refondre.

- **Le planning hebdomadaire ne tombe jamais dans le piège de la grille 7 colonnes sur téléphone.**
  `employee-planning-grid` et `planning-week-timeline` ont chacun un rendu mobile dédié (sélecteur de
  jour + liste), et la table desktop est en `hidden md:block` dans un conteneur `overflow-x: auto`.
  C'était le risque structurel numéro un ; il est traité.
- **La badgeuse est la page la mieux conçue** : boutons pleine largeur de 58 px, retour haptique
  (`navigator.vibrate(25)`), libellés explicites. C'est exactement ce qu'il faut avec des mains
  humides. Elle ne figure dans aucun finding de dimensionnement.
- **Valider / Refuser un congé sur mobile fonctionne bien** : boutons ~52 px, code couleur clair,
  commentaire du salarié lisible.
- **La barre de navigation basse, l'en-tête mobile et les feuilles inférieures gèrent `env(safe-area-inset)`**,
  et l'avatar d'en-tête a une zone tactile de 44 px avec un commentaire expliquant la démarche. La
  connaissance est là ; deux composants l'ont juste oubliée (M-15).
- **Le composant `Dialog` est correct sur mobile** : feuille inférieure, `max-h-[85vh] overflow-y-auto`,
  poignée de glissement, et `padding-bottom: max(24px, env(safe-area-inset-bottom))` sous 640 px.
- **Les poids sont raisonnables** : 153 kB de socle, 156 kB sur l'accueil salarié, 170 kB sur le
  planning, 159 kB sur la badgeuse. À signaler tout de même : `/login` à **225 kB** est le point
  d'entrée le plus lourd du parcours salarié, ce qui mérite un coup d'œil.
- **Aucune image raster dans le produit.** Toute l'identité est en SVG (20 ko au total), les icônes
  PWA sont générées à la volée. La question « le mobile télécharge-t-il des assets pensés pour
  desktop » n'a pas lieu d'être ici. Seuls les avatars et logos téléversés passent par des `<img>`
  brutes sans `next/image` — à surveiller si un manager téléverse une photo de 4 Mo.
- **La balise viewport est correcte et complète** : `width=device-width, initial-scale=1,
  minimum-scale=1, viewport-fit=cover`. `viewport-fit=cover` est bien présent, condition nécessaire
  pour que `env(safe-area-inset-*)` fonctionne.
- **Le manifest est bien formé** : `display: standalone`, `theme_color`, `orientation:
  portrait-primary`, `start_url: /employee`, raccourcis Badgeuse et Planning. Le gestionnaire `push`
  du service worker est correct (titre, corps, vibration, `notificationclick` avec focus de fenêtre
  existante). Les problèmes PWA ne viennent pas de là.

---

## 6. Observations hors findings

À confirmer ou simplement à savoir — non chiffré, non noté.

- **Pull-to-refresh** : `overscroll-behavior` n'est utilisé nulle part. Le rafraîchissement par
  glissement du navigateur reste donc actif au-dessus des zones à défilement interne (panneau de
  l'assistant IA, feuilles inférieures). Non reproductible en Chromium headless — **à confirmer sur
  appareil**, et le correctif est un `overscroll-behavior: contain` sur ces conteneurs.
- **Clavier virtuel** : aucune gestion de `visualViewport` ni de `scrollIntoView` à la mise au point.
  Le panneau de l'assistant IA est en `fixed inset-0` avec sa zone de saisie en bas ; sur iOS les
  éléments `fixed` ne suivent pas le viewport visuel, la saisie peut donc passer derrière le clavier.
  Les formulaires classiques (modale de shift, congés) sont dans un `Dialog` à défilement et sont
  probablement corrects. **À confirmer sur appareil.**
- **Agrandissement de police système** : la base de code est intégralement en `px`
  (de `text-[9px]` à `text-[17px]`). Le Dynamic Type d'iOS n'affecte pas les tailles en `px` hors
  styles de texte système, tandis que le réglage de taille de police d'Android met bien ces textes à
  l'échelle dans Chrome — avec un risque de casse sur les libellés 9 px et les cartes à hauteur fixe.
  Non testable dans ce harnais : **à tester sur appareil** avant de conclure.
- **`components/dashboard/week-load-chart.tsx`** (qui importe recharts) n'est importé nulle part —
  fichier mort. Le tableau de bord utilise `week-load-bars.tsx`, en CSS pur, ce qui est le bon choix.
  Signalé sans le supprimer, conformément aux conventions du dépôt.
- **Les documents que `CLAUDE.md` déclare obligatoires au démarrage de session**
  (`.claude/COMMON_MISTAKES.md`, `.claude/QUICK_START.md`, `.claude/ARCHITECTURE_MAP.md`) **n'existent
  pas** dans le dépôt ; `.claude/` ne contient que `hooks/` et `settings.json`. Le protocole décrit
  dans `CLAUDE.md` n'est donc pas applicable en l'état.
- **`/manager` déclenche un aller-retour supplémentaire à chaque chargement** : `auth.getUser()` puis
  `POST /api/auth/set-role`, avec un `window.location.reload()` complet si la réponse n'est pas
  `already_setup: true` (`manager-metrics-client.tsx:97`). En production le cas normal renvoie
  `already_setup: true` et il n'y a pas de rechargement ; à vérifier tout de même qu'aucun compte réel
  ne retombe dans la branche de rechargement, car un reload complet sur la page d'atterrissage en 4G
  dégradée est très visible.
- **Onglets de réglages** : la rangée `Organisation / Établissements / Postes & rôles / …` défile
  horizontalement sans indicateur visuel (ni dégradé, ni flèche). Motif courant et acceptable, mais
  la découvrabilité repose sur le fait que le dernier onglet est visiblement coupé.

---

## 7. Reproduire les mesures

Le harnais est dans le répertoire de travail de la session (éphémère, non versionné) :

- `mock-supabase.mjs` — faux backend Supabase (auth + REST) avec jeu de données restauration
- `capture.mjs` — 85 captures pleine page, 2 rôles × 5 largeurs × 8-9 pages
- `probe.mjs` — mesures en page : débordement, cibles tactiles, tailles de police, noms accessibles
- `offline-true.mjs` + `run-offline.sh` — test hors-ligne avec arrêt réel du serveur
- `ios-pwa-test.mjs` — bandeau iOS, absence d'invite push, chevauchement safe-area
- `contrast.mjs` — ratios WCAG sur les tokens réels des deux thèmes

Seul `.env.local` a été créé pour pointer vers le faux backend. **Aucun fichier du produit n'a été
modifié.**
