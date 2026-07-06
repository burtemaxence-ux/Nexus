-- ============================================================
-- 078 — handle_new_user : fin du rattachement cross-tenant par défaut
-- ============================================================
-- L'ancien fallback (`SELECT id FROM public.establishments LIMIT 1`) rattachait
-- tout compte créé SANS métadonnées (ex. inscription Google OAuth, qui ne peut
-- pas porter de user_metadata) au premier établissement de la base, comme
-- employé — donnant un accès RLS "employé" aux données d'un tenant étranger.
-- Vérifié le 2026-07-06 : aucun compte prod dans cet état (faille latente).
--
-- Désormais : sans establishment_id en métadonnées, le compte reçoit SON propre
-- établissement (owner_id = lui-même), quel que soit le rôle par défaut.
-- /api/auth/set-role s'appuie sur cette propriété (owner_id) pour distinguer un
-- compte self-service à upgrader en manager d'un employé invité (jamais owner).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_role             TEXT;
  meta_establishment_id UUID;
BEGIN
  user_role             := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');
  meta_establishment_id := NULLIF(NEW.raw_user_meta_data->>'establishment_id', '')::UUID;

  -- Compte sans établissement en métadonnées (self-service email ou OAuth) :
  -- créer SON établissement. Jamais de rattachement à un tenant existant.
  IF meta_establishment_id IS NULL THEN
    INSERT INTO public.establishments (name, owner_id)
    VALUES ('Mon établissement', NEW.id)
    RETURNING id INTO meta_establishment_id;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, establishment_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role,
    meta_establishment_id
  );

  RETURN NEW;
END;
$$;
