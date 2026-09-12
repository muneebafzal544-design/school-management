-- Migration 099: At-risk student intervention log
CREATE TABLE IF NOT EXISTS risk_interventions (
  id           SERIAL PRIMARY KEY,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  contact_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  method       VARCHAR(50) NOT NULL DEFAULT 'call'
               CHECK (method IN ('call','meeting','whatsapp','email','home_visit','other')),
  contacted_by VARCHAR(100),
  notes        TEXT NOT NULL,
  outcome      VARCHAR(100),
  follow_up    DATE,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_interventions_student
  ON risk_interventions(student_id, contact_date DESC);
