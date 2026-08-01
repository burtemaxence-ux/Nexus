-- ============================================================
-- 089 — Les congés entrent dans la remise à zéro de la démonstration
-- ============================================================
-- La fonction de la migration 088 restaurait tout SAUF les congés. L'écran
-- Congés du manager s'ouvre sur le filtre « en attente », et la démonstration
-- ne portait qu'UNE demande dans cet état : le premier visiteur qui la validait
-- vidait l'écran pour tous les suivants, définitivement — la nuit ne réparait
-- rien. Même famille de panne que les alertes de conformité, qui restaient
-- vides jusqu'à ce que le reset les fasse recalculer.
--
-- Trois demandes en attente plutôt qu'une : un visiteur peut en traiter une ou
-- deux sans que le suivant tombe sur une page vide. Et des demandes déjà
-- acceptées et refusées, pour que les deux autres filtres montrent également
-- quelque chose — commentaire du salarié et réponse du manager compris, qui
-- sont ce que l'écran affiche vraiment.
--
-- Comme les services, les dates sont stockées en OFFSETS par rapport au jour
-- courant : la démonstration ne se périme donc pas. Les demandes sont placées
-- hors de la fenêtre des services planifiés, pour ne jamais afficher un salarié
-- à la fois en congé accordé et en poste.
--
-- Deuxième correction, invisible mais nécessaire : les triggers d'audit se
-- déclenchent sur `leave_requests` et `lateness_records`, tous deux réécrits à
-- chaque exécution. Sans purge, le journal d'audit de la démonstration se
-- remplirait chaque nuit d'entrées automatiques sans auteur, et grossirait sans
-- fin. Nettoyé en fin de course, il ne montre plus que les actions des
-- visiteurs de la journée — ce que le module sert précisément à démontrer.
--
-- Le type de retour gagne une colonne (`conges`) : impossible avec un simple
-- CREATE OR REPLACE, d'où le DROP préalable et le REVOKE rejoué.

DROP FUNCTION IF EXISTS public.reset_demo_data();

CREATE FUNCTION public.reset_demo_data()
RETURNS TABLE (services INT, pointages INT, retards INT, conges INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  est_id   UUID := '67dbd3ea-6427-4fcb-aa01-0798c71e7a17';
  monday   DATE := date_trunc('week', now())::date;
  snap     JSONB;
  n_shifts INT := 0;
  n_pres   INT := 0;
  n_late   INT := 0;
  n_leaves INT := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.establishments WHERE id = est_id) THEN
    RETURN QUERY SELECT 0, 0, 0, 0;
    RETURN;
  END IF;

  SELECT payload INTO snap FROM public.demo_snapshot WHERE kind = 'shifts';
  IF snap IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0, 0;
    RETURN;
  END IF;

  -- ── Purge, en respectant les dépendances vers shifts ──────────────────────
  DELETE FROM public.shift_exchanges      WHERE establishment_id = est_id;
  DELETE FROM public.marketplace_slots    WHERE establishment_id = est_id;
  DELETE FROM public.replacement_requests WHERE establishment_id = est_id;
  DELETE FROM public.lateness_records     WHERE establishment_id = est_id;
  DELETE FROM public.presences            WHERE establishment_id = est_id;
  DELETE FROM public.compliance_alerts    WHERE establishment_id = est_id;
  DELETE FROM public.leave_requests       WHERE establishment_id = est_id;
  DELETE FROM public.shifts               WHERE establishment_id = est_id;

  -- ── Services, réancrés sur la semaine courante ────────────────────────────
  INSERT INTO public.shifts
    (establishment_id, employee_id, date, start_time, end_time, position, poste_id, break_minutes, status)
  SELECT est_id,
         (e->>'employee_id')::uuid,
         monday + ((e->>'week_offset')::int * 7) + (e->>'dow')::int,
         (e->>'start_time')::time,
         (e->>'end_time')::time,
         e->>'position',
         NULLIF(e->>'poste_id','')::uuid,
         COALESCE((e->>'break_minutes')::int, 0),
         COALESCE(e->>'status','published')
  FROM jsonb_array_elements(snap) e;
  GET DIAGNOSTICS n_shifts = ROW_COUNT;

  -- ── Semaines publiées : sans quoi l'espace salarié affiche un planning vide
  DELETE FROM public.week_status WHERE establishment_id = est_id;
  INSERT INTO public.week_status (establishment_id, week_monday, published, published_at, locked)
  SELECT est_id, w.lundi, true, now() - interval '5 days', false
  FROM (SELECT DISTINCT date_trunc('week', s.date)::date AS lundi
        FROM public.shifts s WHERE s.establishment_id = est_id) w;

  -- ── Pointages des services passés, avec une variance déterministe ─────────
  WITH past AS (
    SELECT s.*, row_number() OVER (ORDER BY s.date, s.start_time)::int AS rn
    FROM public.shifts s
    WHERE s.establishment_id = est_id AND s.date < current_date
  )
  INSERT INTO public.presences
    (employee_id, date, clock_in, clock_out, break_minutes_used, establishment_id, needs_review)
  SELECT p.employee_id, p.date,
         ((p.date + p.start_time) AT TIME ZONE 'Europe/Paris') + (((p.rn * 7 % 23) - 6) || ' minutes')::interval,
         CASE WHEN p.rn % 17 = 0 THEN NULL
              ELSE ((p.date + p.end_time) AT TIME ZONE 'Europe/Paris') + (((p.rn * 5 % 19) - 7) || ' minutes')::interval END,
         COALESCE(p.break_minutes, 0), est_id, (p.rn % 17 = 0)
  FROM past p;
  GET DIAGNOSTICS n_pres = ROW_COUNT;

  -- ── Retards réels, au-delà de 10 minutes ──────────────────────────────────
  INSERT INTO public.lateness_records
    (employee_id, date, scheduled_time, actual_time, late_minutes, justified, establishment_id)
  SELECT pr.employee_id, pr.date, s.start_time, pr.clock_in,
         (EXTRACT(epoch FROM (pr.clock_in - ((pr.date + s.start_time) AT TIME ZONE 'Europe/Paris')))::int / 60),
         false, est_id
  FROM public.presences pr
  JOIN public.shifts s ON s.employee_id = pr.employee_id AND s.date = pr.date AND s.establishment_id = est_id
  WHERE pr.establishment_id = est_id
    AND pr.clock_in > ((pr.date + s.start_time) AT TIME ZONE 'Europe/Paris') + interval '10 minutes';
  GET DIAGNOSTICS n_late = ROW_COUNT;

  -- ── Congés de référence, en offsets relatifs au jour courant ──────────────
  -- Le rang alphabétique désigne le salarié, comme pour les candidats au
  -- remplacement plus bas : 1 Alice, 3 Camille, 4 David, 5 Élise, 6 François,
  -- 8 Hugo. Aucun identifiant en dur, la fonction survit à un rechargement des
  -- profils de démonstration.
  WITH equipe AS (
    SELECT id, row_number() OVER (ORDER BY full_name)::int AS rn
    FROM public.profiles
    WHERE establishment_id = est_id AND role = 'employee'
  ),
  modele (rn, genre, debut, fin, statut, mot, reponse) AS (
    VALUES
      (1, 'CP',          17,  24, 'pending',  'Vacances en famille, réservées depuis mars.'::text, NULL::text),
      (3, 'RTT',         11,  11, 'pending',  'Rendez-vous administratif, je peux décaler d''un jour si ça vous arrange.', NULL),
      (8, 'sans_solde',  30,  37, 'pending',  'Déménagement. Je récupère les heures ensuite si vous préférez.', NULL),
      (5, 'CP',         -26, -23, 'approved', NULL, 'Bon repos.'),
      (6, 'CP',          45,  52, 'approved', 'Congés d''été, posés en avance.', 'Validé — pensez à briefer Grace avant de partir.'),
      (4, 'CP',           9,  12, 'rejected', 'Long week-end prolongé.', 'Refusé : deux absences sont déjà posées cette semaine-là. Reproposez sur la suivante, je valide.')
  )
  INSERT INTO public.leave_requests
    (employee_id, establishment_id, type, start_date, end_date, status, comment, manager_comment, created_at, updated_at)
  SELECT e.id, est_id, m.genre,
         current_date + m.debut,
         current_date + m.fin,
         m.statut, m.mot, m.reponse,
         -- Déposée neuf jours avant la date demandée : une demande créée après
         -- le congé qu'elle couvre se remarque au premier coup d'œil.
         ((current_date + m.debut - 9)::timestamp) AT TIME ZONE 'Europe/Paris',
         ((current_date + m.debut - 9)::timestamp) AT TIME ZONE 'Europe/Paris'
  FROM modele m
  JOIN equipe e ON e.rn = m.rn;
  GET DIAGNOSTICS n_leaves = ROW_COUNT;

  -- ── Échanges, marketplace et remplacement de référence ────────────────────
  WITH fut AS (
    SELECT s.id, s.employee_id, s.date, row_number() OVER (ORDER BY s.date, s.start_time)::int AS rn
    FROM public.shifts s WHERE s.establishment_id = est_id AND s.date > current_date
  ),
  autres AS (
    SELECT id, full_name, row_number() OVER (ORDER BY full_name)::int AS rn
    FROM public.profiles WHERE establishment_id = est_id AND role = 'employee'
  ),
  ex AS (
    INSERT INTO public.shift_exchanges (shift_id, proposer_id, acceptor_id, status, proposer_note, establishment_id)
    SELECT f.id, f.employee_id,
           CASE WHEN f.rn = 3 THEN (SELECT id FROM autres WHERE rn = 2) END,
           CASE WHEN f.rn = 3 THEN 'pending_approval' ELSE 'open' END,
           CASE f.rn WHEN 1 THEN 'Rendez-vous médical ce matin-là'
                     WHEN 2 THEN 'Je peux échanger contre un service du week-end'
                     ELSE 'Je récupère celui de vendredi en contrepartie' END,
           est_id
    FROM fut f WHERE f.rn IN (1,2,3) RETURNING 1
  ),
  mk AS (
    INSERT INTO public.marketplace_slots (shift_id, establishment_id, created_by, reason, expires_at, status)
    SELECT f.id, est_id, f.employee_id,
           CASE f.rn WHEN 4 THEN 'Absence imprévue — créneau à pourvoir'
                     ELSE 'Renfort demandé sur le service du matin' END,
           (f.date + time '08:00') AT TIME ZONE 'Europe/Paris', 'open'
    FROM fut f WHERE f.rn IN (4,6) RETURNING 1
  )
  INSERT INTO public.replacement_requests
    (establishment_id, absent_employee_id, shift_id, status, candidates, expires_at)
  SELECT est_id, f.employee_id, f.id, 'pending',
         (SELECT jsonb_agg(jsonb_build_object(
            'employee_id', c.id, 'name', c.full_name, 'score', 96 - (c.rn * 11),
            'reason', CASE c.rn WHEN 1 THEN 'Disponible, repos respecté, 6h de marge contractuelle'
                                WHEN 2 THEN 'Disponible mais passerait en heures supplémentaires'
                                ELSE 'Heures contractuelles déjà atteintes' END))
          FROM autres c WHERE c.rn <= 3),
         ((f.date - 1) + time '18:00') AT TIME ZONE 'Europe/Paris'
  FROM fut f WHERE f.rn = 5;

  -- ── Chiffre d'affaires : fenêtre glissante de 10 semaines ─────────────────
  -- Alimente la prévision et la cible coût/CA du copilote de productivité.
  DELETE FROM public.revenues WHERE establishment_id = est_id;
  INSERT INTO public.revenues (establishment_id, date, amount)
  SELECT est_id, d.jour,
         round((1450
           + CASE EXTRACT(isodow FROM d.jour)
               WHEN 6 THEN 900 WHEN 7 THEN 640 WHEN 5 THEN 320 WHEN 1 THEN -180 ELSE 0 END
           + ((EXTRACT(doy FROM d.jour)::int * 37) % 260) - 130)::numeric, 2)
  FROM generate_series(current_date - 70, current_date - 1, interval '1 day') AS d(jour)
  WHERE EXTRACT(isodow FROM d.jour) <> 1;   -- boulangerie fermée le lundi

  -- ── Journal d'audit : effacer la trace laissée par la remise à zéro ───────
  -- En DERNIER, sinon on nettoie avant que les triggers n'écrivent. Ce qui
  -- reste au fil de la journée, ce sont les actions des visiteurs — et c'est
  -- exactement ce que l'écran doit montrer.
  DELETE FROM public.audit_log WHERE establishment_id = est_id;

  RETURN QUERY SELECT n_shifts, n_pres, n_late, n_leaves;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_demo_data() FROM PUBLIC, anon, authenticated;
