-- ============================================================
--  Subject Management Module — Additive Migration
--  Safe to run on existing DB: uses CREATE TABLE IF NOT EXISTS
--  and INSERT ... ON CONFLICT DO NOTHING for seed data.
--  No existing tables or data are modified.
-- ============================================================

-- ── 1. SUBJECTS  (master catalogue) ────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id          SERIAL        PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL UNIQUE,
  code        VARCHAR(20)   UNIQUE,
  description TEXT,
  is_active   BOOLEAN       DEFAULT TRUE,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- ── 2. CLASS SUBJECTS  (which subjects are taught in which class/year) ──
CREATE TABLE IF NOT EXISTS class_subjects (
  id            SERIAL        PRIMARY KEY,
  class_id      INT           NOT NULL REFERENCES classes(id)  ON DELETE CASCADE,
  subject_id    INT           NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  is_active     BOOLEAN       DEFAULT TRUE,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE(class_id, subject_id, academic_year)
);

-- ── 3. TEACHER SUBJECT ASSIGNMENTS  (who teaches what in which class) ──
--    One teacher per subject per class per academic year (enforced by UNIQUE).
--    To reassign, just upsert with the new teacher_id.
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id            SERIAL        PRIMARY KEY,
  teacher_id    INT           NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id    INT           NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id      INT           NOT NULL REFERENCES classes(id)  ON DELETE CASCADE,
  academic_year VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  is_active     BOOLEAN       DEFAULT TRUE,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE(subject_id, class_id, academic_year)
);

-- ── INDEXES ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_class_subjects_class    ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject  ON class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_tsa_teacher             ON teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tsa_class               ON teacher_subject_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_tsa_subject             ON teacher_subject_assignments(subject_id);

-- ── SEED: default subjects ───────────────────────────────────────
--    ON CONFLICT DO NOTHING = safe to re-run, never overwrites existing rows.
INSERT INTO subjects (name, code) VALUES
  ('Mathematics', 'MATH'),
  ('English',     'ENG'),
  ('Science',     'SCI'),
  ('Computer',    'COMP'),
  ('Urdu',        'URDU'),
  ('Islamiat',    'ISL')
ON CONFLICT (name) DO NOTHING;
