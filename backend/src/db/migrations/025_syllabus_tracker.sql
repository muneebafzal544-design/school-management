-- ── Syllabus / Curriculum Tracker ───────────────────────────
CREATE TABLE IF NOT EXISTS syllabus_topics (
  id             SERIAL        PRIMARY KEY,
  class_id       INT           NOT NULL REFERENCES classes(id)  ON DELETE CASCADE,
  subject_id     INT           NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic          VARCHAR(300)  NOT NULL,
  description    TEXT,
  order_no       INT           NOT NULL DEFAULT 1,
  is_completed   BOOLEAN       NOT NULL DEFAULT FALSE,
  completed_by   INT           REFERENCES teachers(id) ON DELETE SET NULL,
  completed_date DATE,
  academic_year  VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syllabus_class   ON syllabus_topics(class_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_subject ON syllabus_topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_year    ON syllabus_topics(academic_year);
