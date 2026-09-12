-- Migration 045: Add is_absent to student_marks
-- Allows teachers to mark a student as absent per subject
-- instead of leaving marks blank or entering 0.

ALTER TABLE student_marks
  ADD COLUMN IF NOT EXISTS is_absent BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quickly finding absent marks per exam
CREATE INDEX IF NOT EXISTS idx_student_marks_absent
  ON student_marks (exam_id, is_absent)
  WHERE is_absent = TRUE;
