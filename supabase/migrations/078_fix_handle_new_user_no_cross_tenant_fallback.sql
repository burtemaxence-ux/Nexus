-- ============================================================
-- 078 — handle_new_user : suppression du fallback cross-tenant
-- ============================================================
-- MIGRATION DE RATTRAPAGE (audit C4). Appliquée en production le 2026-07-06
-- (supabase_migrations.schema_migrations, version 20260706205209) mais jamais
-- committée dans le dépôt. Le contenu ci-dessous est la définition EXACTE
-- relevée en prod via pg_get_functiondef(). Rien n'est corrigé ici.
--
-- ⚠️ DETTE CONNUE, NON TRAITÉE DANS CETTE MIGRATION (finding B1) :
-- `user_role` et `meta_establishment_id` proviennent de raw_user_meta_data,
-- entièrement contrôlé par le navigateur au signup. La création d'un
-- établissement propre n'a lieu QUE si la métadonnée est absente ; un signup
-- portant { role:'manager', establishment_id:'<tenant A>' } rattache donc bien
-- le nouveau compte au tenant A avec le rôle manager. Le commentaire interne
-- « Jamais de rattachement à un tenant existant » décrit l'intention, pas le
-- comportement : 078 n'avait fermé que le fallback, pas le chemin métadonnées.
-- Correction prévue en Phase 1 ; on documente d'abord l'existant.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
