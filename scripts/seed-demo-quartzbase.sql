-- ============================================================
-- Quartzbase — Seed démo : La Boulangerie du Soleil
-- Instructions :
--   1. Supabase → SQL Editor → New query
--   2. Coller tout ce fichier → Run
--   3. Copier le DEMO_ESTABLISHMENT_ID affiché dans les logs
--
-- Comptes créés :
--   👔  demo@quartzbase.fr          — Claire Fontaine (manager)
--   👤  alice.martin@demo.qb.fr     — Boulangère CDI 35h
--   👤  benoit.dupont@demo.qb.fr    — Boulanger CDI 35h
--   👤  camille.bernard@demo.qb.fr  — Pâtissière CDI 28h
--   👤  david.moreau@demo.qb.fr     — Pâtissier CDD
--   👤  elise.petit@demo.qb.fr      — Vendeuse CDI 35h
--   👤  francois.simon@demo.qb.fr   — Vendeur CDI 28h
--   👤  grace.lambert@demo.qb.fr    — Vendeuse Extra
--   👤  hugo.leroy@demo.qb.fr       — Responsable CDI 39h
-- ============================================================

DO $$
DECLARE
  -- UUIDs fixes (idempotence : même UUID = même compte à chaque re-seed)
  v_mgr_id      UUID := 'c4000000-0000-0000-0000-000000000001';
  v_alice_id    UUID := 'c4000000-0000-0000-0000-000000000002';
  v_benoit_id   UUID := 'c4000000-0000-0000-0000-000000000003';
  v_camille_id  UUID := 'c4000000-0000-0000-0000-000000000004';
  v_david_id    UUID := 'c4000000-0000-0000-0000-000000000005';
  v_elise_id    UUID := 'c4000000-0000-0000-0000-000000000006';
  v_francois_id UUID := 'c4000000-0000-0000-0000-000000000007';
  v_grace_id    UUID := 'c4000000-0000-0000-0000-000000000008';
  v_hugo_id     UUID := 'c4000000-0000-0000-0000-000000000009';

  v_est_id UUID;
  v_p_boul UUID;
  v_p_pati UUID;
  v_p_vend UUID;
  v_p_resp UUID;

  -- Hash bcrypt de Demo2024! — le login démo utilise un magic link, pas le mot de passe
  v_pwd TEXT := '$2b$10$DRYzhLWjG85vcB8scfXZNOYkYgbfboz57JtzTNMgi1bZzMHP46Hxu';

  v_mon0 DATE; -- lundi semaine en cours
  v_mon1 DATE; -- lundi semaine -1
  v_mon2 DATE; -- lundi semaine -2
  v_mon3 DATE; -- lundi semaine -3

  v_all_ids UUID[];
  v_week    DATE;
  v_weeks   DATE[];

BEGIN

  -- ── Calcul des semaines ───────────────────────────────────────────────────────
  v_mon0 := date_trunc('week', CURRENT_DATE)::date;
  v_mon1 := v_mon0 - 7;
  v_mon2 := v_mon0 - 14;
  v_mon3 := v_mon0 - 21;

  v_all_ids := ARRAY[
    v_mgr_id, v_alice_id, v_benoit_id, v_camille_id,
    v_david_id, v_elise_id, v_francois_id, v_grace_id, v_hugo_id
  ];

  -- ── 1. Nettoyage (ordre FK : enfants avant parents) ──────────────────────────
  -- Trouver l'établissement existant du manager demo (si déjà seedé)
  SELECT establishment_id INTO v_est_id FROM public.profiles WHERE id = v_mgr_id;

  IF v_est_id IS NOT NULL THEN
    DELETE FROM public.notifications       WHERE establishment_id = v_est_id;
    DELETE FROM public.compliance_alerts   WHERE establishment_id = v_est_id;
    DELETE FROM public.lateness_records    WHERE establishment_id = v_est_id;
    DELETE FROM public.replacement_requests WHERE establishment_id = v_est_id;
    DELETE FROM public.presences           WHERE establishment_id = v_est_id;
    DELETE FROM public.leave_requests      WHERE establishment_id = v_est_id;
    DELETE FROM public.contracts           WHERE establishment_id = v_est_id;
    DELETE FROM public.shifts              WHERE establishment_id = v_est_id;
    DELETE FROM public.postes              WHERE establishment_id = v_est_id;
    DELETE FROM public.settings            WHERE establishment_id = v_est_id;
  END IF;

  DELETE FROM public.profiles    WHERE id = ANY(v_all_ids);
  DELETE FROM public.establishments WHERE owner_id = v_mgr_id;
  DELETE FROM auth.identities    WHERE user_id = ANY(v_all_ids);
  DELETE FROM auth.users         WHERE id = ANY(v_all_ids);

  -- Nettoyage par email (cas où UUIDs différents d'un run précédent)
  DELETE FROM auth.identities WHERE user_id IN (
    SELECT id FROM auth.users
    WHERE email = 'demo@quartzbase.fr' OR email LIKE '%@demo.qb.fr'
  );
  DELETE FROM auth.users
    WHERE email = 'demo@quartzbase.fr' OR email LIKE '%@demo.qb.fr';

  v_est_id := NULL;
  RAISE NOTICE '✅ Nettoyage effectué';

  -- ── 2. Manager ───────────────────────────────────────────────────────────────
  -- Le trigger handle_new_user crée automatiquement : établissement + profil
  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) VALUES (
    v_mgr_id, 'authenticated', 'authenticated',
    'demo@quartzbase.fr', v_pwd, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Claire Fontaine","role":"manager"}'::jsonb,
    now(), now(), false, false
  );

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_mgr_id, 'demo@quartzbase.fr',
    jsonb_build_object('sub', v_mgr_id::text, 'email', 'demo@quartzbase.fr', 'email_verified', true, 'phone_verified', false),
    'email', now(), now()
  );

  SELECT establishment_id INTO v_est_id FROM public.profiles WHERE id = v_mgr_id;
  IF v_est_id IS NULL THEN
    RAISE EXCEPTION 'Le trigger handle_new_user n''a pas créé le profil manager — vérifier migration 022';
  END IF;

  UPDATE public.profiles SET
    full_name = 'Claire Fontaine', first_name = 'Claire', last_name = 'Fontaine',
    phone = '06 11 22 33 44', position = 'Directrice',
    contract_type = 'CDI 35h', weekly_hours = 35
  WHERE id = v_mgr_id;

  UPDATE public.establishments SET name = 'La Boulangerie du Soleil' WHERE id = v_est_id;

  INSERT INTO public.settings (key, value, establishment_id) VALUES
    ('establishment_name',   'La Boulangerie du Soleil',          v_est_id),
    ('opening_time',         '06:00',                             v_est_id),
    ('closing_time',         '20:00',                             v_est_id),
    ('break_minutes_limit',  '30',                                v_est_id),
    ('collective_agreement', 'Boulangerie-Pâtisserie artisanale', v_est_id)
  ON CONFLICT (key, establishment_id) DO UPDATE SET value = EXCLUDED.value;

  RAISE NOTICE '✅ Manager créé — estId: %', v_est_id;

  -- ── 3. Employés ──────────────────────────────────────────────────────────────
  INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous) VALUES
    (v_alice_id,    'authenticated','authenticated','alice.martin@demo.qb.fr',    v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','Alice Martin',    'role','employee','establishment_id',v_est_id::text), now(), now(), false, false),
    (v_benoit_id,   'authenticated','authenticated','benoit.dupont@demo.qb.fr',   v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','Benoît Dupont',   'role','employee','establishment_id',v_est_id::text), now(), now(), false, false),
    (v_camille_id,  'authenticated','authenticated','camille.bernard@demo.qb.fr', v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','Camille Bernard', 'role','employee','establishment_id',v_est_id::text), now(), now(), false, false),
    (v_david_id,    'authenticated','authenticated','david.moreau@demo.qb.fr',    v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','David Moreau',    'role','employee','establishment_id',v_est_id::text), now(), now(), false, false),
    (v_elise_id,    'authenticated','authenticated','elise.petit@demo.qb.fr',     v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','Élise Petit',     'role','employee','establishment_id',v_est_id::text), now(), now(), false, false),
    (v_francois_id, 'authenticated','authenticated','francois.simon@demo.qb.fr',  v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','François Simon',  'role','employee','establishment_id',v_est_id::text), now(), now(), false, false),
    (v_grace_id,    'authenticated','authenticated','grace.lambert@demo.qb.fr',   v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','Grace Lambert',   'role','employee','establishment_id',v_est_id::text), now(), now(), false, false),
    (v_hugo_id,     'authenticated','authenticated','hugo.leroy@demo.qb.fr',      v_pwd, now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name','Hugo Leroy',      'role','employee','establishment_id',v_est_id::text), now(), now(), false, false);

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at) VALUES
    (gen_random_uuid(), v_alice_id,    'alice.martin@demo.qb.fr',    jsonb_build_object('sub',v_alice_id::text,    'email','alice.martin@demo.qb.fr',    'email_verified',true,'phone_verified',false), 'email', now(), now()),
    (gen_random_uuid(), v_benoit_id,   'benoit.dupont@demo.qb.fr',   jsonb_build_object('sub',v_benoit_id::text,   'email','benoit.dupont@demo.qb.fr',   'email_verified',true,'phone_verified',false), 'email', now(), now()),
    (gen_random_uuid(), v_camille_id,  'camille.bernard@demo.qb.fr', jsonb_build_object('sub',v_camille_id::text,  'email','camille.bernard@demo.qb.fr', 'email_verified',true,'phone_verified',false), 'email', now(), now()),
    (gen_random_uuid(), v_david_id,    'david.moreau@demo.qb.fr',    jsonb_build_object('sub',v_david_id::text,    'email','david.moreau@demo.qb.fr',    'email_verified',true,'phone_verified',false), 'email', now(), now()),
    (gen_random_uuid(), v_elise_id,    'elise.petit@demo.qb.fr',     jsonb_build_object('sub',v_elise_id::text,    'email','elise.petit@demo.qb.fr',     'email_verified',true,'phone_verified',false), 'email', now(), now()),
    (gen_random_uuid(), v_francois_id, 'francois.simon@demo.qb.fr',  jsonb_build_object('sub',v_francois_id::text, 'email','francois.simon@demo.qb.fr',  'email_verified',true,'phone_verified',false), 'email', now(), now()),
    (gen_random_uuid(), v_grace_id,    'grace.lambert@demo.qb.fr',   jsonb_build_object('sub',v_grace_id::text,    'email','grace.lambert@demo.qb.fr',   'email_verified',true,'phone_verified',false), 'email', now(), now()),
    (gen_random_uuid(), v_hugo_id,     'hugo.leroy@demo.qb.fr',      jsonb_build_object('sub',v_hugo_id::text,     'email','hugo.leroy@demo.qb.fr',      'email_verified',true,'phone_verified',false), 'email', now(), now());

  UPDATE public.profiles SET full_name='Alice Martin',    first_name='Alice',    last_name='Martin',    phone='06 21 32 43 54', position='Boulanger',    contract_type='CDI 35h', weekly_hours=35, establishment_id=v_est_id WHERE id=v_alice_id;
  UPDATE public.profiles SET full_name='Benoît Dupont',   first_name='Benoît',   last_name='Dupont',    phone='06 32 43 54 65', position='Boulanger',    contract_type='CDI 35h', weekly_hours=35, establishment_id=v_est_id WHERE id=v_benoit_id;
  UPDATE public.profiles SET full_name='Camille Bernard', first_name='Camille',  last_name='Bernard',   phone='06 43 54 65 76', position='Pâtissier',   contract_type='CDI 28h', weekly_hours=28, establishment_id=v_est_id WHERE id=v_camille_id;
  UPDATE public.profiles SET full_name='David Moreau',    first_name='David',    last_name='Moreau',    phone='06 54 65 76 87', position='Pâtissier',   contract_type='CDD',     weekly_hours=35, establishment_id=v_est_id WHERE id=v_david_id;
  UPDATE public.profiles SET full_name='Élise Petit',     first_name='Élise',    last_name='Petit',     phone='06 65 76 87 98', position='Vendeur',     contract_type='CDI 35h', weekly_hours=35, establishment_id=v_est_id WHERE id=v_elise_id;
  UPDATE public.profiles SET full_name='François Simon',  first_name='François', last_name='Simon',     phone='06 76 87 98 09', position='Vendeur',     contract_type='CDI 28h', weekly_hours=28, establishment_id=v_est_id WHERE id=v_francois_id;
  UPDATE public.profiles SET full_name='Grace Lambert',   first_name='Grace',    last_name='Lambert',   phone='06 87 98 09 10', position='Vendeur',     contract_type='Extra',   weekly_hours=24, establishment_id=v_est_id WHERE id=v_grace_id;
  UPDATE public.profiles SET full_name='Hugo Leroy',      first_name='Hugo',     last_name='Leroy',     phone='06 98 09 10 21', position='Responsable', contract_type='CDI 35h', weekly_hours=39, establishment_id=v_est_id WHERE id=v_hugo_id;

  RAISE NOTICE '✅ 8 employés créés';

  -- ── 4. Postes ─────────────────────────────────────────────────────────────────
  INSERT INTO public.postes (name, color, break_minutes, hourly_cost, max_hours_per_day, max_hours_per_week, establishment_id)
    VALUES ('Boulanger',    '#F59E0B', 30, 13.50, 10, 48, v_est_id) RETURNING id INTO v_p_boul;
  INSERT INTO public.postes (name, color, break_minutes, hourly_cost, max_hours_per_day, max_hours_per_week, establishment_id)
    VALUES ('Pâtissier',   '#EC4899', 30, 14.00, 10, 48, v_est_id) RETURNING id INTO v_p_pati;
  INSERT INTO public.postes (name, color, break_minutes, hourly_cost, max_hours_per_day, max_hours_per_week, establishment_id)
    VALUES ('Vendeur',     '#3B82F6', 20, 12.00,  8, 35, v_est_id) RETURNING id INTO v_p_vend;
  INSERT INTO public.postes (name, color, break_minutes, hourly_cost, max_hours_per_day, max_hours_per_week, establishment_id)
    VALUES ('Responsable', '#059669', 30, 16.00, 10, 48, v_est_id) RETURNING id INTO v_p_resp;

  RAISE NOTICE '✅ 4 postes créés';

  -- ── 5. Contrats ───────────────────────────────────────────────────────────────
  INSERT INTO public.contracts (employee_id, establishment_id, type, start_date, end_date, weekly_hours, hourly_rate, trial_period_days) VALUES
    (v_alice_id,    v_est_id, 'CDI 35h', CURRENT_DATE - 90, NULL,                 35, 13.50, 60),
    (v_benoit_id,   v_est_id, 'CDI 35h', CURRENT_DATE - 90, NULL,                 35, 13.50, 60),
    (v_camille_id,  v_est_id, 'CDI 28h', CURRENT_DATE - 90, NULL,                 28, 14.00, 60),
    (v_david_id,    v_est_id, 'CDD',     CURRENT_DATE - 90, CURRENT_DATE + 45,    35, 14.00, NULL),
    (v_elise_id,    v_est_id, 'CDI 35h', CURRENT_DATE - 90, NULL,                 35, 12.00, 60),
    (v_francois_id, v_est_id, 'CDI 28h', CURRENT_DATE - 90, NULL,                 28, 12.00, 60),
    (v_grace_id,    v_est_id, 'Extra',   CURRENT_DATE - 90, NULL,                 24, 12.00, NULL),
    (v_hugo_id,     v_est_id, 'CDI 35h', CURRENT_DATE - 90, NULL,                 39, 16.00, 60);

  RAISE NOTICE '✅ 8 contrats créés';

  -- ── 6. Shifts — 4 semaines (sem. en cours + 3 semaines passées) ───────────────
  -- Patterns boulangerie réalistes (cf. seed-demo.ts)
  v_weeks := ARRAY[v_mon3, v_mon2, v_mon1, v_mon0];

  FOREACH v_week IN ARRAY v_weeks LOOP
    -- Alice Martin : Lun(+0) Mar(+1) Mer(+2) Ven(+4) Sam(+5) — 04:00-12:00 Boulanger
    INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, poste_id, status) VALUES
      (v_alice_id, v_est_id, v_week+0, '04:00','12:00', 30, v_p_boul, 'published'),
      (v_alice_id, v_est_id, v_week+1, '04:00','12:00', 30, v_p_boul, 'published'),
      (v_alice_id, v_est_id, v_week+2, '04:00','12:00', 30, v_p_boul, 'published'),
      (v_alice_id, v_est_id, v_week+4, '04:00','12:00', 30, v_p_boul, 'published'),
      (v_alice_id, v_est_id, v_week+5, '04:00','12:00', 30, v_p_boul, 'published');
    -- Benoît Dupont : Lun Mar Jeu(+3) Ven Dim(+6) — 05:00-13:00 Boulanger
    INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, poste_id, status) VALUES
      (v_benoit_id, v_est_id, v_week+0, '05:00','13:00', 30, v_p_boul, 'published'),
      (v_benoit_id, v_est_id, v_week+1, '05:00','13:00', 30, v_p_boul, 'published'),
      (v_benoit_id, v_est_id, v_week+3, '05:00','13:00', 30, v_p_boul, 'published'),
      (v_benoit_id, v_est_id, v_week+4, '05:00','13:00', 30, v_p_boul, 'published'),
      (v_benoit_id, v_est_id, v_week+6, '05:00','13:00', 30, v_p_boul, 'published');
    -- Camille Bernard : Mar Mer Ven Sam — 06:00-13:00 (Sam 06:00-14:00) Pâtissier
    INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, poste_id, status) VALUES
      (v_camille_id, v_est_id, v_week+1, '06:00','13:00', 30, v_p_pati, 'published'),
      (v_camille_id, v_est_id, v_week+2, '06:00','13:00', 30, v_p_pati, 'published'),
      (v_camille_id, v_est_id, v_week+4, '06:00','13:00', 30, v_p_pati, 'published'),
      (v_camille_id, v_est_id, v_week+5, '06:00','14:00', 30, v_p_pati, 'published');
    -- David Moreau : Lun Mer Jeu Sam Dim — 06:00-14:00 Pâtissier
    INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, poste_id, status) VALUES
      (v_david_id, v_est_id, v_week+0, '06:00','14:00', 30, v_p_pati, 'published'),
      (v_david_id, v_est_id, v_week+2, '06:00','14:00', 30, v_p_pati, 'published'),
      (v_david_id, v_est_id, v_week+3, '06:00','14:00', 30, v_p_pati, 'published'),
      (v_david_id, v_est_id, v_week+5, '06:00','14:00', 30, v_p_pati, 'published'),
      (v_david_id, v_est_id, v_week+6, '06:00','14:00', 30, v_p_pati, 'published');
    -- Élise Petit : Lun Mar Mer Jeu Sam — 08:00-16:00 Vendeur
    INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, poste_id, status) VALUES
      (v_elise_id, v_est_id, v_week+0, '08:00','16:00', 30, v_p_vend, 'published'),
      (v_elise_id, v_est_id, v_week+1, '08:00','16:00', 30, v_p_vend, 'published'),
      (v_elise_id, v_est_id, v_week+2, '08:00','16:00', 30, v_p_vend, 'published'),
      (v_elise_id, v_est_id, v_week+3, '08:00','16:00', 30, v_p_vend, 'published'),
      (v_elise_id, v_est_id, v_week+5, '08:00','16:00', 30, v_p_vend, 'published');
    -- François Simon : Mar Jeu Ven 12:00-20:00 | Dim 08:00-14:00 Vendeur
    INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, poste_id, status) VALUES
      (v_francois_id, v_est_id, v_week+1, '12:00','20:00', 30, v_p_vend, 'published'),
      (v_francois_id, v_est_id, v_week+3, '12:00','20:00', 30, v_p_vend, 'published'),
      (v_francois_id, v_est_id, v_week+4, '12:00','20:00', 30, v_p_vend, 'published'),
      (v_francois_id, v_est_id, v_week+6, '08:00','14:00', 20, v_p_vend, 'published');
    -- Grace Lambert : Sam Dim — 08:00-14:00 Vendeur
    INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, poste_id, status) VALUES
      (v_grace_id, v_est_id, v_week+5, '08:00','14:00', 20, v_p_vend, 'published'),
      (v_grace_id, v_est_id, v_week+6, '08:00','14:00', 20, v_p_vend, 'published');
    -- Hugo Leroy : Lun-Ven — 07:00-17:00 Responsable
    INSERT INTO public.shifts (employee_id, establishment_id, date, start_time, end_time, break_minutes, poste_id, status) VALUES
      (v_hugo_id, v_est_id, v_week+0, '07:00','17:00', 60, v_p_resp, 'published'),
      (v_hugo_id, v_est_id, v_week+1, '07:00','17:00', 60, v_p_resp, 'published'),
      (v_hugo_id, v_est_id, v_week+2, '07:00','17:00', 60, v_p_resp, 'published'),
      (v_hugo_id, v_est_id, v_week+3, '07:00','17:00', 60, v_p_resp, 'published'),
      (v_hugo_id, v_est_id, v_week+4, '07:00','17:00', 60, v_p_resp, 'published');
  END LOOP;

  RAISE NOTICE '✅ Shifts créés (4 semaines)';

  -- ── 7. Congés ─────────────────────────────────────────────────────────────────
  INSERT INTO public.leave_requests (employee_id, establishment_id, type, start_date, end_date, status) VALUES
    (v_alice_id, v_est_id, 'CP', CURRENT_DATE + 14, CURRENT_DATE + 21, 'pending'),
    (v_elise_id, v_est_id, 'CP', CURRENT_DATE - 10, CURRENT_DATE - 7,  'approved');

  RAISE NOTICE '✅ 2 congés créés';

  -- ── 8. Alertes conformité ─────────────────────────────────────────────────────
  -- Insertion conditionnelle : la table n'existe pas sur tous les projets
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'compliance_alerts') THEN
    INSERT INTO public.compliance_alerts (establishment_id, employee_id, type, level, title, message, status, options) VALUES
      (v_est_id, v_alice_id, 'hours_exceeded', 'CRITICAL',
       'Dépassement heures — Alice Martin',
       'Alice Martin dépasse régulièrement ses 35h contractuelles depuis 8 semaines. Risque de requalification si la situation persiste.',
       'active', '{"consecutive_weeks":8,"avg_hours":40.5,"contract_hours":35}'::jsonb),
      (v_est_id, v_david_id, 'cdd_ending', 'WARNING',
       'Fin de CDD — David Moreau',
       'Le contrat CDD de David Moreau se termine dans 45 jours. Décision de renouvellement à prendre rapidement.',
       'active', '{"days_remaining":45}'::jsonb);
    RAISE NOTICE '✅ 2 alertes conformité créées';
  ELSE
    RAISE NOTICE '⚠️  Table compliance_alerts absente — alertes ignorées';
  END IF;

  -- ── 9. Notifications (5 non lues pour le manager) ────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    INSERT INTO public.notifications (user_id, establishment_id, type, title, body, read, action_url) VALUES
      (v_mgr_id, v_est_id, 'leave_request',    'Nouvelle demande de congés', 'Alice Martin demande des congés.',              false, '/manager/conges'),
      (v_mgr_id, v_est_id, 'compliance_alert', 'Alerte conformité CRITICAL', 'Dépassement heures — Alice Martin.',            false, '/manager/alertes'),
      (v_mgr_id, v_est_id, 'compliance_alert', 'Alerte conformité WARNING',  'CDD David Moreau se termine dans 45 jours.',    false, '/manager/alertes'),
      (v_mgr_id, v_est_id, 'shift_swap',       'Échange de planning',        'Benoît Dupont propose un échange à Grace.',     false, '/manager/echanges'),
      (v_mgr_id, v_est_id, 'system',           'Planning publié',            'Le planning de la semaine a été publié.',       false, '/manager/planning');
    RAISE NOTICE '✅ 5 notifications créées';
  ELSE
    RAISE NOTICE '⚠️  Table notifications absente — notifications ignorées';
  END IF;

  -- ── Résumé ────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉  Seed Quartzbase terminé avec succès !';
  RAISE NOTICE '══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '👉  DEMO_ESTABLISHMENT_ID = %', v_est_id;
  RAISE NOTICE '══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'À copier dans Vercel → Settings → Environment Variables :';
  RAISE NOTICE '  DEMO_USER_EMAIL=demo@quartzbase.fr';
  RAISE NOTICE '  DEMO_ESTABLISHMENT_ID=%', v_est_id;
  RAISE NOTICE '══════════════════════════════════════════════════════════════════';

END;
$$;
