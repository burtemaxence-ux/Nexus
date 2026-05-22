-- Suivi du temps de pause cumulé par journée
ALTER TABLE presences ADD COLUMN IF NOT EXISTS break_minutes_used integer NOT NULL DEFAULT 0;

-- Table de réglages généraux du restaurant
CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Durée de pause autorisée par défaut : 30 minutes
INSERT INTO settings (key, value) VALUES ('break_minutes_limit', '30') ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_read_all" ON settings
  FOR SELECT USING (true);

CREATE POLICY "settings_manager_write" ON settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );
