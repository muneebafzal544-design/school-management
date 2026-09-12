-- ============================================================
--  Homework / Assignments — Additive Migration
-- ============================================================

CREATE TABLE IF NOT EXISTS homework (
  id            SERIAL        PRIMARY KEY,
  class_id      INT           REFERENCES classes(id) ON DELETE SET NULL,
  subject_id    INT           REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id    INT           REFERENCES teachers(id) ON DELETE SET NULL,
  title         VARCHAR(255)  NOT NULL,
  description   TEXT,
  due_date      DATE          NOT NULL,
  academic_year VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  status        VARCHAR(20)   NOT NULL DEFAULT 'active',  -- active, completed, cancelled
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homework_class     ON homework(class_id);
CREATE INDEX IF NOT EXISTS idx_homework_due       ON homework(due_date);
CREATE INDEX IF NOT EXISTS idx_homework_year      ON homework(academic_year);
CREATE INDEX IF NOT EXISTS idx_homework_status    ON homework(status);
