ALTER TABLE students ADD COLUMN IF NOT EXISTS graduation_year INT;

CREATE TABLE IF NOT EXISTS alumni (
  id               SERIAL        PRIMARY KEY,
  student_id       INT           NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  graduation_year  INT           NOT NULL,
  batch_label      VARCHAR(20)   NOT NULL,
  final_class      VARCHAR(100),
  university       VARCHAR(300),
  program          VARCHAR(200),
  university_year  INT,
  current_city     VARCHAR(100),
  current_country  VARCHAR(100)  NOT NULL DEFAULT 'Pakistan',
  contact_email    VARCHAR(200),
  contact_phone    VARCHAR(30),
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alumni_grad_year ON alumni(graduation_year);
CREATE INDEX IF NOT EXISTS idx_alumni_batch     ON alumni(batch_label);
