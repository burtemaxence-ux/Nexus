-- ============================================================
-- 016 — Default settings rows
-- Inserts only if the key doesn't already exist (ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO public.settings (key, value) VALUES
  ('establishment_name',  'Mon établissement'),
  ('collective_agreement', 'HCR'),
  ('opening_time',        '07:00'),
  ('closing_time',        '23:00'),
  ('automation_rules', json_build_object(
    'email_employee_planning',    true,
    'email_employee_leave',       true,
    'sync_leave_planning',        true,
    'auto_justify_late_on_leave', false,
    'alert_cdd_expiry',           true
  )::text)
ON CONFLICT (key) DO NOTHING;
