-- ============================================================
-- 087 — Garde profiles étendue à INSERT et DELETE (B2)
-- ============================================================
-- FAILLE CORRIGÉE (bloquante, audit du 2026-07-25) :
-- La garde livrée en 085 est `BEFORE UPDATE` uniquement. Les policies
-- profiles_insert / profiles_delete (061:200 et 061:205) autorisent toutes deux
-- `id = auth.uid()`, et le rôle `authenticated` détient bien les GRANT
-- correspondants. Un employé pouvait donc, en deux requêtes REST :
--
--   await supabase.from('profiles').delete().eq('id', monId)
--   await supabase.from('profiles').insert({ id: monId, role: 'manager', ... })
--
-- et devenir manager de son propre tenant — contournant intégralement 085.
--
-- CORRECTIF : garde sur INSERT, UPDATE et DELETE, doublée du retrait des
-- privilèges et des policies correspondantes (défense en profondeur).
--
-- Vérifié avant écriture : AUCUN code applicatif n'insère ni ne supprime
-- `profiles` via le client utilisateur. La seule suppression d'employé
-- (app/api/employees/[id]/route.ts:83) passe par
-- `supabaseAdmin.auth.admin.deleteUser()`, donc par une cascade FK depuis
-- auth.users exécutée en tant que `supabase_auth_admin` : la garde ne s'y
-- déclenche pas. CE POINT DOIT RESTER COUVERT PAR UN TEST DE NON-RÉGRESSION.
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  -- Hors session PostgREST, on ne bloque rien :
  --   - service_role          : set-role, invitations, bascule d'établissement
  --   - propriétaire de la fonction : handle_new_user (SECURITY DEFINER)
  --   - supabase_auth_admin   : cascade FK depuis auth.users (suppression de compte)
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Création de profil non autorisée'
      USING ERRCODE = 'insufficient_privilege';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Suppression de profil non autorisée'
      USING ERRCODE = 'insufficient_privilege';
  ELSIF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.establishment_id IS DISTINCT FROM OLD.establishment_id THEN
    RAISE EXCEPTION 'Modification de role/establishment_id non autorisée'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profiles_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profiles_privileged_columns
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profiles_privileged_columns();

-- Défense en profondeur : la RLS n'ouvre plus ces chemins du tout.
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

-- Ordre imposé (cf. 084, inopérante pour l'avoir ignoré) : on révoque à PUBLIC,
-- pas seulement aux rôles nommés — sans quoi le privilège reste hérité.
REVOKE INSERT, DELETE, TRUNCATE ON public.profiles FROM PUBLIC, anon, authenticated;
