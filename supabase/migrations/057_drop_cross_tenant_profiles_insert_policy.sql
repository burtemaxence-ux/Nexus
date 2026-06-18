-- 057 — Ferme une fuite d'ÉCRITURE inter-tenant sur profiles.
-- La policy INSERT "Managers can insert profiles" avait pour with_check uniquement
-- « le caller est manager » (EXISTS profiles role=manager), SANS scope
-- establishment_id. Les policies permissives se cumulant par OR, un manager pouvait
-- insérer un profil rattaché à N'IMPORTE QUEL établissement.
--
-- Redondante : les inserts légitimes ne passent jamais par cette policy —
--   * invitation employé : service role (supabaseAdmin) + trigger DB (RLS bypass) ;
--   * inserts manager via client user : couverts par profiles_manager_establishment
--     (FOR ALL, USING/with_check = is_manager() AND establishment_id = current_establishment_id()) ;
--   * self : profiles_self (id = auth.uid()).
-- Sa suppression ne casse aucun flux et ne cache aucune donnée (with_check INSERT).
-- Appliqué en prod le 2026-06-18.

drop policy if exists "Managers can insert profiles" on public.profiles;
