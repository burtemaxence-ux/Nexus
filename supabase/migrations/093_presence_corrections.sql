-- The API authenticates the actor. Both functions are callable only by the server.
CREATE OR REPLACE FUNCTION public.presence_correction_site(p_actor uuid, p_employee uuid)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  site_id uuid;
BEGIN
  SELECT COALESCE(p.active_establishment_id, p.establishment_id)
    INTO site_id
    FROM public.profiles p
    WHERE p.id = p_actor AND p.role = 'manager' AND NOT p.archived
      AND (
        p.active_establishment_id IS NULL OR p.active_establishment_id = p.establishment_id
        OR EXISTS (
          SELECT 1 FROM public.user_establishments m
          WHERE m.user_id = p.id AND m.establishment_id = p.active_establishment_id AND m.role = 'manager'
        )
      );

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_employee AND p.establishment_id = site_id AND p.role = 'employee'
  ) THEN
    RAISE EXCEPTION 'Accès refusé à ce pointage' USING ERRCODE = '42501';
  END IF;
  RETURN site_id;
END;
$$;

REVOKE ALL ON FUNCTION public.presence_correction_site(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.presence_correction_site(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.correct_presence(
  p_actor uuid, p_employee uuid, p_date date, p_expected_updated_at timestamptz,
  p_clock_in timestamptz, p_clock_out timestamptz, p_reason text
)
RETURNS public.presences
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  site_id uuid := public.presence_correction_site(p_actor, p_employee);
  previous public.presences;
  corrected public.presences;
  actor_name text;
  recorded_lateness public.lateness_records;
  corrected_late_minutes integer;
BEGIN
  IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Saisissez un motif de 1 à 500 caractères.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO previous FROM public.presences
  WHERE employee_id = p_employee AND establishment_id = site_id AND date = p_date
  FOR UPDATE;

  IF previous.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    -- A stale form is an HTTP conflict, so PostgREST must not retry it.
    RAISE EXCEPTION 'Le pointage a changé. Fermez la fenêtre et rouvrez-la pour voir les dernières heures.'
      USING ERRCODE = 'PT409';
  END IF;

  -- Some older rows used UTC for the civil date. Preserve their local arrival
  -- day when correcting an existing row and keep the original row key.
  IF p_date IS NULL OR p_clock_in IS NULL OR NOT isfinite(p_clock_in)
    OR (p_clock_in AT TIME ZONE 'Europe/Paris')::date IS DISTINCT FROM
      COALESCE((previous.clock_in AT TIME ZONE 'Europe/Paris')::date, p_date)
    OR p_clock_in > now()
    OR (p_clock_out IS NOT NULL AND (p_clock_out <= p_clock_in OR p_clock_out > now()))
  THEN
    RAISE EXCEPTION 'Vérifiez la date d’arrivée et l’ordre des heures. Les horaires doivent être passés.'
      USING ERRCODE = '22023';
  END IF;

  IF p_clock_out IS NULL AND (
    previous.clock_out IS NOT NULL
    OR (previous.id IS NULL AND p_clock_in < now() - interval '16 hours')
  ) THEN
    RAISE EXCEPTION 'Indiquez l’heure de départ pour ce pointage.' USING ERRCODE = '22023';
  END IF;

  IF previous.break_start < p_clock_in OR (
    p_clock_out IS NOT NULL AND previous.break_start IS NOT NULL
      AND (previous.break_end IS NULL OR p_clock_out < previous.break_end)
  ) THEN
    RAISE EXCEPTION 'Les heures corrigées doivent encadrer les pauses enregistrées. Terminez toute pause ouverte.'
      USING ERRCODE = '22023';
  END IF;

  IF previous.id IS NULL THEN
    IF p_clock_out IS NULL AND EXISTS (
      SELECT 1 FROM public.presences
      WHERE employee_id = p_employee AND establishment_id = site_id
        AND clock_in IS NOT NULL AND clock_out IS NULL
    ) THEN
      RAISE EXCEPTION 'Un autre pointage est encore ouvert pour ce salarié.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.presences (employee_id, establishment_id, date, clock_in, clock_out)
    VALUES (p_employee, site_id, p_date, p_clock_in, p_clock_out)
    RETURNING * INTO corrected;
  ELSE
    IF previous.clock_in IS NOT DISTINCT FROM p_clock_in AND previous.clock_out IS NOT DISTINCT FROM p_clock_out THEN
      RAISE EXCEPTION 'Modifiez au moins une heure pour enregistrer la correction.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.presences
    SET clock_in = p_clock_in, clock_out = p_clock_out, needs_review = false, updated_at = clock_timestamp()
    WHERE id = previous.id RETURNING * INTO corrected;

    -- Keep an existing automatic lateness alert consistent with a corrected
    -- arrival. Preserve any justification if the employee was still late.
    IF previous.clock_in IS DISTINCT FROM p_clock_in THEN
      SELECT * INTO recorded_lateness FROM public.lateness_records
      WHERE employee_id = p_employee AND establishment_id = site_id AND date = p_date
        AND actual_time = previous.clock_in
      FOR UPDATE;
      IF FOUND THEN
        corrected_late_minutes := floor(extract(epoch FROM (
          p_clock_in - ((p_date + recorded_lateness.scheduled_time) AT TIME ZONE 'Europe/Paris')
        )) / 60)::integer;
        IF corrected_late_minutes < 2 THEN
          DELETE FROM public.lateness_records WHERE id = recorded_lateness.id;
        ELSE
          UPDATE public.lateness_records SET actual_time = p_clock_in, late_minutes = corrected_late_minutes
          WHERE id = recorded_lateness.id;
        END IF;
      END IF;
    END IF;
  END IF;

  SELECT full_name INTO actor_name FROM public.profiles WHERE id = p_actor;
  INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, performed_by, establishment_id)
  VALUES (
    'presences', corrected.id, CASE WHEN previous.id IS NULL THEN 'INSERT' ELSE 'UPDATE' END,
    CASE WHEN previous.id IS NOT NULL THEN jsonb_build_object('clock_in', previous.clock_in, 'clock_out', previous.clock_out) END,
    jsonb_build_object('clock_in', corrected.clock_in, 'clock_out', corrected.clock_out,
      'reason', btrim(p_reason), 'actor_name', actor_name),
    p_actor, site_id
  );

  RETURN corrected;
END;
$$;

REVOKE ALL ON FUNCTION public.correct_presence(uuid, uuid, date, timestamptz, timestamptz, timestamptz, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.correct_presence(uuid, uuid, date, timestamptz, timestamptz, timestamptz, text)
  TO service_role;
