# Architecture Map — où est quoi

Version condensée ; le détail vit dans `docs/ARCHITECTURE.md`.

| Domaine | Emplacement |
|---|---|
| Pages manager / employé | `app/(dashboard)/manager/*`, `app/(dashboard)/employee/*` |
| Landing + pages publiques | `app/page.tsx`, `app/(public)/*`, `components/public/*` |
| API métier (~80 routes) | `app/api/*` (crons : `app/api/cron/*`, publique : `app/api/v1/*`) |
| Auth & rôles | `middleware.ts` (routage), `lib/api-auth.ts` (requireManager/Employee), `app/api/auth/set-role` |
| Clients Supabase | `lib/supabase/{client,server,middleware,admin}.ts` |
| Conformité (17 règles) | `lib/compliance/rules.ts` (+ `RULE_COUNT` exporté pour le marketing) |
| Génération planning | `lib/planning/{solver,repair,plan-tools}.ts`, IA : `app/api/ai/plan` |
| Facturation / plans | `lib/stripe.ts`, `lib/subscription.ts` (`TRIAL_DAYS`), `lib/plan-guard.ts`, webhook : `app/api/stripe/webhook` |
| Parrainage | `lib/referral.ts` (−15 %/filleul, max −30 %) |
| Notifications | `lib/notifications/*`, push : `lib/push.ts`, emails : `lib/email/*`, SMS : `lib/sms.ts` (no-op sans Twilio) |
| Intégrations | `lib/integrations/{webhook,slack,ical}.ts`, tokens API : `lib/api-token.ts` |
| Back-office opérateur | `app/admin/*` (accès : `OPERATOR_EMAILS`, `lib/operator.ts`) |
| Migrations SQL | `supabase/migrations/` — état prod : `docs/migrations-state.md` |
| Types domaine | `types/index.ts` |
| Constantes à ne jamais dupliquer | `TRIAL_DAYS`, `RULE_COUNT`, `REFERRAL_MAX_DISCOUNT`, `PLAN_META`, `PLAN_EMPLOYEE_LIMITS` |
