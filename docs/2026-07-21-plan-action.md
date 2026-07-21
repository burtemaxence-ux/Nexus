# PLAN D'ACTION — QUARTZBASE

**Date :** 21 juillet 2026
**Source :** `docs/2026-07-21-audit-complet-quartzbase.md` (133/180)
**Horizon :** 6 semaines — du 21 juillet à fin août 2026 (butée dure : entrée en gendarmerie ~septembre)
**Principe directeur (garde-fou de juin, inchangé) :** chaque heure investie doit convertir ou
retenir un client, ou augmenter la valeur transmissible de l'actif. Tout le reste est interdit.

---

## 0. LA DÉCISION QUI COMMANDE TOUT (à prendre cette semaine)

Le point de contrôle écrit dans `docs/2026-06-16-decision-trajectoire.md` est arrivé à échéance.
Compter les clients payants actifs et suivre l'arbre :

```
Clients payants actifs aujourd'hui ?
│
├── ≥ 3  ──► PISTE A — « Traction » : exécuter S1→S6 ci-dessous en entier.
│            Objectif fin août : 8-10 clients, rétention 100 %, 2 témoignages.
│
├── 1-2 ──► PISTE A' — « Preuve d'abord » : S1 identique, puis 100 % du temps
│            sur la conversion (S4-S6 GTM), le code se limite à S2-S3 réduit
│            (KPI € uniquement). Re-décision au 15 août.
│
└── 0   ──► PISTE B — « Transmission » : S1 identique (protège l'actif), puis
             basculer S2→S6 sur le paquet de cession (§5) : runbooks, doc de
             reprise, dossier acqui-hire. Ne PAS signer de nouveau client
             qu'on ne pourra pas supporter après septembre.
```

**Critère de succès du §0 :** une décision écrite et datée, ajoutée en tête de
`docs/2026-06-16-decision-trajectoire.md`, avant le 27 juillet.

---

## 1. SEMAINE 1 (22-27 juillet) — P0 : risque juridique & revenu, coût quasi nul

Commune à toutes les pistes. Total : **~2 h de travail + 1 réunion**.

| ID | Action | Comment | Effort | Qui | Critère de succès |
|----|--------|---------|--------|-----|-------------------|
| P0-1 | ~~Essai « 30 jours » partout~~ | metadata SEO/OG, hero, FAQ, CTA pages publiques | — | ✅ fait le 21/07 | `grep "14 jours"` marketing = 0 ✅ |
| P0-2 | **Bandeau clients fictifs** | Supprimer « O'Tacos Centre » immédiatement ; remplacer le bandeau par une version « secteurs » : « Conçu pour les boulangeries, brasseries, cafés et commerces de proximité » (aucun nom d'établissement tant qu'il n'y a pas d'accord écrit d'un vrai client) | 30 min | Maxence (décision) + 1 edit | plus aucun nom d'établissement fictif ou réel sans accord sur la landing |
| P0-3 | **Mots de passe compromis** | Supabase Dashboard → Authentication → activer « Leaked password protection » | 1 clic | Maxence | advisor sécurité HaveIBeenPwned disparu |
| P0-4 | **Relances d'impayés** | Stripe Dashboard → Settings → Billing → activer Smart Retries + emails d'échec de paiement + page de mise à jour de carte | 15 min | Maxence | réglage actif ; chaque `past_due` déclenche des relances automatiques |
| P0-5 | **Brief batch en prod** | Lundi 28/07 matin : logs Vercel de `weekly-brief-submit` (6h30) et `weekly-brief-manager` (7h00) ; vérifier `from_batch > 0` et réception de l'email | 5 min | Maxence | brief reçu + `from_batch ≥ 1` dans la réponse du cron |
| P0-6 | **Décision de trajectoire** | §0 ci-dessus | 1 réunion | Maxence | décision écrite et datée |

---

## 2. SEMAINES 2-3 (28 juillet - 10 août) — P1 code : convertir et retenir

Piste A/A' seulement (piste B : uniquement P1-2 et P1-3, puis passer au §5).
Total : **~2,5 jours de dev**.

| ID | Action | Détail d'implémentation | Effort | Critère de succès |
|----|--------|-------------------------|--------|-------------------|
| P1-1 | **KPI « ce planning me coûte X € »** | Home manager : somme (heures planifiées × `postes.hourly_cost`) de la semaine affichée en € à côté du KPI heures existant ; delta vs semaine précédente. Les données existent déjà — aucun schéma à toucher | ½ j | le € visible sur le home ; un gérant test comprend le chiffre sans explication |
| P1-2 | **CSP en mode bloquant** | Revoir les rapports `/api/csp-report` reçus depuis juin (via Sentry) ; si pas de violation légitime, renommer le header `Content-Security-Policy-Report-Only` → `Content-Security-Policy` dans `next.config.mjs` | 1 h | header enforcé en prod, zéro casse (vérifier checkout Stripe + realtime Supabase) |
| P1-3 | **Révoquer l'EXECUTE anon** | Migration : `REVOKE EXECUTE ON FUNCTION public.is_manager(), public.current_establishment_id() FROM anon;` (les policies RLS continuent de fonctionner — elles s'exécutent avec le rôle de la requête authentifiée) | 30 min | advisor `anon_security_definer_function_executable` = 0 ; tests + parcours login OK |
| P1-4 | **Smoke E2E Playwright** | 1 seul test : login (compte seed) → créer un shift → publier la semaine → vérifier l'affichage employé. Brancher en CI après le build. Utiliser `scripts/seed-demo.ts` existant | ½ j | le smoke tourne en CI sur chaque PR ; rouge si le parcours cœur casse |
| P1-5 | **Décision typo : Syne ou pas** | Choix binaire : (a) garder Syne comme signature titres et retirer Manrope OU Inter ; (b) tout basculer sur Manrope et retirer Syne (24 fichiers, remplacement mécanique de `var(--font-syne)`). Objectif : passer de 4 familles à 3 max | 1 h après décision | ≤ 3 familles chargées dans `app/layout.tsx` |
| P1-6 | **A/B Sonnet 5 sur la génération de planning** | 3 générations réelles côte à côte (même établissement, mêmes contraintes) `claude-sonnet-4-6` vs `claude-sonnet-5` ; comparer respect des contraintes légales, trous de planning, coût tokens. Changer le modèle uniquement si gain net | 1 h | tableau comparatif 3 lignes ; décision notée dans le code (`app/api/ai/plan/route.ts`) |
| P1-7 | **Restauration de backup testée** | Restaurer le backup Supabase de la veille sur un projet jetable ; chronométrer ; écrire la procédure pas-à-pas dans `docs/deployment.md` § « Disaster recovery » | 1 h | procédure écrite + testée avec temps de restauration mesuré |

---

## 3. SEMAINES 2-6 en parallèle — GTM & preuve (contenu, pas du code)

Piste A/A'. C'est **la** priorité réelle : l'audit conclut que le mur n'est plus technique.
Reprend le plan GTM de juin (P8) non exécuté, resserré :

| ID | Action | Détail | Échéance | Critère de succès |
|----|--------|--------|----------|-------------------|
| G-1 | **Client #1 signé et filmé** | La boulangerie/le resto du réseau proche : installation faite PAR Maxence, plannings repris, puis vidéo témoignage 30-60 s (téléphone, en tablier, un chiffre : « je faisais mon planning en 2 h, maintenant 20 min ») | 3 août | 1 client actif + 1 vidéo exploitable |
| G-2 | **Vidéo démo 60 s** | Screencast : « créer un planning conforme en 2 minutes » — hero de la landing. Loom suffit | 10 août | vidéo sur la landing, au-dessus de la ligne de flottaison |
| G-3 | **Logos réels** | Dès 3 clients : remplacer le bandeau « secteurs » (P0-2) par les vrais noms/logos, avec accord écrit (un SMS archivé suffit) | dès 3 clients | preuve sociale véridique |
| G-4 | **Canal expert-comptable** | La page `/devenir-partenaire` existe déjà : l'exploiter. 5 cabinets CHR contactés (email du plan de juin : mini-audit conformité gratuit offert à leurs clients, 20-25 % de commission récurrente) | 17 août | 5 contacts, ≥ 1 RDV |
| G-5 | **Porte-à-porte local** | 10 établissements à moins de 5 km, passage à 15 h, démo sur téléphone 5 min, offre « installé pour vous, 3 mois offerts contre témoignage » | en continu | 5 démos → 3 installés |

**Jauge hebdo (à noter chaque dimanche) :** clients payants / comptes en essai / démos faites /
témoignages capturés. Quatre chiffres, pas plus.

---

## 4. BACKLOG P2 — uniquement si ≥ 5-10 clients payants

Ne rien commencer ici tant que la jauge n'y est pas. Ordre de priorité :

1. **Export paie CSV** (format Silae, puis Cegid) — première demande prévisible des gérants
   équipés d'un comptable ; grosse valeur de rétention.
2. **Upsell annuel** sur la page billing au moment de l'expiration de l'essai (−2 mois affiché).
3. **Support formalisé** (R3) : canal unique annoncé (WhatsApp Business ou email), délais
   publiés (« réponse sous 24 h ouvrées »), 10 questions/réponses dans `/manager/help`.
4. **Registre RGPD** (R4) : registre de traitement une page, durées de conservation, base légale.
5. **AA strict 4,5:1** sur les micro-textes des badges du thème clair, si retours lisibilité.
6. **Packager `lib/compliance`** : README dédié, liste des règles + articles de loi, tests —
   c'est l'actif n°1 en cas de cession.

---

## 5. PISTE B — PAQUET DE TRANSMISSION (si décision §0 = 0-1 client)

Remplace les §2-§4. Objectif : maximiser la valeur de l'actif et ne laisser personne sans
support en septembre. **~4 jours de travail au total.**

| ID | Action | Effort | Critère de succès |
|----|--------|--------|-------------------|
| T-1 | Runbook de reprise complet : déploiement, secrets (où, comment les faire tourner), crons, migrations, restauration backup (P1-7), comptes tiers (Supabase/Vercel/Stripe/Resend/Anthropic/Twilio) | 1 j | un dev senior peut reprendre l'exploitation sans appeler Maxence |
| T-2 | Dossier de cession : l'audit du 21/07 + ARCHITECTURE.md + chiffres réels (MRR, comptes, usage) + démo vidéo | ½ j | dossier PDF envoyable à un acquéreur |
| T-3 | Liste d'acquéreurs cibles (juin, P7) : éditeurs caisse/paie CHR (Zelty, Tiller, L'Addition, Combo), cabinets comptables CHR, acqui-hire | ½ j | 10 contacts identifiés, 3 approchés |
| T-4 | Clients existants : email de transparence sur la continuité (modèle de support ou transfert) | 2 h | 0 client découvrant la situation après coup |
| T-5 | Gel des features : seules les corrections de bugs passent | — | discipline tenue |

---

## 6. À NE PAS FAIRE (rappel contractuel avec toi-même)

- ❌ Migration Next 15, refonte branding/nom, migration styles inline → Tailwind.
- ❌ Nouvelles features spéculatives (multi-langue, app native, marketplace publique…).
- ❌ Supprimer les index « unused » (index de FK — documenté migration 080).
- ❌ Coder quoi que ce soit côté employé avant feedback de vrais employés.
- ❌ Toute tâche qui ne rentre ni dans ce plan ni dans un bug signalé par un client.

---

## 7. TABLEAU DE SUIVI (remplir chaque dimanche soir, 5 minutes)

| Semaine | Clients payants | Essais actifs | Démos | Témoignages | P0-P1 restants | Note |
|---------|:---:|:---:|:---:|:---:|:---:|------|
| 27/07 | | | | | /10 | |
| 03/08 | | | | | | |
| 10/08 | | | | | | |
| 17/08 | | | | | | |
| 24/08 | | | | | | |
| 31/08 | | | | | | bilan avant septembre |

**Le plan a réussi si, au 31 août :** (piste A) ≥ 8 clients payants, 2 témoignages vidéo,
0 item P0/P1 ouvert — ou (piste B) paquet de transmission complet et ≥ 1 discussion
d'acquisition engagée. Dans les deux cas : aucun client laissé sans réponse en septembre.

---

*Plan dérivé de l'audit du 21/07/2026. À mettre à jour en cochant, pas en réécrivant — le
prochain audit comparera ce qui était promis à ce qui a été fait.*
