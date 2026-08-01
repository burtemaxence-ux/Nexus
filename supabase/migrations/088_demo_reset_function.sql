-- ============================================================
-- 088 — public.reset_demo_data() : rejoue l'état de référence de la démo
-- ============================================================
-- Appelée chaque nuit par /api/cron/demo-reset (03h00 UTC).
--
-- Traite deux problèmes d'un seul geste, grâce à un instantané stocké en
-- offsets plutôt qu'en dates absolues (migration 087) :
--   1. la DÉRIVE — un visiteur déplace, supprime ou ajoute des services ;
--   2. la PÉREMPTION — les dates figées s'éloignent de la semaine courante,
--      jusqu'à ce qu'un acquéreur tombe sur un planning vide.
--
-- Idempotente, et sans effet si l'établissement de démonstration n'existe pas :
-- une base neuve, ou le clone d'un repreneur, n'est pas touchée.
--
-- La logique vit ici plutôt que dans la route de cron pour être versionnée avec
-- le schéma et exécutable à la main : SELECT * FROM public.reset_demo_data();
--
-- ⚠️ Piège rencontré à l'écriture, pour qui reprendra ce code : la division
-- entière de Postgres tronque VERS ZÉRO et non vers le bas — (-13)/7 vaut -1 et
-- non -2. Les offsets de semaine de l'instantané doivent donc être calculés
-- avec floor(), sinon deux semaines passées se replient l'une sur l'autre et la
-- restauration viole shifts_no_exact_duplicate.

CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS TABLE (services INT, pointages INT, retards INT)
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
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.establishments WHERE id = est_id) THEN
    RETURN QUERY SELECT 0, 0, 0;
    RETURN;
  END IF;

  SELECT payload INTO snap FROM public.demo_snapshot WHERE kind = 'shifts';
  IF snap IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0;
    RETURN;
  END IF;

  -- ── Purge, en respectant les dépendances vers shifts ──────────────────────
  DELETE FROM public.shift_exchanges      WHERE establishment_id = est_id;
  DELETE FROM public.marketplace_slots    WHERE establishment_id = est_id;
  DELETE FROM public.replacement_requests WHERE establishment_id = est_id;
  DELETE FROM public.lateness_records     WHERE establishment_id = est_id;
  DELETE FROM public.presences            WHERE establishment_id = est_id;
  DELETE FROM public.compliance_alerts    WHERE establishment_id = est_id;
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

  RETURN QUERY SELECT n_shifts, n_pres, n_late;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_demo_data() FROM PUBLIC, anon, authenticated;
