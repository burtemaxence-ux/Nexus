-- ============================================================
-- 089 — Réconciliation dépôt ↔ production (audit C4)
-- ============================================================
-- MIGRATION DE RATTRAPAGE. Objets présents en PRODUCTION mais qu'aucune
-- migration du dépôt ne créait : un `db push` sur un projet vierge produisait
-- donc un schéma différent de la prod, rendant tout audit RLS non reproductible.
--
-- Chaque définition est relevée telle quelle en prod (information_schema,
-- pg_indexes, pg_get_triggerdef). Rien n'est corrigé ici : on documente.
--
-- Écarts INVERSES (le dépôt crée, la prod n'a pas) volontairement NON traités
-- ici — les supprimer graverait des défauts dans le schéma de référence :
--   • profiles.invited_by (+ FK)  → la prod ne l'a pas, mais l'application
--     l'écrit dans /api/employees/invite : l'UPDATE d'enrichissement échoue
--     donc EN ENTIER et sans erreur remontée. Défaut actif, à corriger.
--   • subscriptions_stripe_customer_id_key / _stripe_subscription_id_key
--     (UNIQUE) → absentes en prod : rien n'y empêche deux lignes de partager
--     le même stripe_subscription_id. À arbitrer avec l'idempotence webhook.
--   • idx_availabilities_employee → simple index de perf jamais créé en prod.
-- Voir docs/migrations-state.md pour le détail.

-- ── profiles.is_active ─────────────────────────────────────────────────────
-- Lue par les crons (compliance-check, weekly-summary-employee) et les briefs.
-- Sans elle, un environnement neuf bâti depuis le dépôt plante sur ces chemins.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS profiles_is_active_idx
  ON public.profiles USING btree (is_active)
  WHERE (role = 'employee'::text);

-- ── subscriptions : unicité par établissement ──────────────────────────────
-- La prod porte UNIQUE (establishment_id) — un abonnement par établissement.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND conname  = 'subscriptions_establishment_id_key'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_establishment_id_key UNIQUE (establishment_id);
  END IF;
END
$$;

-- ── subscriptions.updated_at ───────────────────────────────────────────────
-- set_updated_at() est déjà définie (030 / 046_harden_functions_and_webhook_logs).
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
