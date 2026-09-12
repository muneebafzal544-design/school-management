-- Migration 070: Student behavior / discipline incidents
CREATE TABLE IF NOT EXISTS discipline_incidents (
  id              SERIAL PRIMARY KEY,
  student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reported_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_type   VARCHAR(50) NOT NULL,
  severity        VARCHAR(10) NOT NULL DEFAULT 'minor'
                  CHECK (severity IN ('minor', 'moderate', 'serious')),
  description     TEXT NOT NULL,
  action_taken    TEXT,
  parent_notified BOOLEAN NOT NULL DEFAULT false,
  follow_up_date  DATE,
  resolved        BOOLEAN NOT NULL DEFAULT false,
  resolved_at     TIMESTAMPTZ,
  resolved_notes  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_discipline_student_id ON discipline_incidents(student_id);
CREATE INDEX IF NOT EXISTS idx_discipline_date        ON discipline_incidents(date DESC);
CREATE INDEX IF NOT EXISTS idx_discipline_severity    ON discipline_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_discipline_resolved    ON discipline_incidents(resolved);
