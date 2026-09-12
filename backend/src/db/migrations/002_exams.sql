-- ============================================================
--  Exam & Result System — Additive Migration
--  Safe to re-run: uses CREATE TABLE IF NOT EXISTS,
--  CREATE INDEX IF NOT EXISTS, and INSERT ... ON CONFLICT DO NOTHING.
--  References: students(id), classes(id), subjects(id)
-- ============================================================

-- ── 1. EXAMS  (master exam catalogue) ───────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id            SERIAL        PRIMARY KEY,
  exam_name     VARCHAR(100)  NOT NULL,
  exam_type     VARCHAR(30)   NOT NULL DEFAULT 'other'
                CHECK (exam_type IN ('midterm','final','quiz','monthly_test','other')),
  academic_year VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  start_date    DATE          NOT NULL,
  end_date      DATE          NOT NULL,
  status        VARCHAR(20)   NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled','ongoing','completed')),
  created_at    TIMESTAMPTZ   DEFAULT NOW(),

  CONSTRAINT chk_exam_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_exams_academic_year ON exams(academic_year);
CREATE INDEX IF NOT EXISTS idx_exams_status        ON exams(status);

-- ── 2. EXAM SUBJECTS  (marks config per exam × class × subject) ──
--  Defines total_marks and passing_marks for every subject in an exam.
--  A student mark row can only exist if a matching exam_subject row exists.
CREATE TABLE IF NOT EXISTS exam_subjects (
  id            SERIAL        PRIMARY KEY,
  exam_id       INT           NOT NULL REFERENCES exams(id)    ON DELETE CASCADE,
  class_id      INT           NOT NULL REFERENCES classes(id)  ON DELETE RESTRICT,
  subject_id    INT           NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  total_marks   NUMERIC(5,2)  NOT NULL,
  passing_marks NUMERIC(5,2)  NOT NULL,

  CONSTRAINT uq_exam_class_subject  UNIQUE (exam_id, class_id, subject_id),
  CONSTRAINT chk_passing_lte_total  CHECK  (passing_marks <= total_marks),
  CONSTRAINT chk_marks_positive     CHECK  (total_marks > 0 AND passing_marks > 0)
);

CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam    ON exam_subjects(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_class   ON exam_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_subject ON exam_subjects(subject_id);

-- ── 3. STUDENT MARKS  (marks obtained per student per subject) ──
CREATE TABLE IF NOT EXISTS student_marks (
  id              SERIAL        PRIMARY KEY,
  exam_id         INT           NOT NULL REFERENCES exams(id)    ON DELETE RESTRICT,
  student_id      INT           NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  subject_id      INT           NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  class_id        INT           NOT NULL REFERENCES classes(id)  ON DELETE RESTRICT,
  obtained_marks  NUMERIC(5,2)  NOT NULL,
  remarks         TEXT,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),

  -- One mark entry per student per subject per exam
  CONSTRAINT uq_student_exam_subject UNIQUE (exam_id, student_id, subject_id),
  CONSTRAINT chk_obtained_non_negative CHECK (obtained_marks >= 0),

  -- Must reference a configured exam_subject row (no marks without a marks config)
  CONSTRAINT fk_exam_subject FOREIGN KEY (exam_id, class_id, subject_id)
    REFERENCES exam_subjects(exam_id, class_id, subject_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_student_marks_student ON student_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_exam    ON student_marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_class   ON student_marks(class_id);

-- ── 4. RESULT SUMMARY  (pre-computed result per student per exam) ──
--  Populated by the calculate-results API endpoint.
--  percentage is auto-computed as a generated column.
CREATE TABLE IF NOT EXISTS result_summary (
  id              SERIAL        PRIMARY KEY,
  student_id      INT           NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  exam_id         INT           NOT NULL REFERENCES exams(id)    ON DELETE RESTRICT,
  class_id        INT           NOT NULL REFERENCES classes(id)  ON DELETE RESTRICT,
  total_marks     NUMERIC(6,2)  NOT NULL,
  obtained_marks  NUMERIC(6,2)  NOT NULL,
  percentage      NUMERIC(5,2)  GENERATED ALWAYS AS
                    (ROUND((obtained_marks / NULLIF(total_marks, 0)) * 100, 2)) STORED,
  grade           VARCHAR(2)    NOT NULL,
  result_status   VARCHAR(10)   NOT NULL CHECK (result_status IN ('pass','fail')),
  generated_at    TIMESTAMPTZ   DEFAULT NOW(),

  CONSTRAINT uq_result_student_exam UNIQUE (student_id, exam_id),
  CONSTRAINT chk_result_marks CHECK (obtained_marks >= 0 AND total_marks > 0)
);

CREATE INDEX IF NOT EXISTS idx_result_summary_exam    ON result_summary(exam_id);
CREATE INDEX IF NOT EXISTS idx_result_summary_student ON result_summary(student_id);
CREATE INDEX IF NOT EXISTS idx_result_summary_class   ON result_summary(class_id);

-- ── 5. GRADE FUNCTION ────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_grade(pct NUMERIC)
RETURNS VARCHAR(2)
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE
    WHEN pct >= 90 THEN 'A+'
    WHEN pct >= 80 THEN 'A'
    WHEN pct >= 70 THEN 'B'
    WHEN pct >= 60 THEN 'C'
    WHEN pct >= 50 THEN 'D'
    ELSE 'F'
  END;
END;
$$;
