-- ============================================================
-- 091 — Le moteur de conformité se montre enfin, et les contrats ne périment plus
-- ============================================================
-- Deux défauts relevés en relisant la démonstration avec l'œil d'un acquéreur.
--
-- 1. L'ÉCRAN CONFORMITÉ NE MONTRAIT QU'UNE RÈGLE SUR 17. Le dossier vend un
--    moteur de dix-sept règles du Code du travail ; l'écran affichait la même
--    ligne répétée pour six salariés — « dépassement des heures contractuelles ».
--    Non parce que le moteur est pauvre, mais parce que le planning de référence
--    était irréprochable partout ailleurs, et que la convention boulangerie
--    (IDCC 3061) neutralise à juste titre les alertes « travail de nuit » et
--    « travail le dimanche » : un fournil commence à 4 h, la boutique ouvre le
--    dimanche. Alerter là-dessus serait du bruit, et le produit a raison.
--
--    Trois situations ordinaires d'une fin de semaine chargée sont donc
--    introduites, chacune sur une règle différente, un salarié différent et un
--    niveau de gravité différent. Elles sont vérifiées par le VRAI moteur dans
--    lib/compliance/demo-planning.test.ts — si un seuil bouge, le test le dit
--    avant qu'un acquéreur ne le découvre.
--
-- 2. LE CDD DE DAVID ÉTAIT PÉRIMÉ. Sa date de fin était absolue : le contrat
--    s'est terminé le 24 juillet et il restait planifié après — la situation de
--    requalification en CDI la plus classique (art. L1243-11), sur un produit
--    vendu comme protection contre les prud'hommes. Les contrats sont désormais
--    réancrés comme le reste : le CDD se termine dans vingt-quatre jours, dans
--    la fenêtre où l'alerte de fin de contrat a du sens.
--
-- Signature inchangée : un CREATE OR REPLACE suffit, pas de DROP.

CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS TABLE (services INT, pointages INT, retards INT, conges INT, notifs INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  est_id     UUID := '67dbd3ea-6427-4fcb-aa01-0798c71e7a17';
  demo_email TEXT := 'alice.martin@demo.qb.fr';
  monday     DATE := date_trunc('week', now())::date;
  snap       JSONB;
  n_shifts   INT := 0;
  n_pres     INT := 0;
  n_late     INT := 0;
  n_leaves   INT := 0;
  n_notifs   INT := 0;
  n_tmp      INT := 0;
  mois       TEXT[] := ARRAY['janvier','février','mars','avril','mai','juin',
                             'juillet','août','septembre','octobre','novembre','décembre'];
  week_label TEXT;
  -- Salariés par rang alphabétique, comme partout ailleurs dans cette fonction :
  -- 1 Alice, 2 Benoît, 3 Camille, 4 David, 5 Élise, 6 François, 7 Grace, 8 Hugo.
  eq         UUID[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.establishments WHERE id = est_id) THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  SELECT payload INTO snap FROM public.demo_snapshot WHERE kind = 'shifts';
  IF snap IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  SELECT array_agg(id ORDER BY full_name) INTO eq
  FROM public.profiles WHERE establishment_id = est_id AND role = 'employee';

  -- ── Purge, en respectant les dépendances vers shifts ──────────────────────
  DELETE FROM public.notifications
   WHERE user_id IN (SELECT id FROM public.profiles WHERE establishment_id = est_id);
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

  -- ── Les trois infractions de démonstration ────────────────────────────────
  -- Posées APRÈS la restauration et AVANT les pointages, pour que les heures
  -- pointées suivent les heures planifiées. Semaine courante uniquement : c'est
  -- celle qu'un visiteur ouvre.

  -- Repos quotidien (art. L3131-1) — CRITIQUE. François ferme le vendredi à
  -- 20 h et rouvre le samedi à 6 h : 10 h de repos au lieu de 11.
  INSERT INTO public.shifts
    (establishment_id, employee_id, date, start_time, end_time, poste_id, break_minutes, status)
  SELECT est_id, eq[6], monday + 5, TIME '06:00', TIME '14:00',
         (SELECT id FROM public.postes WHERE establishment_id = est_id AND name = 'Vendeur' LIMIT 1),
         30, 'published'
  WHERE eq[6] IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.establishment_id = est_id AND s.employee_id = eq[6] AND s.date = monday + 5
    );

  -- Durée quotidienne maximale (art. L3121-18) — CRITIQUE. Le responsable reste
  -- jusqu'à 19 h : 11 h de travail effectif, au-dessus des 10 h.
  UPDATE public.shifts SET end_time = TIME '19:00'
  WHERE establishment_id = est_id AND employee_id = eq[8] AND date = monday + 4;

  -- Pause manquante (art. L3121-16) — AVERTISSEMENT. Sept heures d'affilée sans
  -- pause, là où vingt minutes sont dues dès six heures.
  UPDATE public.shifts SET break_minutes = 0
  WHERE establishment_id = est_id AND employee_id = eq[3] AND date = monday + 4;

  -- ── Semaines publiées ─────────────────────────────────────────────────────
  DELETE FROM public.week_status WHERE establishment_id = est_id;
  INSERT INTO public.week_status (establishment_id, week_monday, published, published_at, locked)
  SELECT est_id, w.lundi, true, now() - interval '5 days', false
  FROM (SELECT DISTINCT date_trunc('week', s.date)::date AS lundi
        FROM public.shifts s WHERE s.establishment_id = est_id) w;

  -- ── Pointages des services passés ─────────────────────────────────────────
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

  -- ── Contrats réancrés ─────────────────────────────────────────────────────
  -- Les dates étaient absolues : le CDD s'est terminé le 24 juillet pendant que
  -- son titulaire restait planifié — exactement la requalification en CDI que le
  -- produit est censé prévenir. Réancré, il se termine dans vingt-quatre jours,
  -- là où l'alerte de fin de contrat a un sens. Les périodes d'essai (60 jours)
  -- restent closes, sans dériver d'un jour à l'autre.
  UPDATE public.contracts c SET
    start_date = current_date - 144,
    end_date   = CASE WHEN c.type = 'CDD' THEN current_date + 24 ELSE c.end_date END
  FROM public.profiles p
  WHERE p.id = c.employee_id AND p.establishment_id = est_id;

  -- ── Congés de référence ───────────────────────────────────────────────────
  WITH equipe AS (
    SELECT id, row_number() OVER (ORDER BY full_name)::int AS rn
    FROM public.profiles
    WHERE establishment_id = est_id AND role = 'employee'
  ),
  modele (rn, genre, debut, fin, depuis, statut, mot, reponse) AS (
    VALUES
      (1, 'CP',          17,  24,  3, 'pending',  'Vacances en famille, réservées depuis mars.'::text, NULL::text),
      (3, 'RTT',         11,  11,  1, 'pending',  'Rendez-vous administratif, je peux décaler d''un jour si ça vous arrange.', NULL),
      (8, 'sans_solde',  30,  37,  6, 'pending',  'Déménagement. Je récupère les heures ensuite si vous préférez.', NULL),
      (5, 'CP',         -26, -23, 35, 'approved', NULL, 'Bon repos.'),
      (6, 'CP',          45,  52, 12, 'approved', 'Congés d''été, posés en avance.', 'Validé — pensez à briefer Grace avant de partir.'),
      (4, 'CP',           9,  12,  8, 'rejected', 'Long week-end prolongé.', 'Refusé : deux absences sont déjà posées cette semaine-là. Reproposez sur la suivante, je valide.'),
      (1, 'CP',         -40, -38, 47, 'approved', 'Mariage de ma sœur, je pose deux jours.', 'Accepté. Bon week-end.')
  )
  INSERT INTO public.leave_requests
    (employee_id, establishment_id, type, start_date, end_date, status, comment, manager_comment, created_at, updated_at)
  SELECT e.id, est_id, m.genre,
         current_date + m.debut,
         current_date + m.fin,
         m.statut, m.mot, m.reponse,
         ((current_date - m.depuis)::timestamp + time '09:20') AT TIME ZONE 'Europe/Paris',
         ((current_date - m.depuis)::timestamp + time '09:20') AT TIME ZONE 'Europe/Paris'
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

  -- ── L'échange du compte salarié visité ────────────────────────────────────
  INSERT INTO public.shift_exchanges (shift_id, proposer_id, status, proposer_note, establishment_id)
  SELECT s.id, s.employee_id, 'open',
         'Je dois accompagner ma fille à un rendez-vous. Je reprends volontiers un service de fin de semaine en échange.',
         est_id
  FROM public.shifts s
  WHERE s.establishment_id = est_id
    AND s.employee_id = (SELECT id FROM public.profiles WHERE email = demo_email)
    AND s.date > current_date
    AND NOT EXISTS (SELECT 1 FROM public.shift_exchanges e WHERE e.shift_id = s.id)
  ORDER BY s.date, s.start_time
  LIMIT 1;

  -- ── Chiffre d'affaires : fenêtre glissante de 10 semaines ─────────────────
  DELETE FROM public.revenues WHERE establishment_id = est_id;
  INSERT INTO public.revenues (establishment_id, date, amount)
  SELECT est_id, d.jour,
         round((1450
           + CASE EXTRACT(isodow FROM d.jour)
               WHEN 6 THEN 900 WHEN 7 THEN 640 WHEN 5 THEN 320 WHEN 1 THEN -180 ELSE 0 END
           + ((EXTRACT(doy FROM d.jour)::int * 37) % 260) - 130)::numeric, 2)
  FROM generate_series(current_date - 70, current_date - 1, interval '1 day') AS d(jour)
  WHERE EXTRACT(isodow FROM d.jour) <> 1;

  -- ── Notifications, dérivées de tout ce qui précède ────────────────────────
  week_label := CASE
    WHEN EXTRACT(month FROM monday) = EXTRACT(month FROM monday + 6)
      THEN EXTRACT(day FROM monday)::int || ' – ' || EXTRACT(day FROM monday + 6)::int
           || ' ' || mois[EXTRACT(month FROM monday + 6)::int]
           || ' ' || EXTRACT(year FROM monday + 6)::int
    ELSE EXTRACT(day FROM monday)::int || ' ' || mois[EXTRACT(month FROM monday)::int]
         || ' – ' || EXTRACT(day FROM monday + 6)::int || ' ' || mois[EXTRACT(month FROM monday + 6)::int]
         || ' ' || EXTRACT(year FROM monday + 6)::int
  END;

  INSERT INTO public.notifications
    (user_id, establishment_id, type, title, body, action_url, read, created_at)
  SELECT DISTINCT s.employee_id, est_id, 'planning_published',
         'Planning semaine ' || week_label || ' disponible',
         'Du ' || EXTRACT(day FROM monday)::int || ' ' || mois[EXTRACT(month FROM monday)::int]
           || ' au ' || EXTRACT(day FROM monday + 6)::int || ' ' || mois[EXTRACT(month FROM monday + 6)::int]
           || ' — Consultez vos horaires',
         '/employee/planning', false, now() - interval '5 days'
  FROM public.shifts s
  WHERE s.establishment_id = est_id AND s.date >= monday AND s.date < monday + 7;
  GET DIAGNOSTICS n_tmp = ROW_COUNT; n_notifs := n_notifs + n_tmp;

  INSERT INTO public.notifications
    (user_id, establishment_id, type, title, body, action_url, read, created_at)
  SELECT s.employee_id, est_id, 'shift_reminder',
         '📅 Demain, tu travailles',
         'Service de ' || to_char(s.start_time, 'HH24:MI') || ' à ' || to_char(s.end_time, 'HH24:MI'),
         '/employee/planning', false, now() - interval '3 hours'
  FROM public.shifts s
  WHERE s.establishment_id = est_id AND s.date = current_date + 1;
  GET DIAGNOSTICS n_tmp = ROW_COUNT; n_notifs := n_notifs + n_tmp;

  INSERT INTO public.notifications
    (user_id, establishment_id, type, title, body, action_url, read, created_at)
  SELECT lr.employee_id, est_id,
         CASE lr.status WHEN 'approved' THEN 'leave_approved' ELSE 'leave_rejected' END,
         CASE lr.status WHEN 'approved' THEN 'Congé accepté ✅' ELSE 'Congé refusé ❌' END,
         EXTRACT(day FROM lr.start_date)::int || ' ' || mois[EXTRACT(month FROM lr.start_date)::int]
           || ' → ' || EXTRACT(day FROM lr.end_date)::int || ' ' || mois[EXTRACT(month FROM lr.end_date)::int]
           || COALESCE(' — ' || lr.manager_comment, ''),
         '/employee/conges', false, lr.updated_at + interval '6 hours'
  FROM public.leave_requests lr
  WHERE lr.establishment_id = est_id AND lr.status IN ('approved', 'rejected');
  GET DIAGNOSTICS n_tmp = ROW_COUNT; n_notifs := n_notifs + n_tmp;

  WITH sem AS (
    SELECT s.employee_id,
           round(sum(
             EXTRACT(epoch FROM (s.end_time - s.start_time)) / 60.0
             - COALESCE(s.break_minutes, 0)
           ))::int AS minutes
    FROM public.shifts s
    WHERE s.establishment_id = est_id AND s.date >= monday - 7 AND s.date < monday
    GROUP BY s.employee_id
  ),
  ret AS (
    SELECT employee_id, count(*)::int AS n
    FROM public.lateness_records
    WHERE establishment_id = est_id AND date >= monday - 7 AND date < monday
    GROUP BY employee_id
  )
  INSERT INTO public.notifications
    (user_id, establishment_id, type, title, body, action_url, read, created_at)
  SELECT sem.employee_id, est_id, 'weekly_summary',
         '📊 Ta semaine en chiffres',
         (sem.minutes / 60) || 'h' || lpad((sem.minutes % 60)::text, 2, '0')
           || ' travaillées la semaine dernière, '
           || CASE COALESCE(ret.n, 0)
                WHEN 0 THEN 'aucun retard.'
                WHEN 1 THEN '1 retard.'
                ELSE ret.n || ' retards.' END,
         '/employee', false,
         ((monday - 3)::timestamp + time '18:00') AT TIME ZONE 'Europe/Paris'
  FROM sem LEFT JOIN ret ON ret.employee_id = sem.employee_id;
  GET DIAGNOSTICS n_tmp = ROW_COUNT; n_notifs := n_notifs + n_tmp;

  INSERT INTO public.notifications
    (user_id, establishment_id, type, title, body, read, created_at)
  SELECT m.id, est_id, 'employee_clocked_in',
         p.full_name || ' a pointé son arrivée',
         'À ' || to_char(pr.clock_in AT TIME ZONE 'Europe/Paris', 'HH24:MI') || ' — ' ||
         CASE WHEN lt.late_minutes IS NOT NULL
              THEN lt.late_minutes || ' min de retard'
              ELSE 'À l''heure' END,
         false, pr.clock_in + interval '1 minute'
  FROM public.presences pr
  JOIN public.profiles p ON p.id = pr.employee_id
  LEFT JOIN public.lateness_records lt
         ON lt.employee_id = pr.employee_id AND lt.date = pr.date
  CROSS JOIN LATERAL (
    SELECT id FROM public.profiles
    WHERE establishment_id = est_id AND role IN ('manager', 'supervisor')
  ) m
  WHERE pr.establishment_id = est_id
    AND pr.date = (SELECT max(date) FROM public.presences WHERE establishment_id = est_id);
  GET DIAGNOSTICS n_tmp = ROW_COUNT; n_notifs := n_notifs + n_tmp;

  -- ── Journal d'audit : effacer la trace laissée par la remise à zéro ───────
  DELETE FROM public.audit_log WHERE establishment_id = est_id;

  RETURN QUERY SELECT n_shifts, n_pres, n_late, n_leaves, n_notifs;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_demo_data() FROM PUBLIC, anon, authenticated;
