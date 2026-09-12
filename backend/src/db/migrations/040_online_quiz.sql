CREATE TABLE IF NOT EXISTS quizzes (
  id            SERIAL        PRIMARY KEY,
  title         VARCHAR(255)  NOT NULL,
  class_id      INT           REFERENCES classes(id) ON DELETE SET NULL,
  subject_id    INT           REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id    INT           REFERENCES teachers(id) ON DELETE SET NULL,
  instructions  TEXT,
  duration_min  SMALLINT      NOT NULL DEFAULT 30,
  total_marks   NUMERIC(6,2),
  pass_marks    NUMERIC(6,2),
  status        VARCHAR(20)   NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','published','closed','archived')),
  open_from     TIMESTAMPTZ,
  open_until    TIMESTAMPTZ,
  academic_year VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id            SERIAL        PRIMARY KEY,
  quiz_id       INT           NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT          NOT NULL,
  question_type VARCHAR(20)   NOT NULL CHECK (question_type IN ('mcq','short_answer')),
  marks         NUMERIC(5,2)  NOT NULL DEFAULT 1,
  options       JSONB,
  correct_option VARCHAR(5),
  order_no      SMALLINT      NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           SERIAL        PRIMARY KEY,
  quiz_id      INT           NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id   INT           NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  total_marks  NUMERIC(6,2),
  scored_marks NUMERIC(6,2),
  is_graded    BOOLEAN       NOT NULL DEFAULT FALSE,
  status       VARCHAR(20)   NOT NULL DEFAULT 'in_progress'
                 CHECK (status IN ('in_progress','submitted','graded')),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_attempts_unique ON quiz_attempts(quiz_id, student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id               SERIAL        PRIMARY KEY,
  attempt_id       INT           NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id      INT           NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_text      TEXT,
  is_correct       BOOLEAN,
  marks_awarded    NUMERIC(5,2),
  teacher_feedback TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_answers_unique ON quiz_answers(attempt_id, question_id);
