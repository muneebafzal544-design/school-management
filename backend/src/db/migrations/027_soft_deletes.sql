-- ─────────────────────────────────────────────────────────────────
-- Migration 027 · Soft deletes for students and teachers
-- ─────────────────────────────────────────────────────────────────

-- Add deleted_at to students
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to teachers
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial index: fast lookups of active records only
CREATE INDEX IF NOT EXISTS idx_students_active
  ON students(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_active
  ON teachers(id) WHERE deleted_at IS NULL;
