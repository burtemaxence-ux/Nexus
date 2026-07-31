-- ============================================================
-- 091 — B1 : handle_new_user cesse de faire confiance au navigateur
-- ============================================================
-- ⚠️ ORDRE D'APPLICATION — NE PAS APPLIQUER AVANT LE DÉPLOIEMENT DU CODE.
-- Ce trigger cesse de lire `role` dans les métadonnées et pose 'manager'.
-- L'ANCIENNE version de /api/employees/invite ne réécrit pas le rôle : appliquée
-- seule, cette migration ferait de chaque employé invité un MANAGER de
-- l'établissement — une escalade de privilèges à l'intérieur du tenant.
-- Séquence correcte : 090 (colonne, sans risque) → déploiement du code →
-- 091. Le correctif de la route est dans le même commit que ce fichier.
-- ============================================================
-- FAILLE CORRIGÉE. `raw_user_meta_data` est intégralement contrôlé par le
-- client au signup (options.data de supabase.auth.signUp). L'ancienne version
-- y lisait `role` ET `establishment_id`, et ne créait un établissement propre
-- que si la métadonnée était absente. Une inscription publique portant
--     { role: 'manager', establishment_id: '<tenant A>' }
-- créait donc un profil manager DANS le tenant A. La RLS accordait ensuite au
-- compte l'intégralité des données de cet établissement : salaires, contrats,
-- IBAN, numéros de sécurité sociale.
--
-- Scénario rejoué avant/après — voir supabase/harness/tests/b1_handle_new_user.sql.
--
-- ── Le correctif, et pourquoi il ne force PAS le rôle à 'employee' ─────────
-- La faille tient à `establishment_id`, pas à `role`. Un compte qui obtient
-- 'manager' sur un établissement NEUF, VIDE et dont il est lui-même
-- propriétaire n'obtient aucun privilège illégitime : c'est le parcours normal
-- d'un nouveau client. Forcer 'employee' aurait cassé tout le tunnel
-- d'inscription — app/(auth)/register/page.tsx envoie role:'manager' et rien
-- ne promeut le compte ensuite — sans rien fermer de plus.
--
-- Ce qui compte est que le rôle ne soit plus DICTÉ par le client : il est
-- désormais déduit de la situation (on vient de créer l'établissement, on en
-- est le propriétaire), et les deux métadonnées de privilège sont ignorées.
--
-- Vérifié : une seule policy en base évalue `role` sans filtre d'établissement
-- (`planning_signatures_select`, finding C5). Toutes les autres croisent le
-- rôle avec l'établissement, donc un manager d'un tenant vide n'atteint rien.
-- C5 devient de fait exploitable par simple inscription publique — mais c'était
-- déjà le cas avant ce correctif, puisque le rôle venait des métadonnées.
--
-- Le rattachement à un établissement EXISTANT passe désormais exclusivement
-- par /api/employees/invite, en service-role : il réaffecte le profil après
-- création (rôle réel + établissement du manager) et supprime l'établissement
-- transitoire. Le service role n'est pas soumis à la garde 085.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  new_establishment_id UUID;
BEGIN
  -- Systématiquement son propre établissement. Jamais de rattachement à un
  -- tenant existant depuis le signup — cette fois-ci pour de vrai.
  INSERT INTO public.establishments (name, owner_id)
  VALUES ('Mon établissement', NEW.id)
  RETURNING id INTO new_establishment_id;

  INSERT INTO public.profiles (id, email, full_name, role, establishment_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),  -- cosmétique, sans privilège
    'manager',             -- jamais NEW.raw_user_meta_data->>'role'
    new_establishment_id   -- jamais NEW.raw_user_meta_data->>'establishment_id'
  );

  RETURN NEW;
END;
$function$;

-- `profiles.invited_by` est ajoutée par 090, appliquée séparément et en amont :
-- c'est l'UPDATE qui la contient qui porte désormais le rôle réel et le
-- rattachement à l'établissement du manager. Sans elle, chaque invité
-- resterait 'manager' de l'établissement transitoire créé ci-dessus.
