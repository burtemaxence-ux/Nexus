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

**N4 — thème clair par défaut : ✅ FAIT (2026-07-21).** Les étapes 1-2-4 (palette claire
`:root`, dark sous `.dark`, toggle + persistance `dp-theme`) avaient été livrées entre-temps ;
le 2026-07-21 : bascule du **défaut** en clair dans l'app authentifiée (landing/auth restent
dark) + passe WCAG sur les tokens statut clairs (succès #16A34A, warning #D97706,
danger #DC2626 — ≥3:1 ; l'AA strict 4.5:1 pour les micro-textes 11px reste un choix design
ouvert). Préférences déjà stockées préservées.

**Passe RLS perf : ✅ FAIT.** 059 (initplan ×41) et 061 (policies permissives ×149) appliquées
en prod en juin ; le 2026-07-21, migration 080 : les 4 initplan restants (tables créées après
la passe : `home_task_completions`, `deletion_requests`) + index FK `requested_by`.
Advisors performance : 0 WARN restant. Index « unused » volontairement conservés (ce sont des
index de FK — les supprimer réintroduirait `unindexed_foreign_keys`) ; doublons déjà purgés (062).

**Optionnel (plus tard)** : **E3** login 100 % passwordless par SMS (au-delà de l'invitation
déjà couverte) — chantier auth à part, seulement si tu le juges utile.

**Business / contenu (pas du code)** : vidéo démo (L3) ; garantie remboursement (décision
commerciale) ; support formalisé (R3) ; registre RGPD (R4) ; plan de sauvegarde Supabase (R5).
