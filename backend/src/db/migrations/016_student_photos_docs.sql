ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

CREATE TABLE IF NOT EXISTS student_documents (
  id         SERIAL PRIMARY KEY,
  student_id INT          NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  file_url   VARCHAR(500) NOT NULL,
  doc_type   VARCHAR(50)  NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_docs_student ON student_documents(student_id);
