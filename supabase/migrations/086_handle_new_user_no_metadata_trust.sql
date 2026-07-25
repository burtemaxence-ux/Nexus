-- ============================================================
-- 086 — L'inscription ne fait plus confiance aux métadonnées client (B1)
-- ============================================================
-- FAILLE CORRIGÉE (bloquante, audit du 2026-07-25) :
-- `handle_new_user` lisait le rôle ET l'établissement dans
-- `NEW.raw_user_meta_data`, c'est-à-dire dans un champ intégralement écrit par
-- le navigateur via `supabase.auth.signUp({ options: { data } })` — la page
-- d'inscription y place elle-même `role: 'manager'`.
--
-- Un salarié pouvait donc :
--   1. lire son propre `profiles.establishment_id` (autorisé par profiles_select),
--   2. s'inscrire avec { role: 'manager', establishment_id: '<uuid employeur>' },
--   3. obtenir is_manager() = true et current_establishment_id() = tenant employeur,
-- soit un accès complet aux salaires, contrats, documents et pointages de tous
-- ses collègues. Aucun secret à deviner : l'UUID est dans son propre profil.
--
-- CORRECTIF : le trigger ne décide plus jamais du tenant ni du rôle. Tout compte
-- naît ISOLÉ, manager de son propre établissement. Le rattachement à un tenant
-- existant devient une opération explicite et atomique du service-role
-- (attach_invited_user), appelée par /api/employees/invite.
--
-- Sens de défaillance : si le rattachement échoue, l'invité reste manager d'un
-- établissement vide — inutilisable, mais sans aucun accès aux données d'autrui.
--
-- Discriminants écartés (vérifiés en base, aucun ne fonctionne ici) :
--   - current_user      : GoTrue écrit toujours comme `supabase_auth_admin`,
--                         que l'appel vienne de l'API admin ou du signup public.
--   - NEW.invited_at    : renseigné sur 1 employé sur 15 en production.
--   - raw_app_meta_data : non modifiable par le client, mais `generateLink()`
--                         n'accepte que `data` (→ user_metadata) : rien à y lire
--                         au moment où le trigger s'exécute.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_est_id UUID;
BEGIN
  -- Chaque compte naît avec SON établissement. Aucune donnée de
  -- raw_user_meta_data n'entre dans cette décision.
  INSERT INTO public.establishments (name, owner_id)
  VALUES ('Mon établissement', NEW.id)
  RETURNING id INTO v_est_id;

  INSERT INTO public.profiles (id, email, full_name, role, establishment_id, active_establishment_id)
  VALUES (
    NEW.id,
    NEW.email,
    -- Le nom d'affichage reste lu depuis les métadonnées : c'est le nom que
    -- l'utilisateur se donne à lui-même, il n'emporte aucun privilège.
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), ''),
    'manager',
    v_est_id,
    v_est_id
  );

  -- La bascule d'établissement (/api/establishments/switch) lit
  -- user_establishments.role : la ligne d'origine doit exister dès la création,
  -- sinon le multi-site casse pour tous les comptes créés après cette migration.
  INSERT INTO public.user_establishments (user_id, establishment_id, role)
  VALUES (NEW.id, v_est_id, 'manager')
  ON CONFLICT (user_id, establishment_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── Rattachement d'un invité à un établissement existant ─────────────────────
-- Atomique : soit l'invité est entièrement transféré, soit rien n'est modifié.
-- Exécutable uniquement par le service-role — jamais depuis le navigateur.
CREATE OR REPLACE FUNCTION public.attach_invited_user(
  p_user_id          UUID,
  p_establishment_id UUID,
  p_role             TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_orphan UUID;
BEGIN
  IF p_role NOT IN ('employee', 'supervisor', 'manager') THEN
    RAISE EXCEPTION 'Rôle invalide: %', p_role USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.establishments WHERE id = p_establishment_id) THEN
    RAISE EXCEPTION 'Établissement introuvable: %', p_establishment_id USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Établissement auto-créé par handle_new_user, à démonter en fin d'opération.
  SELECT establishment_id INTO v_orphan FROM public.profiles WHERE id = p_user_id;

  UPDATE public.profiles
     SET role                    = p_role,
         establishment_id        = p_establishment_id,
         active_establishment_id = p_establishment_id
   WHERE id = p_user_id;

  DELETE FROM public.user_establishments
   WHERE user_id = p_user_id AND establishment_id = v_orphan;

  -- La contrainte user_establishments_role_check n'admet que manager|supervisor :
  -- un employé n'a pas de ligne d'appartenance (pas de bascule d'établissement).
  IF p_role IN ('manager', 'supervisor') THEN
    INSERT INTO public.user_establishments (user_id, establishment_id, role)
    VALUES (p_user_id, p_establishment_id, p_role)
    ON CONFLICT (user_id, establishment_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  -- L'établissement auto-créé n'a plus aucun membre : on le supprime.
  DELETE FROM public.establishments
   WHERE id = v_orphan
     AND owner_id = p_user_id
     AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.establishment_id = v_orphan);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.attach_invited_user(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.attach_invited_user(UUID, UUID, TEXT) TO service_role;
