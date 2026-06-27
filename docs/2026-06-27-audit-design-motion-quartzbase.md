# Audit Design, Motion & Micro-interactions — Quartzbase

> Audit critique catégorie par catégorie, orienté production via Claude Design.
> Réalisé sur le code réel (Next.js 14 / Tailwind / tokens CSS), pas sur des suppositions.
> Date : 27 juin 2026.

---

## Note de méthode

Cet audit est fondé sur la lecture du code de production, pas sur le design system « théorique » du brief. Quelques écarts entre le brief et la réalité, qui changent l'analyse :

- **Le produit a DEUX thèmes complets**, pas un seul dark. Le `:root` (clair, commenté « Dhonu-style ») et le `.dark` cohabitent dans `globals.css`.
- **La landing, l'auth et les pages légales sont verrouillées en dark** : le script inline de `app/layout.tsx` force `.dark` sur tout ce qui n'est pas `/manager` `/employee` `/supervisor`. Aucun toggle possible là.
- **L'app (`/manager`, `/employee`) est dark par défaut, mais le clair est un choix persistant** (toggle `dp-theme`). Un gérant peut basculer tout son back-office en clair, et ça reste.
- Le fond réel du dark n'est pas `#0a0a0f` partout : tokens à `#0b0b12` / `#13131c`, landing hardcodée à `#0a0a0f`, card auth à `#0f0f16`. Trois noirs légèrement différents — détail qui compte (voir Cohérence transversale).

Cette dualité de thème est le fait le plus structurant du produit et irrigue tout l'audit.

---

## 1. Synthèse exécutive

Quartzbase n'est pas un produit « sans design ». C'est un produit avec **un gradient de soin très marqué** : la landing et l'écran de connexion sont d'un niveau réellement premium (Awwwards-adjacent sur la démo IA animée), le dashboard manager est solide et habité de mouvement utile, puis la qualité décroît à mesure qu'on s'enfonce dans les écrans profonds (paramètres, facturation, planning en drag, emails) jusqu'à du fonctionnel plat. Le motion, là où il existe, est **techniquement propre** : `transform`/`opacity` quasi partout, `prefers-reduced-motion` respecté avec une rigueur rare (CSS et JS), easings cohérents de la famille expo-out. Le problème n'est donc pas la compétence — elle est démontrée — mais **la distribution inégale de cette compétence** et l'absence d'une signature de mouvement unique qui relierait le tout.

La plus grosse force : **la `PlanningDemo` du hero** — une vraie narration par le mouvement (frappe → réflexion → remplissage cellule par cellule → badge conforme). C'est l'argument produit raconté sans un mot.
La plus grosse faiblesse : **les emails transactionnels et les écrans de réglages** — zéro identité Quartzbase, génériques, là où l'utilisateur passe pourtant du temps.
L'incohérence n°1 : **le saut dark verrouillé → app dark-mais-clair-possible**. On vend une expérience dark premium immuable sur la landing/auth, puis on lâche l'utilisateur dans une app qui, elle, doute d'elle-même au point d'avoir construit un thème clair complet. Le produit n'a pas tranché ce qu'il est.

**Note design globale : 6,5 / 10**
**Note motion globale : 6,5 / 10**
(La landing tire la moyenne vers le haut ; les écrans profonds et les emails la plombent.)

---

## 2. Tableau récapitulatif

| # | Catégorie | Design /10 | Motion /10 | Priorité d'intervention |
|---|-----------|:---:|:---:|---|
| 1 | Landing page | 8 | 8,5 | 🟢 Protéger, raffiner |
| 2 | Connexion / inscription | 7,5 | 7 | 🟡 Désencombrer le motion |
| 3 | Dashboard manager | 7,5 | 7,5 | 🟢 Raffiner |
| 4 | Espace employé | 6 | 5 | 🟡 Hisser au niveau dashboard |
| 5 | Planning / vue semaine (cœur) | 6,5 | 5 | 🔴 Le drag mérite mieux |
| 6 | Paramètres / settings | 5 | 3 | 🔴 Plat, à structurer |
| 7 | Facturation / billing | 5,5 | 3,5 | 🟡 Moment-clé sous-traité |
| 8 | Parrainage / partenaires | 6 | 4 | 🟡 Gamifier la progression |
| 9 | États transitoires | 7 | 6,5 | 🟢 Bonne base, compléter |
| 10 | Navigation & layout | 6,5 | 5,5 | 🟡 Unifier hover & transitions |
| 11 | Footer | 6 | 4 | 🟢 Mineur |
| 12 | Emails transactionnels | 4 | 1 | 🔴 Aucune identité |
| 13 | Mobile / PWA | 6,5 | 5,5 | 🟡 Gestes & bottom nav |
| 14 | Cohérence transversale | 5 | 5 | 🔴 Trois noirs, deux thèmes |

---

## 3. Audit détaillé catégorie par catégorie

---

### 1. Landing page 🟢

#### A. Observation critique
La référence du produit, et elle le mérite. Hero en grille 2 colonnes, fond `linear-gradient(135deg, #0d0b1f → #0a0a0f)` avec un glow violet radial en haut-gauche — le dark n'est pas « écran éteint », il a de la profondeur. Titre en Syne 700 avec dégradé `white → violet → vert → white` animé en boucle (`gradient-flow 5s`). Entrées en cascade (`hero-delay-0..3`, fade-up 600ms). CTA primaire avec shimmer en boucle (`cta-shimmer 3.5s`). Le mockup lévite (`hero-float 3s`). Et surtout la `PlanningDemo` : machine à états `typing → thinking → filling → done`, pilotée par IntersectionObserver (ne tourne que visible), curseur clignotant, spinner, shimmer de « réflexion », puis remplissage des cellules une à une (140ms d'écart, scale 0.85→1) et badge « ✓ Conforme Code du Travail » en fin. Tout est `prefers-reduced-motion`-safe (état final figé immédiatement).

Ce qui cloche, à ce niveau d'exigence : (1) le dégradé de titre qui boucle *en permanence* attire l'œil en continu — un mouvement infini sur le H1 est un aimant attentionnel qui fatigue ; (2) les sections sous le hero (problème, solution, comparaison…) reposent sur `useScrollReveal` (fade-up 600ms, translateY 20px) — correct mais générique et identique partout, donc aucune narration de scroll ; (3) le hero est 100vh, ce qui repousse toute la preuve sous la ligne de flottaison.

#### B. Verdict design : **8 / 10**
Profondeur, hiérarchie, identité : tout y est. Premium réel. On retire 2 points pour le titre en sur-mouvement permanent et un fond qui pourrait gagner en matière (grain).

#### C. Verdict motion : **8,5 / 10**
La `PlanningDemo` est de la narration par le mouvement de haut niveau — rare. L'orchestration (stagger, IntersectionObserver, reduced-motion) est propre. On retire 1,5 pour la monotonie du scroll-reveal et le gradient infini.

#### D. Améliorations précises
- **Quoi** : couper le dégradé animé du titre après 1 cycle. **Pourquoi** : le premium, c'est le restraint ; un H1 qui scintille à l'infini fait « template ». **Comment** : passer l'animation à `gradient-flow 5s linear 600ms 1 forwards` (jouer une fois) au lieu d'`infinite`, ou ne l'animer qu'au survol. **Priorité** : 🟡
- **Quoi** : différencier le scroll-reveal par section. **Pourquoi** : aujourd'hui tout monte pareil (translateY 20px) ; le mouvement ne hiérarchise rien. **Comment** : dans `useScrollReveal`, lire un `data-reveal-variant` (`up` / `left` / `scale`) et appliquer des transforms distincts ; staggerer les enfants d'une section via `data-reveal-delay` croissants (0/80/160ms). Garder `transform`+`opacity` uniquement, easing `cubic-bezier(0.16,1,0.3,1)`. **Priorité** : 🟢
- **Quoi** : ajouter une couche de grain/texture très subtile sur le fond hero. **Pourquoi** : casser l'aplat « numérique » du dark. **Comment avec Claude Design** : overlay SVG `feTurbulence` (baseFrequency ~0.9) en `opacity: 0.025`, `mix-blend-mode: overlay`, `pointer-events:none`, statique (pas animé). **Priorité** : 🟢

#### E. Ce qu'il NE faut PAS changer
**La `PlanningDemo`.** Ne pas y toucher. C'est l'actif design le plus précieux du produit : elle démontre la promesse (planning IA conforme) en 6 secondes, elle est performante (observer + reduced-motion), et son timing (frappe 60ms/char, pause 650ms, réflexion 1300ms, remplissage 140ms/cellule) est calibré. Toute « amélioration » risque de casser la lisibilité de la démonstration. On la protège et on l'érige en modèle (voir §5).

---

### 2. Page de connexion / inscription 🟡

#### A. Observation critique
Très soignée et… **surchargée**. La card (`.auth-card`) cumule : bordure aurora animée (`auroraMove 3s`), entrée `cardReveal` (translateY+scale+blur, expo-out), cascade interne 7 niveaux (`auth-cascade-1..7`, 50→350ms), glow de fond pulsé (`glowPulse 4s`), 5 particules flottantes (`float 8–13s`), et shake sur erreur. Inputs et boutons ont des focus/hover propres (ring violet `0 0 0 3px rgba(108,99,255,0.15)`, lift `-1px`). C'est beau **à l'arrêt**. En mouvement, c'est l'effet « sapin de Noël » contre lequel le brief met en garde : 4 animations infinies tournent en même temps (aurora + glow + 5 particules) derrière un formulaire de login. Pour un gérant de 50 ans pressé, c'est du bruit.

#### B. Verdict design : **7,5 / 10**
Composition, hiérarchie, focus states : excellents. La card bicolore violet/vert est identitaire. -2,5 pour la densité d'effets décoratifs qui n'aident pas la tâche (se connecter).

#### C. Verdict motion : **7 / 10**
Techniquement irréprochable (reduced-motion couvre tout). Mais le motion sert la décoration plus que l'utilisateur. Le shake d'erreur, lui, est parfait : feedback immédiat et lisible.

#### D. Améliorations précises
- **Quoi** : réduire les animations infinies simultanées de 4 à 1. **Pourquoi** : restraint = premium ; et chaque animation infinie coûte du GPU sur mobile bas de gamme (la cible). **Comment** : garder l'aurora de bordure (signature), supprimer le `glowPulse` OU le réduire à une opacité fixe, passer les particules de 5 à 2 et ralentir (`animation-duration` 16–20s). **Priorité** : 🟡
- **Quoi** : faire respirer le bouton submit pendant le chargement au-delà du spinner. **Pourquoi** : récompenser l'action. **Comment** : sur `loading`, animer la largeur du label vers un état compact + garder le `Loader2`, transition `opacity 150ms`. (Déjà partiellement là — juste soigner.) **Priorité** : 🟢

#### E. Ce qu'il NE faut PAS changer
**Le shake sur erreur** (`shake 0.4s`, translateX ±8/5px) et **les focus states des inputs**. Le shake est le meilleur micro-feedback du produit : il dit « non » sans lire un mot, il est court, il respecte reduced-motion. Y toucher serait perdre de la clarté. La cascade d'entrée 7 niveaux peut rester aussi — elle ne tourne qu'une fois, elle n'est pas dans le « bruit infini ».

---

### 3. Dashboard manager 🟢

#### A. Observation critique
Le deuxième sommet du produit. KPIs avec compteur animé (`useCountUp`, ease-out cubique, 800ms), cartes qui se soulèvent au survol (`translateY(-2px)` + ombre violette + glow), sparklines SVG dont les barres poussent en cascade (`bar-grow-up`, `animationDelay i*45ms`, expo-out). Sections révélées en stagger (`dashboard-s0..s3`, 0/80/160/240ms). Skeleton de chargement qui **mime exactement** la mise en page finale (anti-layout-shift, vrai souci de qualité). Alertes actionnables colorées par sémantique (congés jaune, retards rouge, échanges violet). Hiérarchie claire : ce qui demande attention à droite, opérationnel à gauche.

Limites : les 5 cartes KPI comptent toutes en même temps au même rythme → la valeur du dashboard « apparaît » en bloc plutôt que de se révéler. Le chiffre en Syne 700 30px est bien, mais le `subLabel` est terne. Pas de transition d'état quand une métrique change après une action (ex : valider un congé ne fait pas redescendre le compteur en douceur).

#### B. Verdict design : **7,5 / 10**
Dense sans être confus, sémantique couleur respectée, skeleton exemplaire. -2,5 : manque un peu de respiration et de hiérarchie typographique dans les sous-cartes.

#### C. Verdict motion : **7,5 / 10**
Count-up + grow-bars + stagger : du mouvement qui *raconte la donnée*. -2,5 : tout démarre trop simultanément, et aucune animation ne relie une action à son effet sur les chiffres.

#### D. Améliorations précises
- **Quoi** : staggerer le count-up des 5 KPIs. **Pourquoi** : transformer « le tableau de bord apparaît » en « le tableau de bord se construit ». **Comment** : passer un `delay` croissant (0/90/180/270/360ms) à `useCountUp` avant de lancer le `requestAnimationFrame`. Garder 800ms de durée. **Priorité** : 🟡
- **Quoi** : animer la transition de valeur quand une métrique change (après validation). **Pourquoi** : continuité, l'action a une conséquence visible. **Comment** : relancer `useCountUp` de l'ancienne vers la nouvelle valeur (pas de 0) quand `target` change ; flash bref de la card (`box-shadow` accent 300ms puis retour). **Priorité** : 🟢
- **Quoi** : alerte critique pulsée déjà présente (`alert-pulse`) — l'appliquer aux retards/conflits seulement. **Pourquoi** : le pulse doit être rare pour rester un signal. **Comment** : réserver `alertPulse 2s` à `latenessCount>0` uniquement. **Priorité** : 🟢

#### E. Ce qu'il NE faut PAS changer
**Le `MetricsSkeleton` qui réplique la mise en page finale.** C'est de l'artisanat anti-CLS qu'on voit rarement. Le remplacer par un spinner générique serait une régression de perception de qualité. Idem pour le **hover lift des cartes** (`-2px` + glow violet) : la valeur d'élévation est juste, à généraliser ailleurs (voir §5), pas à modifier ici.

---

### 4. Espace employé 🟡

#### A. Observation critique
L'écart de soin commence ici. Planning perso, badgeuse, congés, échanges, marketplace : la badgeuse bénéficie d'un vrai travail motion (présent dans `globals.css` : `dotPulseGreen/Yellow`, `badgeuse-ripple` au clic, `badge-burst`, `dial-glow`, `check-draw` du checkmark dessiné). Mais les listes (congés, échanges, notifications) retombent sur du fonctionnel : cartes statiques, `pres-reveal` au mieux. L'employé est pourtant l'utilisateur le **plus mobile et le plus fréquent** — c'est lui qui pointe tous les jours.

#### B. Verdict design : **6 / 10**
Correct, lisible, mais sans le liant premium du dashboard manager. La badgeuse sauve la note.

#### C. Verdict motion : **5 / 10**
Riche sur la badgeuse, pauvre ailleurs. Incohérence interne à l'espace lui-même.

#### D. Améliorations précises
- **Quoi** : appliquer le `pres-reveal` (déjà défini) systématiquement aux listes employé en stagger. **Pourquoi** : unifier la sensation avec le dashboard. **Comment** : `className="pres-reveal"` + `style={{animationDelay: i*50ms}}` sur chaque item de liste (congés, échanges, marketplace). Easing déjà bon (`cubic-bezier(0.22,1,0.36,1)`). **Priorité** : 🟡
- **Quoi** : feedback de validation au pointage encore plus tangible. **Pourquoi** : le geste quotidien mérite une récompense. **Comment** : déclencher `check-draw` (checkmark SVG dessiné, déjà codé) + `badge-burst` à la confirmation clock-in, toast sonner avec icône verte. **Priorité** : 🟢
- **Quoi** : carte « prochain shift » en tête de l'espace employé, avec compte à rebours animé. **Pourquoi** : la première info utile pour un employé, c'est « quand je bosse ». **Comment** : card accent, heure en Syne, `count-up` inverse ou texte « dans 3h12 », `dp-status-dot` pulsé si shift imminent. **Priorité** : 🟡

#### E. Ce qu'il NE faut PAS changer
**La badgeuse.** Le `ripple` au clic + `badge-burst` + `dial-glow` + `check-draw` forment un moment de feedback abouti pour l'action la plus répétée du produit. C'est exactement là qu'il faut du motion riche. Ne pas diluer.

---

### 5. Planning / vue semaine (le cœur du produit) 🔴

#### A. Observation critique
La vue cœur, et le motion y est en retrait par rapport à son importance. `ShiftCard` utilise `@dnd-kit` : pendant le drag, la carte source passe à `opacity: 0.35` et suit le curseur via `CSS.Translate`. Hover = `brightness(0.96)`, bouton SOS qui apparaît en coin, menu contextuel en `dp-fade-up 120ms`. C'est **fonctionnel mais sans âme** : pas de drag overlay avec rotation/scale, pas de feedback sur les zones de drop (la cellule cible ne réagit pas), pas d'animation de « pose » quand on lâche un shift, pas de spring. Le geste central du produit — déplacer un créneau — est le moins gratifiant.

#### B. Verdict design : **6,5 / 10**
Cartes lisibles, bordure gauche colorée par poste (bon code visuel), conflits signalés (`AlertTriangle`). Mais l'ensemble est dense et un peu administratif.

#### C. Verdict motion : **5 / 10**
Le drag marche, point. Aucune narration, aucun plaisir d'usage sur l'interaction la plus stratégique.

#### D. Améliorations précises
- **Quoi** : `DragOverlay` dnd-kit avec élévation. **Pourquoi** : un shift « soulevé » doit *se sentir* soulevé. **Comment avec Claude Design** : remplacer le drag inline par `<DragOverlay>` rendant une copie de la card avec `transform: scale(1.04) rotate(-1.5deg)`, `box-shadow: 0 12px 32px rgba(0,0,0,0.35)`, `cursor: grabbing`. La carte source reste à `opacity: 0.4`. **Priorité** : 🔴
- **Quoi** : réaction des cellules de drop. **Pourquoi** : guider l'œil, réduire l'erreur de pose. **Comment** : sur `isOver` (useDroppable), cellule cible `background: var(--accent-light)` + `box-shadow: inset 0 0 0 1.5px var(--accent)`, transition 120ms. **Priorité** : 🔴
- **Quoi** : animation de « pose » au drop. **Pourquoi** : confirmer l'action, continuité. **Comment** : à la fin du drag, la card jouée `pres-reveal`-like : `keyframes` scale 0.92→1 + translateY 4px→0 sur 200ms, easing `cubic-bezier(0.34,1.56,0.64,1)` (léger overshoot = sensation « clic en place »). Respecter reduced-motion. **Priorité** : 🟡
- **Quoi** : quand le planning IA se génère (vrai produit, pas la démo), répliquer le remplissage cellule-par-cellule de la `PlanningDemo`. **Pourquoi** : faire vivre dans le produit la promesse vendue sur la landing — cohérence narrative totale. **Comment** : à réception du plan IA, révéler les shifts en stagger (60ms, scale 0.85→1, opacity) dans l'ordre employé puis jour. **Priorité** : 🔴 (c'est LE moment signature in-app)

#### E. Ce qu'il NE faut PAS changer
La **bordure gauche colorée par poste** et le **menu contextuel** (fade 120ms, sections Modifier/Copier/Supprimer) : lisibles, rapides, justes. Le code couleur poste est un repère cognitif important pour scanner une semaine — ne pas le remplacer par du fond plein (qui écraserait la lisibilité du texte).

---

### 6. Paramètres / settings 🔴

#### A. Observation critique
Le point bas avec les emails. Une douzaine de sous-pages (organisation, postes, règles, contrats, alertes, intégrations, RGPD, exports…) construites en `dp-card` + `dp-input`, sans aucun motion propre au-delà du `page-transition` global (un simple `animate-fade-up` 220ms à la navigation). Pas de hover sur les rangées, pas de transition d'enregistrement, pas de feedback de sauvegarde au-delà d'un éventuel toast. Pour un gérant non-tech, ces écrans denses et statiques sont **intimidants** : beaucoup de champs, aucun guidage visuel, aucune récompense quand on configure.

#### B. Verdict design : **5 / 10**
Cohérent (mêmes composants), mais plat et administratif. La sidebar settings (`_sidebar.tsx`) aide à structurer mais l'intérieur est un mur de formulaires.

#### C. Verdict motion : **3 / 10**
Quasi nul. Seul le fade-up de page joue.

#### D. Améliorations précises
- **Quoi** : feedback de sauvegarde tangible sur chaque section. **Pourquoi** : un gérant non-tech a besoin de *voir* que « c'est enregistré ». **Comment** : bouton qui passe `Enregistrer → spinner → ✓ Enregistré` (réutiliser `check-draw`), bordure de la card flashée en `var(--success)` 600ms puis retour, transition `box-shadow`. **Priorité** : 🔴
- **Quoi** : hover et focus-within sur les rangées de réglage. **Pourquoi** : montrer ce qui est éditable, désintimider. **Comment** : `:hover` rangée `background: var(--accent-light)` 120ms ; `:focus-within` bordure accent. GPU-safe. **Priorité** : 🟡
- **Quoi** : révélation en stagger des sections de settings à l'entrée. **Pourquoi** : aligner avec le dashboard, casser le mur. **Comment** : `dashboard-s0..s3` (déjà définis) sur les blocs de chaque page settings. **Priorité** : 🟡

#### E. Ce qu'il NE faut PAS changer
La **structure sidebar + contenu** des settings : l'organisation est saine, le problème est l'habillage, pas l'architecture. Ne pas partir dans une refonte d'IA de navigation — c'est le motion et les états de feedback qui manquent, pas le plan du site.

---

### 7. Facturation / billing 🟡

#### A. Observation critique
`billing-client.tsx` (414 lignes) gère plans, abonnement, portail Stripe, bannière past-due (`past-due-banner.tsx`, `paywall-gate.tsx`). Le moment où l'utilisateur **paie** est un moment de confiance maximal — or il est traité comme un écran utilitaire. Pricing in-app probablement sobre. Pas de mise en valeur du plan actif, pas de transition au changement de plan, pas de réassurance animée.

#### B. Verdict design : **5,5 / 10**
Fonctionnel et clair (c'est déjà ça pour du billing), mais sans la chaleur/réassurance qu'un moment payant exige.

#### C. Verdict motion : **3,5 / 10**
Statique. La bannière past-due ne dramatise pas assez (ou trop ?) — à vérifier au cas par cas.

#### D. Améliorations précises
- **Quoi** : carte du plan actif mise en valeur. **Pourquoi** : rassurer (« vous êtes bien couvert ») et faciliter l'upsell. **Comment** : plan actif avec bordure aurora (réutiliser le gradient violet/vert de `.auth-card`), badge « Actuel » en `dp-badge-info`, hover lift sur les autres plans pour inviter à comparer. **Priorité** : 🟡
- **Quoi** : transition de sélection de plan. **Pourquoi** : rendre le choix tangible avant le checkout. **Comment** : au clic plan, `transform: scale(1.02)` + ring accent 150ms, le CTA récapitule le plan choisi. **Priorité** : 🟢
- **Quoi** : confirmation de paiement réussi célébrée. **Pourquoi** : récompenser la conversion, ancrer la relation. **Comment** : au retour Stripe succès, écran/modale avec `check-draw` + court burst, message Syne « Bienvenue dans Pro ». Pas de confettis (hors-ton pour la cible). **Priorité** : 🟡

#### E. Ce qu'il NE faut PAS changer
La **logique Stripe et les garde-fous paywall** (`plan-guard`, `paywall-gate`) : c'est du back-office critique testé (`plan-guard.test.ts`, `subscription.test.ts`). On habille, on ne refactore pas. Toute proposition motion ici est purement additive et ne doit pas toucher au flux de paiement.

---

### 8. Parrainage / partenaires 🟡

#### A. Observation critique
`parrainage/page.tsx` : header avec icône Gift, 3 stats (filleuls actifs / en attente / réduction), barre de progression (`progressPct`), étapes explicatives, bouton copie de lien. C'est **clair et bien pensé fonctionnellement** — mais c'est une mécanique de jeu (collectionner des filleuls, débloquer -X%) servie sans aucune dynamique. La barre de progression est statique. Le chiffre de réduction (`-X%`) ne se célèbre pas quand il augmente.

#### B. Verdict design : **6 / 10**
Bonne info-archi, stats lisibles, étapes pédagogiques. Manque la dimension ludique que le sujet appelle.

#### C. Verdict motion : **4 / 10**
La progression existe en donnée mais pas en mouvement.

#### D. Améliorations précises
- **Quoi** : barre de progression animée au chargement. **Pourquoi** : montrer le chemin parcouru et restant = motivation. **Comment** : `width` 0 → `progressPct` via `transform: scaleX()` (GPU, pas `width`) sur 700ms, easing `cubic-bezier(0.22,1,0.36,1)`, remplissage en dégradé violet→vert. **Priorité** : 🟡
- **Quoi** : count-up sur les 3 stats. **Pourquoi** : cohérence avec le dashboard, donner du poids aux chiffres. **Comment** : réutiliser `useCountUp`/`count-up.tsx`. **Priorité** : 🟢
- **Quoi** : micro-célébration au passage d'un palier (-5% → -10%). **Pourquoi** : récompenser le comportement qu'on veut encourager (parrainer). **Comment** : `badge-burst` autour du chiffre de réduction + flash vert quand un filleul passe actif. **Priorité** : 🟢
- **Quoi** : feedback de copie du lien. **Pourquoi** : confirmer l'action clé de la page. **Comment** : `CopyButton` → icône `Copy → Check` morph + texte « Copié ! », retour après 1,5s. **Priorité** : 🟡

#### E. Ce qu'il NE faut PAS changer
Les **4 étapes pédagogiques** (`STEPS`) : pour la cible non-tech, expliquer le mécanisme de parrainage en 4 phrases est exactement ce qu'il faut. Ne pas les remplacer par des icônes seules ou un visuel « malin » qui perdrait le gérant.

---

### 9. États transitoires (loading, empty, erreur, toasts) 🟢

#### A. Observation critique
Catégorie étonnamment mûre. `skeleton-shimmer` (sweep 1,6s, reduced-motion off), `loading.tsx` sur quasi toutes les routes (bon réflexe App Router), toasts sonner stylés aux tokens (`bg-card`, border 0.5px, radius 12px), `error.tsx` et `error-boundary.tsx` présents. Empty states existent dans de nombreux écrans (congés, échanges, marketplace, roster). Le `check-draw` (checkmark SVG dessiné) est une jolie pièce. Manque : les empty states sont probablement textuels et statiques (« Aucun… ») sans illustration ni CTA animé, et il n'y a pas de transition unifiée entre skeleton → contenu (le contenu « pop » plutôt que de fondre depuis le skeleton).

#### B. Verdict design : **7 / 10**
Couverture large, toasts identitaires, skeletons soignés. -3 : empty states trop sobres, pas d'illustration de marque.

#### C. Verdict motion : **6,5 / 10**
Shimmer + check-draw + fade-up : bonne base. Manque la continuité skeleton→données.

#### D. Améliorations précises
- **Quoi** : crossfade skeleton → contenu. **Pourquoi** : éviter le « pop » brutal quand la donnée arrive. **Comment** : wrapper le contenu réel en `animate-fade-up` (220ms, déjà défini) au montage, et faire sortir le skeleton en `opacity` 150ms. **Priorité** : 🟡
- **Quoi** : empty states avec micro-illustration + CTA. **Pourquoi** : un écran vide est une opportunité d'onboarding, pas un cul-de-sac. **Comment avec Claude Design** : SVG léger (planning vide, congé) en `var(--text-tertiary)`, animation d'entrée douce (fade + scale 0.95→1, 400ms), CTA accent « Créer le premier… ». **Priorité** : 🟡
- **Quoi** : toasts d'action avec icône colorée par type. **Pourquoi** : lecture instantanée succès/erreur. **Comment** : sonner `richColors` ou icônes custom (✓ vert / ✕ rouge), `slide-in` depuis le bas-droite (déjà positionné). **Priorité** : 🟢

#### E. Ce qu'il NE faut PAS changer
Le **respect de `prefers-reduced-motion` sur le shimmer et le check-draw**, et la **présence systématique des `loading.tsx`**. C'est de l'hygiène que beaucoup de produits n'ont pas. Ne jamais retirer ces garde-fous pour « simplifier ».

---

### 10. Navigation & layout global 🟡

#### A. Observation critique
Sidebar desktop (`sidebar.tsx`, 466 l.), bottom-nav mobile (`bottom-nav.tsx`, 405 l.), topbar (447 l.), breadcrumb, recherche. La bottom-nav a un bouton central accentué (rond violet, 40px, shadow) — bon pattern mobile. Le `PageTransition` applique `animate-fade-up` 220ms à chaque navigation. Mais : **trois langages de hover coexistent** dans le produit (cartes dashboard `translateY(-2px)`+glow, boutons `scale(0.97)` à l'`:active`, nav `bg-accent-light` sans déplacement, shift cards `brightness`). Aucune transition partagée entre sidebar active-state et contenu. La transition de page est un simple fade, pas de continuité spatiale.

#### B. Verdict design : **6,5 / 10**
Navigation complète, bottom-nav mobile bien pensée, mais hover/élévation incohérents d'une zone à l'autre.

#### C. Verdict motion : **5,5 / 10**
Fade de page correct mais générique ; l'indicateur d'onglet actif ne « glisse » pas.

#### D. Améliorations précises
- **Quoi** : indicateur actif glissant dans la sidebar et la bottom-nav. **Pourquoi** : continuité, l'œil suit où il est. **Comment** : élément `::before` partagé positionné en `transform: translateY()` sur l'item actif, transition 250ms `cubic-bezier(0.16,1,0.3,1)` (effet « la pastille suit l'onglet »). **Priorité** : 🟡
- **Quoi** : unifier le hover sur 3 niveaux (voir §5 signature). **Pourquoi** : un produit cohérent réagit pareil partout. **Comment** : définir 3 classes utilitaires (`.hov-lift` cartes, `.hov-tint` rangées/nav, `.press` boutons `scale(0.97)`) et les appliquer ; supprimer les hovers ad-hoc. **Priorité** : 🟡
- **Quoi** : transition de page directionnelle légère. **Pourquoi** : sentir la navigation. **Comment** : dans `PageTransition`, fade-up 220ms suffit, mais ajouter un très léger `translateY(8px→0)` (déjà le cas via `dp-fade-up`? non, c'est opacity-only) → ajouter le translateY. Garder court. **Priorité** : 🟢

#### E. Ce qu'il NE faut PAS changer
La **bottom-nav mobile avec bouton central accentué** : c'est le bon pattern pour la cible mobile, ergonomique au pouce. Et la **simplicité du `PageTransition`** (220ms) : une transition de page courte est mieux qu'une transition spectaculaire qui ralentit la navigation quotidienne. On l'enrichit d'un translateY, on ne la transforme pas en show.

---

### 11. Footer 🟢

#### A. Observation critique
`footer.tsx` (164 l.) public, plus le `PublicFooter` de la landing. Probablement propre, structuré (liens, légal, social). Catégorie à faible enjeu : un footer ne doit pas voler l'attention. Risque inverse ici : rien à signaler de mauvais, et c'est très bien ainsi.

#### B. Verdict design : **6 / 10**
Fonctionnel, sobre. Note neutre faute d'ambition (justifiée) sur cette zone.

#### C. Verdict motion : **4 / 10**
Statique — et c'est **le bon choix**.

#### D. Améliorations précises
- **Quoi** : hover discret sur les liens footer. **Pourquoi** : signaler la cliquabilité sans bruit. **Comment** : `color` transition 150ms `var(--text-tertiary) → var(--text-primary)`, soulignement qui se déploie (`background-size` 0→100% sur un linear-gradient underline). **Priorité** : 🟢
- **Quoi** : reveal du footer au scroll (une fois). **Pourquoi** : finir la page proprement. **Comment** : `data-reveal` fade-up unique via `useScrollReveal`. **Priorité** : 🟢

#### E. Ce qu'il NE faut PAS changer
**L'absence de gros motion.** Un footer animé est presque toujours une erreur (distrait du CTA final juste au-dessus). Garder sobre. Si rien d'autre n'est fait sur cette catégorie, c'est acceptable — c'est la seule où « ne rien faire » est défendable.

---

### 12. Emails transactionnels 🔴

#### A. Observation critique
Le vrai point noir. `planning-email.ts`, `weekly-brief-email.ts`, `conges-email.ts` : HTML table classique, header `#111827` (gris-noir, **pas** le dark Quartzbase ni le violet), corps en gris `#374151/#6b7280`, police système (`-apple-system…`), **aucune trace de Syne, aucun violet `#6C63FF`, aucun vert `#00D4AA`**. Un email Quartzbase ressemble aujourd'hui à un email de n'importe quel SaaS générique. C'est l'écart le plus violent avec la landing premium : le canal qui arrive *directement dans la boîte du gérant et de l'employé* ne porte pas la marque. (Le motion n'existe pas en email — normal — mais le « rythme visuel » demandé par le brief, lui, est plat.)

#### B. Verdict design : **4 / 10**
Lisibles et responsive (bon), mais zéro identité. Une occasion de marque gâchée à chaque planning publié.

#### C. Verdict motion : **1 / 10**
Sans objet (email), mais le rythme visuel — hiérarchie, accents, respirations — est inexistant. Note basse car le brief demande explicitement le « rythme visuel » des emails.

#### D. Améliorations précises
- **Quoi** : header de marque. **Pourquoi** : reconnaissance immédiate, confiance. **Comment avec Claude Design** : header `background: linear-gradient(135deg, #0d0b1f, #0a0a0f)` (le même que le hero), logo « Q » dans un carré violet `#6C63FF` radius 10px, titre en gros (Syne n'étant pas dispo en mail, fallback bold system mais letterspacing -0.02em pour évoquer Syne). **Priorité** : 🔴
- **Quoi** : accents couleur sémantiques. **Pourquoi** : faire respirer et hiérarchiser. **Comment** : bordures-gauche colorées sur les lignes de shift (comme les `ShiftCard` : 3px de la couleur du poste), badge « ✓ Conforme » vert `#00D4AA` en pied de planning (rappel de la promesse), CTA violet plein radius 10px. **Priorité** : 🔴
- **Quoi** : rythme vertical. **Pourquoi** : un email premium respire. **Comment** : sections séparées par 24–32px, fond `#f9fafb` autour de cards blanches radius 12px (déjà presque le cas), titres de section en `#9090a8` uppercase letterspacing 0.06em. **Priorité** : 🟡
- **Note** : ne PAS faire d'email en dark mode (compatibilité clients mail catastrophique). L'email reste clair — c'est la bonne exception au dark.

#### E. Ce qu'il NE faut PAS changer
La **structure en tables + styles inline** : c'est la seule façon fiable de faire du mail cross-client. Ne pas tenter de la « moderniser » en flexbox/grid (cassé sur Outlook). La responsivité actuelle est correcte. On réhabille dans les contraintes du mail, on ne réinvente pas le rendu.

---

### 13. Mobile / PWA 🟡

#### A. Observation critique
Vrai souci mobile : `manifest.ts`, `pwa-register`, `pwa-install-banner`, `push-subscribe`, bottom-nav, `mobile-planning.tsx` dédié, touch targets gérés (`globals.css` : `min-height: 44px` sur boutons/inputs <768px, `font-size: 16px` sur inputs pour éviter le zoom iOS, `env(safe-area-inset-*)` sur dialogs et `content-safe-pt`). C'est de l'attention mobile sérieuse. Manque : les **gestes** (swipe pour valider un congé / changer de semaine de planning), et une bottom-nav qui ne réagit qu'en couleur (pas de feedback tactile visuel type ripple au tap).

#### B. Verdict design : **6,5 / 10**
Touch targets et safe areas maîtrisés, planning mobile dédié. -3,5 : pas de langage gestuel, et l'adaptation reste « responsive » plus que « pensée mobile-first » sur certains écrans.

#### C. Verdict motion : **5,5 / 10**
Bottom-nav correcte mais peu de feedback tactile ; pas d'animation de geste.

#### D. Améliorations précises
- **Quoi** : navigation de semaine par swipe sur le planning mobile. **Pourquoi** : geste naturel, plus rapide que viser des flèches. **Comment** : détecter le swipe horizontal (touchstart/touchmove/touchend ou lib légère), transition de la grille `transform: translateX()` 250ms `cubic-bezier(0.16,1,0.3,1)`, semaine sortante/entrante en slide. Reduced-motion = saut instantané. **Priorité** : 🟡
- **Quoi** : feedback tactile au tap bottom-nav. **Pourquoi** : sensation d'app native. **Comment** : ripple court (réutiliser `badgeuse-ripple`) ou `scale(0.92)` 100ms à l'`:active` sur les items. **Priorité** : 🟢
- **Quoi** : swipe-to-action sur les listes (valider/refuser un congé). **Pourquoi** : ergonomie mobile manager. **Comment** : révéler des actions colorées (vert valider / rouge refuser) au swipe, `translateX` GPU. **Priorité** : 🟢

#### E. Ce qu'il NE faut PAS changer
**Les touch targets 44px, le `font-size:16px` des inputs, et les `safe-area-inset`.** C'est exactement ce qu'il faut pour la cible (employés sur téléphone, gérants peu tech). Réduire ces tailles pour « faire plus dense » serait une faute d'accessibilité tactile. Le `mobile-planning.tsx` dédié plutôt qu'un planning desktop rétréci est aussi le bon choix — à garder.

---

### 14. Cohérence transversale 🔴

#### A. Observation critique
Le produit ne forme pas encore *un* tout. Les fractures concrètes relevées dans le code :
1. **Trois noirs** : landing `#0a0a0f`, card auth `#0f0f16`, tokens dark `#0b0b12`/`#13131c`. À l'œil, des sauts de teinte entre landing, login et app.
2. **Deux thèmes, pas de doctrine** : landing/auth verrouillés dark, app dark-par-défaut-mais-clair-possible. Un utilisateur en clair vit une rupture totale entre l'auth (dark forcé) et son dashboard (clair).
3. **Deux+ systèmes de boutons** : `.auth-btn-primary` (translateY hover, ombre violette), `.btn-primary` (`scale(0.97)` active), et boutons inline du hero. Un bouton ne se comporte pas pareil selon l'écran.
4. **Élévations incohérentes** : cartes qui lèvent de -2px ici, qui changent juste de `brightness` là, qui ne bougent pas ailleurs.
5. **Rayons** : tokens `lg:12 md:8 sm:6`, mais cards dashboard en `14px` hardcodé, auth en `20px`, inputs auth `10px`. Pas de gamme stricte.
6. **Syne** : bien dosée (33 fichiers), réservée aux titres/chiffres — c'est sain — mais l'auth met « Se connecter » (un label de bouton) en Syne, ce qui est limite.

#### B. Verdict design : **5 / 10**
Chaque écran pris isolément est souvent bon ; mis bout à bout, le produit manque de doctrine partagée (couleur de surface, élévation, bouton).

#### C. Verdict motion : **5 / 10**
Le vocabulaire de mouvement existe (expo-out, stagger, count-up) mais n'est pas codifié ni appliqué uniformément. C'est précisément ce que doit régler la signature (§5).

#### D. Améliorations précises
- **Quoi** : unifier sur UN noir de surface. **Pourquoi** : supprimer les sauts de teinte landing→auth→app. **Comment** : aligner landing et card auth sur les tokens (`--bg-page`/`--bg-card`) plutôt que des hex hardcodés ; choisir une seule valeur de fond profond (ex. `#0a0a0f`) et la propager partout. **Priorité** : 🔴
- **Quoi** : un seul système de boutons. **Pourquoi** : cohérence du geste primaire. **Comment** : étendre `.btn-primary/.btn-secondary/.btn-danger` (déjà tokenisés, `scale(0.97)` active) à l'auth et au hero ; supprimer `.auth-btn-*` en doublon (ou les réduire à des alias). **Priorité** : 🟡
- **Quoi** : gamme de rayons stricte. **Pourquoi** : rythme visuel. **Comment** : remplacer les `14px`/`20px`/`10px` hardcodés par `lg/md/sm` (ou ajouter un `xl:16px` au token si besoin) et s'y tenir. **Priorité** : 🟡
- **Quoi** : trancher la doctrine de thème (voir §6 Vérité inconfortable). **Priorité** : 🔴

#### E. Ce qu'il NE faut PAS changer
Le **système de tokens CSS lui-même** (`--text-primary`, `--bg-card`, `--accent`…) et la convention du `CLAUDE.md` (inline `var()` OU classes Tailwind, pas de migration de masse). L'infrastructure est bonne ; le problème est de *s'y conformer* partout, pas de la remplacer. Et **le dosage de Syne** (titres/chiffres only) : ne pas l'étendre au corps de texte — ce serait fatigant et moins sérieux, exactement le piège que le brief signale.

---

## 4. Top 10 des améliorations à fort impact

Classées impact/effort décroissant.

| # | Quoi | Où | Pourquoi | Instruction Claude Design | Prio |
|---|------|-----|----------|---------------------------|------|
| 1 | **Réhabiller les 3 emails à la marque** | `lib/email/*` | Le canal direct vers gérant+employé n'a aucune identité. Impact énorme, effort moyen. | Header gradient `#0d0b1f→#0a0a0f` + logo Q violet, bordures-gauche poste sur les shifts, badge vert « ✓ Conforme », CTA violet. Tables inline, rester clair. | 🔴 |
| 2 | **Remplissage IA cellule-par-cellule dans le vrai planning** | `manager/planning` + `ai-plan-modal` | Faire vivre in-app la promesse vendue sur la landing. Cohérence narrative. | À réception du plan, révéler les shifts en stagger 60ms, scale 0.85→1 + opacity, ordre employé puis jour. Reduced-motion safe. | 🔴 |
| 3 | **DragOverlay élevé + cellules de drop réactives** | `shift-card.tsx`, grille | Le geste central du produit est plat. | `<DragOverlay>` scale 1.04 rotate -1.5° shadow ; cellule `isOver` → `accent-light` + inset ring accent 120ms. | 🔴 |
| 4 | **Feedback de sauvegarde sur les settings** | toutes les pages settings | Désintimider la cible non-tech, prouver « c'est enregistré ». | Bouton `Enregistrer→spinner→✓` (check-draw), flash bordure success 600ms. | 🔴 |
| 5 | **Unifier le langage de hover/élévation** | global | Le produit doit réagir pareil partout. | 3 utilitaires : `.hov-lift` (-2px+glow), `.hov-tint` (accent-light), `.press` (scale .97). Remplacer les hovers ad-hoc. | 🟡 |
| 6 | **Unifier le noir de surface (tokens partout)** | landing, auth, app | Supprimer les sauts de teinte entre écrans. | Aligner landing/auth sur `--bg-page/--bg-card`, un seul fond profond. | 🔴 |
| 7 | **Désencombrer le motion de l'auth** | `globals.css` auth | Sortir de l'effet « sapin de Noël », gagner en premium et en perf mobile. | Garder l'aurora, couper glowPulse, particules 5→2 et ralenties. | 🟡 |
| 8 | **Stagger + transitions de valeur sur les KPI** | dashboard | « Le tableau de bord se construit » plutôt qu'« apparaît ». | `useCountUp` avec delay croissant 0–360ms ; re-count old→new à chaque changement. | 🟡 |
| 9 | **Empty states illustrés + CTA** | listes (congés, échanges, marketplace) | Transformer les culs-de-sac en onboarding. | SVG léger tokenisé, fade+scale 400ms, CTA accent « Créer le premier… ». | 🟡 |
| 10 | **Indicateur actif glissant (sidebar + bottom-nav)** | navigation | Continuité, l'œil suit la position. | Pastille `::before` partagée en `translateY`, transition 250ms expo-out. | 🟡 |

---

## 5. La signature de mouvement de Quartzbase

**« L'assemblage » — les choses se mettent en place, elles n'apparaissent pas.**

Le produit a déjà, sans l'avoir nommée, sa patte : c'est le **remplissage de la `PlanningDemo`** — des éléments qui surgissent un à un, légèrement réduits puis posés à l'échelle (scale 0.85→1 + opacity), en cascade, dans un ordre qui a du sens. C'est la métaphore parfaite du produit : *un planning, c'est des pièces qu'on assemble jusqu'à ce que tout soit en place et conforme.* Il faut en faire la loi du mouvement, partout.

**La règle unique, à appliquer sur tout reveal du produit :**
- Propriétés animées : `transform` (translateY + scale) et `opacity` uniquement. Jamais `width/height/top/left`.
- Entrée : `opacity 0→1`, `translateY(12px)→0`, `scale(0.96)→1`.
- Durée : **400ms**. Easing : **`cubic-bezier(0.16, 1, 0.3, 1)`** (expo-out — déjà l'easing de l'auth card et du scroll-reveal, on standardise dessus).
- Stagger : **60–80ms** entre éléments frères, dans un ordre porteur de sens (employé puis jour, métrique par métrique, étape par étape).
- Pose / confirmation (au drop, à la sauvegarde, au succès) : léger overshoot `cubic-bezier(0.34, 1.56, 0.64, 1)` sur 200ms — la sensation « clic en place ».
- Hover d'élément interactif : `.hov-lift` = `translateY(-2px)` + ring/glow violet `rgba(108,99,255,0.2)`, 200ms ease. C'est déjà le hover des cartes dashboard — on le généralise.
- Toujours sous `@media (prefers-reduced-motion: no-preference)`, état final figé sinon.

**Pourquoi ça marche :** c'est reconnaissable (le « tout se pose à sa place »), c'est cohérent avec le message produit (ordre, conformité, sérénité), c'est sobre (un seul easing, une seule durée, un seul stagger → l'inverse du sapin de Noël), et c'est déjà à moitié implémenté (auth cascade, dashboard stagger, planning-demo, pres-reveal) — il s'agit surtout de **codifier et propager**, pas d'inventer. Concrètement : 3 classes utilitaires (`.qz-reveal`, `.qz-pose`, `.hov-lift`) dans `globals.css`, appliquées partout via Claude Design.

---

## 6. La vérité inconfortable

Ce qu'un directeur artistique payé cher dirait en privé, et que le produit doit s'entendre dire :

**Quartzbase n'a pas décidé ce qu'il est, et ça se voit dans le code.** Vous avez construit une landing dark premium, magnifique, qui promet une expérience signature — puis vous avez construit, dans la même app, **un thème clair complet** (`:root` « Dhonu-style »). Ce thème clair n'est pas un accident : c'est l'aveu, en CSS, que vous n'êtes pas sûr que le dark premium convienne à votre vraie cible — le gérant de boulangerie de 52 ans qui n'a jamais utilisé Notion. Et vous avez raison d'en douter : pour cette cible, sur un téléphone en plein soleil derrière le comptoir, **le dark n'est pas premium, il est illisible**. Vos concurrents (Skello, Combo, Snapshift) sont clairs et colorés pour cette raison précise, pas par manque de goût.

Le résultat, c'est un grand écart non résolu : la landing vend du dark immersif à des gens qui, une fois dans l'app, devraient peut-être tout basculer en clair. Vous séduisez avec une esthétique, vous opérez avec une autre. La `PlanningDemo` et le hero sont sur-designés *par rapport à la vie réelle de l'app* — des settings plats, des emails génériques, un drag sans âme. L'utilisateur ressent une promesse au login qui n'est pas tenue page après page.

**La décision à prendre n'est pas « plus d'animations ».** C'est : *pour qui est ce produit, et donc quel est son thème par défaut ?* Deux chemins honnêtes :

- **Option A — Assumer le dark.** Vous ciblez le restaurateur/gérant moderne, branché, qui veut un outil qui ne ressemble pas à un logiciel des impôts. Alors le dark est votre différenciateur — mais il faut le tenir *partout, sans thème clair de secours*, et hisser settings/emails/planning au niveau de la landing. Le clair devient une simple option d'accessibilité, pas un demi-aveu.
- **Option B — Basculer l'app en clair par défaut, garder le dark pour la vitrine.** Landing dark premium (la séduction), app claire et lisible (l'usage quotidien réel pour une cible non-tech sur mobile). C'est sans doute le choix le plus lucide commercialement — mais alors il faut *designer la transition* (un sas, un onboarding qui explique le passage), sinon la rupture login-dark → app-claire fait amateur.

Ce qui n'est pas tenable, c'est le statu quo : dark verrouillé sur la vitrine, dark-mais-pas-vraiment dans l'app, trois noirs différents, deux systèmes de boutons. **Le plus gros chantier de Quartzbase n'est pas une animation manquante — c'est une décision d'identité non prise.** Le motion, lui, est déjà à un bon niveau ; il n'attend qu'une doctrine à servir.

---

*Audit réalisé sur le code de production Quartzbase (Next.js 14 / Tailwind / tokens CSS) — 27 juin 2026. Toutes les recommandations sont réalisables en itération via Claude Design.*
