# Quartzbase — cession d'actif

**SaaS de planning et de conformité au droit du travail pour la restauration et le commerce.
Produit fini, en production, audité. Cédé pour cause d'indisponibilité du fondateur.**

Contact : Maxence Burte — maxence.burte@gmail.com — `quartzbase.fr`

---

## À dire tout de suite

**Quartzbase n'a aucun client et ne génère aucun revenu.** Le produit a été construit, mis en
production et audité, mais jamais commercialisé : le fondateur entre en gendarmerie en
septembre 2026 et n'a pas conduit de phase de vente.

Ce qui est proposé ici n'est donc pas un business avec des revenus à reprendre. C'est un
**actif technique fini** : 57 000 lignes de code auditées, 262 tests verts, et un moteur de
conformité au droit du travail français que personne n'a envie de réécrire.

Le reste de ce document est vérifiable ligne à ligne dans le dépôt.

---

## Les trois chiffres

| | |
|---|---|
| **17** | règles du Code du travail français implémentées — **et les 17 couvertes par des tests unitaires** |
| **262** | tests automatisés, tous verts (26 fichiers), dont l'intégralité des circuits de facturation Stripe |
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

**Marque** — domaine `quartzbase.fr`, identité graphique complète, landing et 6 pages SEO
réglementaires (`/code-du-travail`, `/conformite`, `/securite`, `/guide-demarrage`…).

---

## Points de transparence

Ce qu'un audit trouverait de toute façon. Autant le dire ici.

- **Aucune traction.** 0 client, 0 revenu, 0 trafic organique établi. La base de production
  ne contient que des données de démonstration.
- **Aucune donnée personnelle à transférer.** Corollaire du point précédent, et c'est une
  bonne nouvelle : pas de reprise de traitement RGPD, pas d'information des personnes
  concernées, pas de responsabilité héritée sur des données existantes.
- **Le produit n'a pas été confronté à des utilisateurs réels.** L'adoption côté employé,
  en particulier, n'est pas validée sur le terrain.
- **Le dépôt porte deux noms** : `Nexus` en interne, `Quartzbase` en façade. Le résidu est
  limité et inventorié (quelques clés de stockage local, en-têtes de webhook — déjà émis en
  double `X-Nexus-Event` / `X-Quartzbase-Event` —, identifiants iCal).
- **Le fondateur est indisponible à partir de septembre 2026.** Un accompagnement à la reprise
  est possible avant cette date, pas après. Un runbook d'exploitation complet est fourni pour
  que la reprise ne dépende pas de lui.

---

## Ce qui est fourni à la signature

Dépôt Git complet et son historique · base de données et migrations · runbook d'exploitation
(déploiement, secrets, tâches planifiées, restauration de sauvegarde) · audit technique
indépendant daté du 21/07/2026 · document d'architecture · domaine, marque et identité ·
transfert ou recréation documentée des comptes tiers.

---

## Prix

Ouvert. La discussion est libre — le fondateur n'a pas de prix de réserve public et
privilégie une reprise rapide et propre à une négociation longue.

---

*Chiffres relevés le 28 juillet 2026 dans le dépôt et la base de production. Suite de tests
relancée le jour même : 262 tests, 26 fichiers, 0 échec.*
