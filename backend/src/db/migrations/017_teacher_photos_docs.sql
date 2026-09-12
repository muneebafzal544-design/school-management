ALTER TABLE teachers ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

CREATE TABLE IF NOT EXISTS teacher_documents (
  id         SERIAL PRIMARY KEY,
  teacher_id INT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  file_url   VARCHAR(500) NOT NULL,
  doc_type   VARCHAR(50)  NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
