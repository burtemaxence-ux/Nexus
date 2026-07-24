-- ============================================================
-- 084 — Empêcher l'auto-élévation de rôle (faille de privilège)
-- ============================================================
-- La policy `profiles_update` (061) autorise un utilisateur à modifier SA
-- PROPRE ligne :
--   USING/CHECK (id = auth.uid() OR (is_manager() AND establishment_id = current_establishment_id()))
-- La RLS de PostgreSQL n'est pas colonne-level : rien n'empêchait donc un
-- employé de faire, depuis le navigateur,
--   supabase.from('profiles').update({ role: 'manager' }).eq('id', <son id>)
-- et d'obtenir un accès manager — is_manager() passe à vrai en RLS (accès à
-- toutes les données de l'établissement) et requireManager() côté API accorde
-- les routes réservées aux managers (invitations, exports RGPD, suppression
-- d'employés…). Le middleware (qui lit user_metadata.role) ne protège que le
-- routing UI, pas ces deux frontières réelles.
--
-- Correctif : révoquer le droit d'UPDATE sur les colonnes sensibles pour le
-- rôle `authenticated`. Aucun flux applicatif authentifié ne les modifie —
-- set-role et les routes d'établissements/membres passent par le service-role,
-- qui n'est pas soumis à ces privilèges. La colonne active_establishment_id
-- (bascule d'établissement) reste modifiable par l'utilisateur.
REVOKE UPDATE (role)             ON public.profiles FROM authenticated;
REVOKE UPDATE (establishment_id) ON public.profiles FROM authenticated;

-- Défense en profondeur : anon n'a de toute façon aucune session, mais on
-- ferme la porte explicitement.
REVOKE UPDATE (role)             ON public.profiles FROM anon;
REVOKE UPDATE (establishment_id) ON public.profiles FROM anon;
