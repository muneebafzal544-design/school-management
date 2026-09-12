-- ── Exam Paper Creator ────────────────────────────────────────────────────────
-- Three-section Pakistani-style exam papers: MCQs, Short Questions, Long Questions

CREATE TABLE IF NOT EXISTS exam_papers (
  id                    SERIAL PRIMARY KEY,
  title                 VARCHAR(200) NOT NULL,
  subject               VARCHAR(100),
  class_name            VARCHAR(100),
  exam_id               INTEGER,          -- optional link to an exam record
  academic_year         VARCHAR(10)  DEFAULT '2025-26',
  total_marks           INTEGER      NOT NULL DEFAULT 100,
  duration_mins         INTEGER      NOT NULL DEFAULT 180,
  paper_date            DATE,
  instructions          TEXT,             -- general instructions below header
  note                  TEXT,             -- small note (e.g. "Attempt all questions")
  school_name_override  VARCHAR(200),     -- leave NULL to use global school name
  created_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paper_sections (
  id            SERIAL PRIMARY KEY,
  paper_id      INTEGER NOT NULL REFERENCES exam_papers(id) ON DELETE CASCADE,
  section_type  VARCHAR(10) NOT NULL CHECK (section_type IN ('mcq','short','long')),
  title         VARCHAR(200) NOT NULL,
  instructions  TEXT,                     -- e.g. "Attempt any 6 of the following"
  marks_per_q   NUMERIC(5,1) DEFAULT 1,   -- default marks per question
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paper_questions (
  id             SERIAL PRIMARY KEY,
  section_id     INTEGER NOT NULL REFERENCES paper_sections(id) ON DELETE CASCADE,
  question_text  TEXT    NOT NULL,
  marks          NUMERIC(5,1) NOT NULL DEFAULT 1,
  options        JSONB,   -- MCQ: [{"label":"A","text":"..."},{"label":"B","text":"..."},...]
  sub_parts      JSONB,   -- Long: [{"label":"a","text":"...","marks":5},...]
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_papers_created_by   ON exam_papers(created_by);
CREATE INDEX IF NOT EXISTS idx_paper_sections_paper_id  ON paper_sections(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_questions_sec_id   ON paper_questions(section_id);
