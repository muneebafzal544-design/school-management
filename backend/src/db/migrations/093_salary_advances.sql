-- Migration 093: Salary advance / loan workflow for teachers
CREATE TABLE IF NOT EXISTS salary_advances (
  id                  SERIAL        PRIMARY KEY,
  teacher_id          INTEGER       NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  amount              NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason              TEXT,
  status              VARCHAR(20)   NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','fully_repaid')),
  approved_by         INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ,
  monthly_deduction   NUMERIC(12,2) NOT NULL DEFAULT 0,  -- how much to deduct per month
  total_repaid        NUMERIC(12,2) NOT NULL DEFAULT 0,
  requested_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_advances_teacher ON salary_advances(teacher_id);
CREATE INDEX IF NOT EXISTS idx_advances_status  ON salary_advances(status);
