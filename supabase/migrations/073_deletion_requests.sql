-- Demandes de suppression d'établissement (droit à l'effacement — Art. 17 RGPD).
-- Enregistre la demande côté serveur au lieu de s'en remettre uniquement à un email.
CREATE TABLE IF NOT EXISTS deletion_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid        NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  requested_by     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           text        NOT NULL CHECK (status IN ('pending', 'processing', 'done', 'cancelled')) DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deletion_requests_est ON deletion_requests(establishment_id, created_at DESC);

-- Une seule demande active (pending/processing) par établissement.
CREATE UNIQUE INDEX IF NOT EXISTS deletion_requests_one_active
  ON deletion_requests(establishment_id)
  WHERE status IN ('pending', 'processing');

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- Les managers gèrent (lecture + création) les demandes de leur établissement.
CREATE POLICY "managers manage own deletion requests" ON deletion_requests
  FOR ALL USING (
    establishment_id = current_establishment_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );
