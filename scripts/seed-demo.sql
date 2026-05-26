-- ============================================================
-- NEXUS — Seed démo : Le Bistrot Parisien
-- Instructions : coller et exécuter dans le SQL Editor Supabase
--                (Database → SQL Editor → New query)
--
-- Comptes créés (mot de passe universel : Demo2024!)
--   👔  manager@nexus-demo.fr
--   👤  marie.dupont@nexus-demo.fr    — Serveuse CDI 35h
--   👤  thomas.martin@nexus-demo.fr   — Cuisinier CDI 35h
--   👤  sophie.bernard@nexus-demo.fr  — Serveuse CDI 28h
--   👤  lucas.petit@nexus-demo.fr     — Plongeur CDD
--   👤  emma.rousseau@nexus-demo.fr   — Serveuse Extra
--   👤  antoine.moreau@nexus-demo.fr  — Chef de rang CDI 35h
-- ============================================================

DO $$
DECLARE
  -- UUIDs fixes
  v_mgr_id    UUID := 'a1000000-0000-0000-0000-000000000001';
  v_marie_id  UUID := 'a1000000-0000-0000-0000-000000000002';
  v_thomas_id UUID := 'a1000000-0000-0000-0000-000000000003';
  v_sophie_id UUID := 'a1000000-0000-0000-0000-000000000004';
  v_lucas_id  UUID := 'a1000000-0000-0000-0000-000000000005';
  v_emma_id   UUID := 'a1000000-0000-0000-0000-000000000006';
  v_ant_id    UUID := 'a1000000-0000-0000-0000-000000000007';

  v_est_id    UUID;

  -- Postes
  v_p_serv UUID; v_p_cuis UUID; v_p_plon UUID; v_p_chef UUID;

  v_pwd  TEXT;
  v_week DATE;
  v_sid  UUID;

  -- Compteurs retards
  v_emma_late  INT := 0;
  v_lucas_late INT := 0;
  v_late_min   INT;

  v_weeks DATE[] := ARRAY[
    '2026-04-27'::DATE,
    '2026-05-04'::DATE,
    '2026-05-11'::DATE,
    '2026-05-18'::DATE,
    '2026-05-25'::DATE,
    '2026-06-01'::DATE
  ];

  r RECORD;
BEGIN

  -- ── 0. Colonnes optionnelles (migrations non encore appliquées) ──────────
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS phone         TEXT,
    ADD COLUMN IF NOT EXISTS pay_ref       TEXT,
    ADD COLUMN IF NOT EXISTS pin           VARCHAR(4),
    ADD COLUMN IF NOT EXISTS disability    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archived      BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS first_name    TEXT,
    ADD COLUMN IF NOT EXISTS last_name     TEXT,
    ADD COLUMN IF NOT EXISTS contract_type TEXT,
    ADD COLUMN IF NOT EXISTS weekly_hours  NUMERIC;

  ALTER TABLE public.postes
    ADD COLUMN IF NOT EXISTS hourly_cost        NUMERIC,
    ADD COLUMN IF NOT EXISTS max_hours_per_day  NUMERIC,
    ADD COLUMN IF NOT EXISTS max_hours_per_week NUMERIC;

  ALTER TABLE public.contracts
    ADD COLUMN IF NOT EXISTS job_title           TEXT,
    ADD COLUMN IF NOT EXISTS work_location       TEXT,
    ADD COLUMN IF NOT EXISTS cdd_reason          TEXT,
    ADD COLUMN IF NOT EXISTS trial_period_days   INTEGER,
    ADD COLUMN IF NOT EXISTS notice_period_days  INTEGER,
    ADD COLUMN IF NOT EXISTS paid_leave_days     INTEGER DEFAULT 25,
    ADD COLUMN IF NOT EXISTS has_confidentiality BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS has_non_compete     BOOLEAN NOT NULL DEFAULT FALSE;

  -- Tables optionnelles (migrations 026 / 028)
  CREATE TABLE IF NOT EXISTS public.shift_exchanges (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id      UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    proposer_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    acceptor_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','pending_approval','approved','rejected','cancelled')),
    proposer_note TEXT,
    manager_note  TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.marketplace_slots (
    id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shift_id         UUID REFERENCES public.shifts(id) ON DELETE CASCADE NOT NULL,
    establishment_id UUID NOT NULL,
    created_by       UUID REFERENCES public.profiles(id) NOT NULL,
    reason           TEXT,
    expires_at       TIMESTAMPTZ NOT NULL,
    status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','filled','expired','cancelled')),
    filled_by        UUID REFERENCES public.profiles(id),
    filled_at        TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS marketplace_slot_open_unique
    ON public.marketplace_slots(shift_id) WHERE (status = 'open');

  CREATE TABLE IF NOT EXISTS public.marketplace_applications (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slot_id     UUID REFERENCES public.marketplace_slots(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted','rejected')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(slot_id, employee_id)
  );

  -- ── 1. Nettoyage ──────────────────────────────────────────────────────────
  DELETE FROM auth.identities WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@nexus-demo.fr'
  );
  DELETE FROM auth.users WHERE email LIKE '%@nexus-demo.fr';

  -- ── 1. Manager (le trigger crée l'établissement automatiquement) ──────────
  -- Hash bcrypt $2b$ généré côté Node.js — compatible GoTrue/Supabase Auth
  v_pwd := '$2b$10$DRYzhLWjG85vcB8scfXZNOYkYgbfboz57JtzTNMgi1bZzMHP46Hxu';

  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) VALUES (
    v_mgr_id, 'authenticated', 'authenticated',
    'manager@nexus-demo.fr', v_pwd, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Jean-Pierre Moreau","role":"manager"}'::jsonb,
    now(), now(), false, false
  );

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_mgr_id, 'manager@nexus-demo.fr',
    jsonb_build_object('sub', v_mgr_id::text, 'email', 'manager@nexus-demo.fr', 'email_verified', true, 'phone_verified', false),
    'email', now(), now()
  );

  -- Récupérer l'établissement créé par le trigger
  SELECT establishment_id INTO v_est_id FROM public.profiles WHERE id = v_mgr_id;
  IF v_est_id IS NULL THEN
    RAISE EXCEPTION 'Trigger handle_new_user n''a pas créé le profil manager';
  END IF;
  RAISE NOTICE 'Établissement créé : %', v_est_id;

  -- Mettre à jour l'établissement et le profil manager
  UPDATE public.establishments SET name = 'Le Bistrot Parisien' WHERE id = v_est_id;

  UPDATE public.profiles SET
    full_name = 'Jean-Pierre Moreau', first_name = 'Jean-Pierre', last_name = 'Moreau',
    phone = '06 12 34 56 78', position = 'Directeur',
    contract_type = 'CDI 35h', weekly_hours = 35
  WHERE id = v_mgr_id;

  -- ── 2. Employés ───────────────────────────────────────────────────────────
  INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
  VALUES
    (v_marie_id,  'authenticated','authenticated','marie.dupont@nexus-demo.fr',    v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','Marie Dupont',   'role','employee','establishment_id',v_est_id::text), now(), now(), false, false),
    (v_thomas_id, 'authenticated','authenticated','thomas.martin@nexus-demo.fr',   v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','Thomas Martin',  'role','employee','establishment_id',v_est_id::text), now(), now(), false, false),
    (v_sophie_id, 'authenticated','authenticated','sophie.bernard@nexus-demo.fr',  v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','Sophie Bernard', 'role','employee','establishment_id',v_est_id::text), now(), now(), false, false),
    (v_lucas_id,  'authenticated','authenticated','lucas.petit@nexus-demo.fr',     v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','Lucas Petit',    'role','employee','establishment_id',v_est_id::text), now(), now(), false, false),
    (v_emma_id,   'authenticated','authenticated','emma.rousseau@nexus-demo.fr',   v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','Emma Rousseau',  'role','employee','establishment_id',v_est_id::text), now(), now(), false, false),
    (v_ant_id,    'authenticated','authenticated','antoine.moreau@nexus-demo.fr',  v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','Antoine Moreau', 'role','employee','establishment_id',v_est_id::text), now(), now(), false, false);

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_marie_id,  'marie.dupont@nexus-demo.fr',   jsonb_build_object('sub',v_marie_id::text,  'email','marie.dupont@nexus-demo.fr',   'email_verified',true,'phone_verified',false), 'email', now(), now()),
    (gen_random_uuid(), v_thomas_id, 'thomas.martin@nexus-demo.fr',  jsonb_build_object('sub',v_thomas_id::text, 'email','thomas.martin@nexus-demo.fr',  'email_verified',true,'phone_verified',false), 'email', now(), now()),
    (gen_random_uuid(), v_sophie_id, 'sophie.bernard@nexus-demo.fr', jsonb_build_object('sub',v_sophie_id::text, 'email','sophie.bernard@nexus-demo.fr', 'email_verified',true,'phone_verified',false), 'email', now(), now()),
    (gen_random_uuid(), v_lucas_id,  'lucas.petit@nexus-demo.fr',    jsonb_build_object('sub',v_lucas_id::text,  'email','lucas.petit@nexus-demo.fr',    'email_verified',true,'phone_verified',false), 'email', now(), now()),
    (gen_random_uuid(), v_emma_id,   'emma.rousseau@nexus-demo.fr',  jsonb_build_object('sub',v_emma_id::text,   'email','emma.rousseau@nexus-demo.fr',  'email_verified',true,'phone_verified',false), 'email', now(), now()),
    (gen_random_uuid(), v_ant_id,    'antoine.moreau@nexus-demo.fr', jsonb_build_object('sub',v_ant_id::text,    'email','antoine.moreau@nexus-demo.fr', 'email_verified',true,'phone_verified',false), 'email', now(), now());

  -- Mettre à jour les profils employés (le trigger les a créés, on complète)
  UPDATE public.profiles SET full_name='Marie Dupont',   first_name='Marie',   last_name='Dupont',   phone='06 23 45 67 89', position='Serveur/Serveuse', contract_type='CDI 35h', weekly_hours=35, establishment_id=v_est_id WHERE id=v_marie_id;
  UPDATE public.profiles SET full_name='Thomas Martin',  first_name='Thomas',  last_name='Martin',   phone='06 34 56 78 90', position='Cuisinier',        contract_type='CDI 35h', weekly_hours=35, establishment_id=v_est_id WHERE id=v_thomas_id;
  UPDATE public.profiles SET full_name='Sophie Bernard', first_name='Sophie',  last_name='Bernard',  phone='06 45 67 89 01', position='Serveur/Serveuse', contract_type='CDI 28h', weekly_hours=28, establishment_id=v_est_id WHERE id=v_sophie_id;
  UPDATE public.profiles SET full_name='Lucas Petit',    first_name='Lucas',   last_name='Petit',    phone='06 56 78 90 12', position='Plongeur',         contract_type='CDD',     weekly_hours=35, establishment_id=v_est_id WHERE id=v_lucas_id;
  UPDATE public.profiles SET full_name='Emma Rousseau',  first_name='Emma',    last_name='Rousseau', phone='06 67 89 01 23', position='Serveur/Serveuse', contract_type='Extra',   weekly_hours=24, establishment_id=v_est_id WHERE id=v_emma_id;
  UPDATE public.profiles SET full_name='Antoine Moreau', first_name='Antoine', last_name='Moreau',   phone='06 78 90 12 34', position='Chef de rang',     contract_type='CDI 35h', weekly_hours=35, establishment_id=v_est_id WHERE id=v_ant_id;

  RAISE NOTICE '✅ Profils créés';

  -- ── 3. Settings ───────────────────────────────────────────────────────────
  INSERT INTO public.settings (key, value, establishment_id) VALUES
    ('establishment_name',  'Le Bistrot Parisien',                  v_est_id),
    ('opening_time',        '07:00',                                 v_est_id),
    ('closing_time',        '23:30',                                 v_est_id),
    ('break_minutes_limit', '30',                                    v_est_id),
    ('collective_agreement','CHR — Convention collective nationale', v_est_id)
  ON CONFLICT (key, establishment_id) DO UPDATE SET value = EXCLUDED.value;

  -- ── 4. Postes ─────────────────────────────────────────────────────────────
  INSERT INTO public.postes (name, color, break_minutes, hourly_cost, max_hours_per_day, max_hours_per_week, establishment_id)
    VALUES ('Serveur/Serveuse', '#3B82F6', 30, 12.50, 10, 48, v_est_id) RETURNING id INTO v_p_serv;
  INSERT INTO public.postes (name, color, break_minutes, hourly_cost, max_hours_per_day, max_hours_per_week, establishment_id)
    VALUES ('Cuisinier', '#EF4444', 30, 14.00, 10, 48, v_est_id) RETURNING id INTO v_p_cuis;
  INSERT INTO public.postes (name, color, break_minutes, hourly_cost, max_hours_per_day, max_hours_per_week, establishment_id)
    VALUES ('Plongeur', '#8B5CF6', 20, 11.88, 8, 35, v_est_id) RETURNING id INTO v_p_plon;
  INSERT INTO public.postes (name, color, break_minutes, hourly_cost, max_hours_per_day, max_hours_per_week, establishment_id)
    VALUES ('Chef de rang', '#059669', 30, 15.00, 10, 48, v_est_id) RETURNING id INTO v_p_chef;
  INSERT INTO public.postes (name, color, break_minutes, hourly_cost, max_hours_per_day, max_hours_per_week, establishment_id)
    VALUES ('Barman/Barmaid', '#F59E0B', 30, 13.00, 10, 48, v_est_id);

  RAISE NOTICE '✅ Postes créés';

  -- ── 5. Contrats ───────────────────────────────────────────────────────────
  INSERT INTO public.contracts (employee_id, establishment_id, type, start_date, weekly_hours, hourly_rate, job_title, paid_leave_days, created_by) VALUES
    (v_marie_id,  v_est_id, 'CDI 35h', '2025-11-27', 35, 12.50, 'Serveuse',      25, v_mgr_id),
    (v_thomas_id, v_est_id, 'CDI 35h', '2025-11-27', 35, 14.00, 'Cuisinier',     25, v_mgr_id),
    (v_sophie_id, v_est_id, 'CDI 28h', '2025-11-27', 28, 12.50, 'Serveuse',      25, v_mgr_id),
    (v_lucas_id,  v_est_id, 'CDD',     '2025-11-27', 35, 11.88, 'Plongeur',      25, v_mgr_id),
    (v_emma_id,   v_est_id, 'Extra',   '2025-11-27', 24, 12.50, 'Serveuse Extra',25, v_mgr_id),
    (v_ant_id,    v_est_id, 'CDI 35h', '2025-11-27', 35, 15.00, 'Chef de rang',  25, v_mgr_id);

  UPDATE public.contracts
    SET end_date = '2026-08-24', cdd_reason = 'Renfort saisonnier'
  WHERE employee_id = v_lucas_id AND establishment_id = v_est_id;

  RAISE NOTICE '✅ Contrats créés';

  -- ── 6. Shifts (boucle sur les semaines) ───────────────────────────────────
  FOREACH v_week IN ARRAY v_weeks LOOP
    DECLARE v_status TEXT := CASE WHEN v_week >= '2026-06-01' THEN 'draft' ELSE 'published' END;
    BEGIN
      -- MARIE : Mar Wed Jeu Ven Sam
      INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, position, poste_id, status) VALUES
        (v_marie_id, v_est_id, v_week+1, '10:00', '15:30',  0, 'Serveur/Serveuse', v_p_serv, v_status),
        (v_marie_id, v_est_id, v_week+2, '10:00', '15:30',  0, 'Serveur/Serveuse', v_p_serv, v_status),
        (v_marie_id, v_est_id, v_week+3, '18:00', '23:00',  0, 'Serveur/Serveuse', v_p_serv, v_status),
        (v_marie_id, v_est_id, v_week+4, '18:00', '23:30', 30, 'Serveur/Serveuse', v_p_serv, v_status),
        (v_marie_id, v_est_id, v_week+5, '10:00', '23:30', 60, 'Serveur/Serveuse', v_p_serv, v_status);

      -- THOMAS : Mar Mer Jeu Ven Sam Dim
      INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, position, poste_id, status) VALUES
        (v_thomas_id, v_est_id, v_week+1, '08:00', '15:00', 30, 'Cuisinier', v_p_cuis, v_status),
        (v_thomas_id, v_est_id, v_week+2, '08:00', '15:00', 30, 'Cuisinier', v_p_cuis, v_status),
        (v_thomas_id, v_est_id, v_week+3, '08:00', '23:00', 60, 'Cuisinier', v_p_cuis, v_status),
        (v_thomas_id, v_est_id, v_week+4, '08:00', '23:30', 60, 'Cuisinier', v_p_cuis, v_status),
        (v_thomas_id, v_est_id, v_week+5, '08:00', '23:30', 60, 'Cuisinier', v_p_cuis, v_status),
        (v_thomas_id, v_est_id, v_week+6, '08:00', '15:00', 30, 'Cuisinier', v_p_cuis, v_status);

      -- SOPHIE : (absente semaine maladie 04/05)
      IF v_week != '2026-05-04'::DATE THEN
        INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, position, poste_id, status) VALUES
          (v_sophie_id, v_est_id, v_week+1, '10:00', '15:00', 0, 'Serveur/Serveuse', v_p_serv, v_status),
          (v_sophie_id, v_est_id, v_week+4, '10:00', '15:00', 0, 'Serveur/Serveuse', v_p_serv, v_status),
          (v_sophie_id, v_est_id, v_week+5, '10:00', '15:30', 0, 'Serveur/Serveuse', v_p_serv, v_status),
          (v_sophie_id, v_est_id, v_week+6, '10:00', '15:30', 0, 'Serveur/Serveuse', v_p_serv, v_status);
      END IF;

      -- LUCAS : Mer Jeu Ven Sam Dim
      INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, position, poste_id, status) VALUES
        (v_lucas_id, v_est_id, v_week+2, '10:00', '15:30',  0, 'Plongeur', v_p_plon, v_status),
        (v_lucas_id, v_est_id, v_week+3, '10:00', '22:00', 60, 'Plongeur', v_p_plon, v_status),
        (v_lucas_id, v_est_id, v_week+4, '18:00', '23:30',  0, 'Plongeur', v_p_plon, v_status),
        (v_lucas_id, v_est_id, v_week+5, '10:00', '23:30', 60, 'Plongeur', v_p_plon, v_status),
        (v_lucas_id, v_est_id, v_week+6, '10:00', '16:00', 30, 'Plongeur', v_p_plon, v_status);

      -- EMMA : Ven Sam Dim
      INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, position, poste_id, status) VALUES
        (v_emma_id, v_est_id, v_week+4, '18:00', '23:30', 0, 'Serveur/Serveuse', v_p_serv, v_status),
        (v_emma_id, v_est_id, v_week+5, '18:00', '23:30', 0, 'Serveur/Serveuse', v_p_serv, v_status),
        (v_emma_id, v_est_id, v_week+6, '10:00', '15:30', 0, 'Serveur/Serveuse', v_p_serv, v_status);

      -- ANTOINE : Mar Mer Jeu Ven Sam Dim
      INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, position, poste_id, status) VALUES
        (v_ant_id, v_est_id, v_week+1, '10:00', '15:00',  0, 'Chef de rang', v_p_chef, v_status),
        (v_ant_id, v_est_id, v_week+2, '10:00', '15:00',  0, 'Chef de rang', v_p_chef, v_status),
        (v_ant_id, v_est_id, v_week+3, '18:00', '23:30',  0, 'Chef de rang', v_p_chef, v_status),
        (v_ant_id, v_est_id, v_week+4, '10:00', '23:30', 60, 'Chef de rang', v_p_chef, v_status),
        (v_ant_id, v_est_id, v_week+5, '10:00', '23:30', 60, 'Chef de rang', v_p_chef, v_status),
        (v_ant_id, v_est_id, v_week+6, '18:00', '23:30',  0, 'Chef de rang', v_p_chef, v_status);
    END;
  END LOOP;

  RAISE NOTICE '✅ Shifts créés';

  -- ── 7. Statut des semaines ────────────────────────────────────────────────
  INSERT INTO public.week_status (week_monday, establishment_id, published, locked, published_at)
  VALUES
    ('2026-04-27', v_est_id, true,  false, '2026-04-26 10:00:00+00'),
    ('2026-05-04', v_est_id, true,  false, '2026-05-03 10:00:00+00'),
    ('2026-05-11', v_est_id, true,  false, '2026-05-10 10:00:00+00'),
    ('2026-05-18', v_est_id, true,  false, '2026-05-17 10:00:00+00'),
    ('2026-05-25', v_est_id, true,  false, '2026-05-24 10:00:00+00'),
    ('2026-06-01', v_est_id, false, false, NULL)
  ON CONFLICT (week_monday, establishment_id) DO UPDATE
    SET published = EXCLUDED.published, published_at = EXCLUDED.published_at;

  -- ── 8. Présences (shifts passés uniquement) ───────────────────────────────
  FOR r IN
    SELECT id, employee_id, date, start_time, end_time, break_minutes
    FROM   public.shifts
    WHERE  establishment_id = v_est_id
      AND  status = 'published'
      AND  date < '2026-05-26'
    ORDER  BY date, employee_id
  LOOP
    -- Déjà présent ? (contrainte UNIQUE employee_id+date)
    IF EXISTS (SELECT 1 FROM public.presences WHERE employee_id = r.employee_id AND date = r.date) THEN
      CONTINUE;
    END IF;

    -- ~5 % d'absences aléatoires (basé sur les bits du UUID)
    IF (('x' || left(r.id::text, 8))::bit(32)::int % 20) = 0 THEN CONTINUE; END IF;

    v_late_min := 0;

    -- Emma : 6 retards sur ses vendredis/samedis
    IF r.employee_id = v_emma_id
       AND v_emma_late < 6
       AND extract(dow FROM r.date) IN (5, 6) THEN
      v_late_min      := 15 + v_emma_late * 3;
      v_emma_late     := v_emma_late + 1;
      INSERT INTO public.lateness_records
        (employee_id, establishment_id, date, scheduled_time, actual_time, late_minutes, justified, notes)
      VALUES (
        r.employee_id, v_est_id, r.date, r.start_time,
        (r.date::timestamp + r.start_time + make_interval(mins => v_late_min))::timestamptz,
        v_late_min,
        v_emma_late > 4,
        CASE WHEN v_emma_late > 4 THEN 'Problème de transports en commun' ELSE NULL END
      );
    END IF;

    -- Lucas : 3 retards sur ses mercredis
    IF r.employee_id = v_lucas_id
       AND v_lucas_late < 3
       AND extract(dow FROM r.date) = 3 THEN
      v_late_min       := 20 + v_lucas_late * 5;
      v_lucas_late     := v_lucas_late + 1;
      INSERT INTO public.lateness_records
        (employee_id, establishment_id, date, scheduled_time, actual_time, late_minutes, justified)
      VALUES (
        r.employee_id, v_est_id, r.date, r.start_time,
        (r.date::timestamp + r.start_time + make_interval(mins => v_late_min))::timestamptz,
        v_late_min, false
      );
    END IF;

    -- Clock-in
    DECLARE
      v_ci_offset INT := CASE WHEN v_late_min > 0 THEN v_late_min ELSE (floor(random()*8) - 2)::int END;
      v_co_offset INT := (floor(random()*10) - 3)::int;
      v_extra_day  INT := CASE WHEN r.end_time < r.start_time THEN 1 ELSE 0 END;
    BEGIN
      INSERT INTO public.presences (employee_id, establishment_id, date, clock_in, clock_out, break_minutes_used)
      VALUES (
        r.employee_id, v_est_id, r.date,
        (r.date::timestamp + r.start_time + make_interval(mins => v_ci_offset))::timestamptz,
        (r.date::timestamp + make_interval(days => v_extra_day) + r.end_time + make_interval(mins => v_co_offset))::timestamptz,
        GREATEST(0, r.break_minutes)
      );
    END;
  END LOOP;

  RAISE NOTICE '✅ Présences créées (Emma % retards, Lucas % retards)', v_emma_late, v_lucas_late;

  -- ── 9. Demandes de congés ─────────────────────────────────────────────────
  INSERT INTO public.leave_requests (employee_id, establishment_id, start_date, end_date, type, comment, status, manager_comment)
  VALUES
    (v_marie_id,  v_est_id, '2026-05-08', '2026-05-10', 'CP',        'Congés de printemps',                 'approved', 'Bonne recharge !'),
    (v_thomas_id, v_est_id, '2026-06-02', '2026-06-03', 'RTT',       'Récupération heures supp.',           'pending',  NULL),
    (v_sophie_id, v_est_id, '2026-05-04', '2026-05-10', 'maladie',   'Arrêt médical délivré le 04/05',      'approved', 'Bon rétablissement Sophie'),
    (v_emma_id,   v_est_id, '2026-05-21', '2026-05-23', 'CP',        'Week-end prolongé',                   'rejected', 'Effectifs insuffisants ce week-end'),
    (v_ant_id,    v_est_id, '2026-06-09', '2026-06-11', 'sans_solde','Voyage prévu de longue date',         'pending',  NULL),
    (v_lucas_id,  v_est_id, '2026-06-04', '2026-06-05', 'CP',        '',                                    'approved', NULL);

  -- ── 10. Slot Marketplace (shift Emma vendredi semaine prochaine) ──────────
  SELECT id INTO v_sid
  FROM public.shifts
  WHERE employee_id = v_emma_id AND establishment_id = v_est_id AND date >= '2026-06-01'
  ORDER BY date LIMIT 1;

  IF v_sid IS NOT NULL THEN
    INSERT INTO public.marketplace_slots (shift_id, establishment_id, created_by, reason, expires_at, status)
    VALUES (v_sid, v_est_id, v_mgr_id, 'Absence imprévue — renfort recherché', now() + interval '20 hours', 'open');
  END IF;

  -- ── 11. Échange de shift (Marie propose à Sophie) ─────────────────────────
  SELECT id INTO v_sid
  FROM public.shifts
  WHERE employee_id = v_marie_id AND establishment_id = v_est_id AND date >= '2026-06-01'
  ORDER BY date LIMIT 1;

  IF v_sid IS NOT NULL THEN
    INSERT INTO public.shift_exchanges (shift_id, proposer_id, acceptor_id, status, proposer_note)
    VALUES (v_sid, v_marie_id, v_sophie_id, 'pending_approval',
            'Rendez-vous médical ce jour-là, Sophie peut-elle me remplacer ?');
  END IF;

  -- ── Résumé ────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉  Seed Nexus terminé avec succès !';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE 'Mot de passe universel : Demo2024!';
  RAISE NOTICE '';
  RAISE NOTICE '👔  manager@nexus-demo.fr';
  RAISE NOTICE '👤  marie.dupont@nexus-demo.fr';
  RAISE NOTICE '👤  thomas.martin@nexus-demo.fr';
  RAISE NOTICE '👤  sophie.bernard@nexus-demo.fr';
  RAISE NOTICE '👤  lucas.petit@nexus-demo.fr';
  RAISE NOTICE '👤  emma.rousseau@nexus-demo.fr';
  RAISE NOTICE '👤  antoine.moreau@nexus-demo.fr';
  RAISE NOTICE '══════════════════════════════════════════════════════';

END;
$$;
