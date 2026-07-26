-- ============================================================
-- 092 — B2 : fermer l'élévation par DELETE puis INSERT sur profiles
-- ============================================================
-- FAILLE CORRIGÉE. La garde 085 ne couvrait que BEFORE UPDATE. Or les policies
-- de `profiles` laissaient un utilisateur authentifié supprimer sa propre ligne
-- puis la réinsérer :
--     profiles_delete USING ((id = auth.uid()) OR (is_manager() AND …))
--     profiles_insert CHECK ((id = auth.uid()) OR (is_manager() AND …))
-- Dès que `id = auth.uid()`, la première branche est vraie et le CHECK ne
-- contraint NI `role` NI `establishment_id`. Deux instructions suffisaient,
-- depuis l'API REST publique, avec un simple compte employé :
--     DELETE FROM profiles WHERE id = auth.uid();
--     INSERT INTO profiles (id, …, role, establishment_id)
--     VALUES (auth.uid(), …, 'manager', '<tenant visé>');
-- Scénario rejoué avant correctif : 0 shift visible → 1 shift du tenant A,
-- role=manager, is_manager()=true. Prise de contrôle cross-tenant complète.
--
-- ── Pourquoi la garde va plus loin que « refuser role <> 'employee' » ──────
-- Se réinsérer comme simple EMPLOYÉ du tenant visé suffit à tout ouvrir :
--     current_establishment_id() = SELECT COALESCE(active_establishment_id,
--                                  establishment_id) FROM profiles
--                                  WHERE id = auth.uid()
-- La fonction lit la ligne de l'attaquant. Toutes les policies filtrées par
-- `establishment_id = current_establishment_id()` — shifts, présences, congés,
-- plannings — s'alignent donc sur le tenant qu'il s'est choisi. Une garde
-- limitée au rôle aurait laissé l'attaque entière ouverte.
--
-- Le cycle de vie d'un profil n'appartient de toute façon pas au client :
-- création par le trigger handle_new_user (SECURITY DEFINER, s'exécute en
-- `postgres`), enrichissement et suppression par le service-role. Aucun chemin
-- applicatif n'insère ni ne supprime de profil depuis un client authentifié —
-- vérifié sur l'ensemble de app/, lib/ et components/.
-- On refuse donc INSERT et DELETE à `authenticated` et `anon`, sans condition.

CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- `postgres` (trigger SECURITY DEFINER) et `service_role` ne sont pas visés.
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Création de profil non autorisée'
        USING ERRCODE = 'insufficient_privilege';
    ELSIF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Suppression de profil non autorisée — passer par deletion_requests'
        USING ERRCODE = 'insufficient_privilege';
    ELSIF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.establishment_id IS DISTINCT FROM OLD.establishment_id THEN
      RAISE EXCEPTION 'Modification de role/establishment_id non autorisée'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profiles_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profiles_privileged_columns
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profiles_privileged_columns();

-- ── Défense en profondeur : retirer aussi le privilège de table ────────────
-- Contrairement au REVOKE au niveau COLONNE de 084 — inopérant face à un GRANT
-- de table — un REVOKE de table produit bien son effet. La garde ci-dessus
-- tient même si un GRANT ALL futur réattribue ces droits ; ce REVOKE fait
-- échouer la requête plus tôt, avant même l'évaluation des policies.
--
-- TRUNCATE est retiré au passage : il n'est PAS soumis à la RLS. Un rôle
-- exposé au navigateur qui le détient peut vider la table entière, policies ou
-- pas. Note pour l'audit : ce privilège est accordé par défaut à `anon` et
-- `authenticated` sur TOUTES les tables de `public`
-- (ALTER DEFAULT PRIVILEGES … GRANT ALL). Le traiter globalement dépasse le
-- périmètre de B2 — signalé pour arbitrage.
REVOKE INSERT, DELETE, TRUNCATE ON public.profiles FROM authenticated, anon;
