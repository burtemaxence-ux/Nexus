-- ── Employee documents table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_documents (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  establishment_id UUID      NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  file_path      TEXT        NOT NULL,
  file_size      INTEGER     NOT NULL DEFAULT 0,
  mime_type      TEXT        NOT NULL DEFAULT 'application/octet-stream',
  document_type  TEXT        NOT NULL DEFAULT 'other',
  uploaded_by    UUID        REFERENCES profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_establishment ON employee_documents(establishment_id);

-- RLS
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "managers_access_documents" ON employee_documents;
CREATE POLICY "managers_access_documents" ON employee_documents
  FOR ALL TO authenticated
  USING (
    establishment_id = (
      SELECT establishment_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    establishment_id = (
      SELECT establishment_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- ── Storage bucket (run once in Supabase dashboard if not exists) ─────────────
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('employee-documents', 'employee-documents', false, 20971520, null)
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies (create via Supabase dashboard or run manually)
-- Policy: authenticated users can upload/read/delete files in their establishment's folder
