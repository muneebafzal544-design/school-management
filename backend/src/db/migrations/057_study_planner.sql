-- Study Planner: teacher-assigned priority topics per student or class
-- Auto-suggestions are computed at query time from weak subjects + syllabus

CREATE TABLE IF NOT EXISTS study_plan_topics (
  id            SERIAL PRIMARY KEY,
  -- Either student_id OR class_id (not both — student_id takes precedence)
  student_id    INT  REFERENCES students(id) ON DELETE CASCADE,
  class_id      INT  REFERENCES classes(id)  ON DELETE CASCADE,
  subject_id    INT  REFERENCES subjects(id) ON DELETE CASCADE,
  topic         VARCHAR(255) NOT NULL,
  description   TEXT,
  priority      SMALLINT NOT NULL DEFAULT 2,   -- 1=High · 2=Medium · 3=Low
  assigned_by   INT  REFERENCES teachers(id)  ON DELETE SET NULL,
  due_date      DATE,
  is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  academic_year VARCHAR(10) NOT NULL DEFAULT '2024-25',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_plan_student ON study_plan_topics(student_id);
CREATE INDEX IF NOT EXISTS idx_study_plan_class   ON study_plan_topics(class_id);
