-- ============================================================
-- 085 — Garde des colonnes privilégiées de profiles (role, establishment_id)
-- ============================================================
-- La migration 084 (REVOKE UPDATE (role) ...) est inopérante : un REVOKE au
-- niveau colonne ne peut pas soustraire d'un GRANT UPDATE au niveau table, que
-- `authenticated` possède sur profiles. has_column_privilege() renvoyait donc
-- toujours true. On passe par un trigger BEFORE UPDATE, robuste et indépendant
-- de la liste des colonnes.
--
-- Objectif : empêcher un utilisateur de s'auto-attribuer role='manager' (ou de
-- se déplacer d'établissement) via un appel Supabase direct. Le service-role
-- (set-role, invitations, bascule d'établissement) reste autorisé : il exécute
-- en tant que `service_role`, pas `authenticated`.
CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND (NEW.role IS DISTINCT FROM OLD.role
          OR NEW.establishment_id IS DISTINCT FROM OLD.establishment_id) THEN
    RAISE EXCEPTION 'Modification de role/establishment_id non autorisée'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profiles_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profiles_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profiles_privileged_columns();
