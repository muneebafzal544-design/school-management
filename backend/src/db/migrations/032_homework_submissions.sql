CREATE TABLE IF NOT EXISTS homework_submissions (
  id            SERIAL        PRIMARY KEY,
  homework_id   INT           NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id    INT           NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','submitted','checked','missing')),
  submitted_at  TIMESTAMPTZ,
  checked_at    TIMESTAMPTZ,
  checked_by    INT           REFERENCES teachers(id) ON DELETE SET NULL,
  marks_awarded NUMERIC(5,2),
  feedback      TEXT,
  student_note  TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hw_sub_hw_student ON homework_submissions(homework_id, student_id);
CREATE INDEX IF NOT EXISTS idx_hw_sub_homework ON homework_submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_hw_sub_student  ON homework_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_hw_sub_status   ON homework_submissions(status);
