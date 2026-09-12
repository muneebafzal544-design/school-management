CREATE TABLE IF NOT EXISTS student_vaccinations (
  id             SERIAL        PRIMARY KEY,
  student_id     INT           NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  vaccine_name   VARCHAR(150)  NOT NULL,
  dose_number    SMALLINT      NOT NULL DEFAULT 1,
  date_given     DATE          NOT NULL,
  given_by       VARCHAR(100),
  next_due_date  DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vaccinations_student ON student_vaccinations(student_id);

CREATE TABLE IF NOT EXISTS student_medical_visits (
  id            SERIAL        PRIMARY KEY,
  student_id    INT           NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  visit_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
  complaint     TEXT          NOT NULL,
  action_taken  TEXT,
  referred_to   VARCHAR(200),
  recorded_by   VARCHAR(100),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medical_visits_student ON student_medical_visits(student_id);
CREATE INDEX IF NOT EXISTS idx_medical_visits_date    ON student_medical_visits(visit_date DESC);
