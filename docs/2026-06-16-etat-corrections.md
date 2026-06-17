# État des corrections issues de l'audit — 2026-06-16

Document de référence **durable** (tracké git). Récapitule tout ce qui a été fait
suite à `docs/2026-06-16-audit-complet-quartzbase.md` + `docs/2026-06-16-plan-correction.md`,
et ce qui reste.

Tout le « fait » est **commité, poussé** (branche `claude/tender-faraday-it9gnr`),
**typecheck OK + build prod vert**. Migrations « prod » = **appliquées et re-vérifiées**
sur le projet Supabase `euvvibqzrhbleztqfdbu`.

## ✅ Fait

### Vague 0 (critique)
- **T1** migrations 034→055 certifiées en prod (042/044/045/048/049/050 déjà appliquées) ; `migrations-state.md` à jour.
- **T2** fuite inter-tenant `shift_exchanges` **fermée en prod** (migration 053 : `establishment_id` + RLS scopées + trigger).
- **T3** cadeau filleul = **1 mois exact** (plus de double essai ~60 j) — `checkout/route.ts`.
- **B1** essai affiché = `TRIAL_DAYS` (30 j) cohérent — `settings/billing/page.tsx`.
- **R1** non-responsabilité conformité : clause CGU (art. 9, déjà présente) + **log d'audit de l'override**.
- **R2** trajectoire actée : continuer le dev, point de contrôle fin juillet (`docs/2026-06-16-decision-trajectoire.md`).

### Vagues 1-2-3
- **B2/A3** churn parrain géré (efface `stripe_subscription_id` à la résiliation).
- **A2** anti-abus parrainage (migration 054) : filleuls créés en rafale signalés et exclus de la remise.
- **E1** pointage : clôture forcée des oublis (jours précédents) + `needs_review`.
- **E2** rappel J-1 : cron `shift-reminder` (notif + push du service du lendemain).
- **M2** KPI « Heures planifiées » au dashboard manager.
- **M4** cron `weekly-summary-employee` retiré (route conservée).
- **N1** titre push `Quartzbase` · **N2** en-tête webhook `X-Quartzbase-Event` (non cassant).
- **TS1** tests parrainage · **TS2** garde-fou CI anti-« Nexus ».
- **Perf** migration 055 : 17 index de clés étrangères manquants (0 restant).

### Bloc 2 (décisions produit)
- **L1** hero landing recentré conformité (« protège des prud'hommes »).
- **M3** navigation des paramètres : 12 liens à plat → **5 catégories**.
- **M1** onboarding : « prochaine étape » accessible en 1 tap même replié.
- **E3 (version sûre)** invitation employé envoyée **aussi par SMS** (le lien est déjà un magic link Supabase) — onboarding mobile en 1 tap, sans toucher à l'auth. No-op si Twilio non configuré.
- **L4 (partiel)** badge « Hébergé en UE · RGPD » ajouté à la barre de réassurance (véridique).

### Déjà conformes (vérifié, rien à faire)
- Landing : CTA « 30 jours sans CB » (L2), comparatif sans nommer Skello (L5), copy parrainage déjà −30 %.
- « Nexus » visibles déjà nettoyés (emails, etc.).

## ⏳ Reste à faire

**1 clic (toi)** — activer la protection des mots de passe compromis (Supabase → Auth).

**N4 — thème clair par défaut : NON fait (casserait l'UI).** L'app est codée dark-first :
`:root` déjà sombre, aucune palette claire, **72 couleurs en dur dans 23 fichiers**. Une bascule
laisserait ces zones noires sur fond clair. Plan propre (~½-1 j, à valider en direct) :
1. palette claire dans `:root`, palette sombre actuelle sous `.dark` ;
2. migrer les 72 couleurs en dur → variables CSS (le gros du travail) ;
3. garder la landing en dark (marque), ne passer que l'app authentifiée en clair ;
4. sélecteur de thème + persistance ; 5. repasser WCAG sur la palette claire.

**Technique recommandé, risqué → à froid sur branche Supabase de test** : passe RLS perf
(`auth_rls_initplan` ×41 + `multiple_permissive_policies` ×149) ; nettoyage des index inutilisés
(16) et doublons (2).

**Optionnel (plus tard)** : **E3** login 100 % passwordless par SMS (au-delà de l'invitation
déjà couverte) — chantier auth à part, seulement si tu le juges utile.

**Business / contenu (pas du code)** : vidéo démo (L3) ; garantie remboursement (décision
commerciale) ; support formalisé (R3) ; registre RGPD (R4) ; plan de sauvegarde Supabase (R5).
