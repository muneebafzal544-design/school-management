-- Migration 066: Document management
CREATE TABLE IF NOT EXISTS documents (
  id           SERIAL PRIMARY KEY,
  student_id   INTEGER REFERENCES students(id) ON DELETE SET NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  category     VARCHAR(50)  NOT NULL DEFAULT 'general',
  file_url     TEXT,
  file_name    VARCHAR(255),
  file_size    INTEGER,
  mime_type    VARCHAR(100),
  uploaded_by  INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_documents_category   ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
