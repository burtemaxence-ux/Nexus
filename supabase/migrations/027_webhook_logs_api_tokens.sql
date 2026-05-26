-- ── Webhook delivery logs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid       NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  event           text        NOT NULL,
  target          text        NOT NULL DEFAULT 'webhook', -- 'webhook' | 'slack'
  url             text        NOT NULL,
  status_code     integer,
  success         boolean     NOT NULL DEFAULT false,
  duration_ms     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_logs_est_created
  ON webhook_logs(establishment_id, created_at DESC);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers view own logs" ON webhook_logs
  FOR SELECT USING (establishment_id = current_establishment_id());

CREATE POLICY "service insert logs" ON webhook_logs
  FOR INSERT WITH CHECK (true);

-- ── API tokens (read-only access keys) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_tokens (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid        NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  token_hash       text        NOT NULL UNIQUE,
  last_used_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_tokens_est ON api_tokens(establishment_id);

ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers manage tokens" ON api_tokens
  FOR ALL USING (
    establishment_id = current_establishment_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor')
    )
  );

-- Service role bypass for token validation
CREATE POLICY "service select tokens" ON api_tokens
  FOR SELECT USING (true);
