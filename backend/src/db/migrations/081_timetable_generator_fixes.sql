-- Migration 081: Fix missing columns required by the timetable generator
-- subjects.periods_per_week    — how many times per week a subject is taught
-- teachers.max_periods_per_day — teacher workload cap (default 5)
-- class_subjects.teacher_id    — which teacher delivers this subject for this class
--   (migration 001 created class_subjects without teacher_id;
--    migration 068 used IF NOT EXISTS so the column was never added)

ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS periods_per_week INTEGER NOT NULL DEFAULT 1;

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS max_periods_per_day INTEGER NOT NULL DEFAULT 5;

ALTER TABLE class_subjects
  ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL;

-- Index to speed up timetable generator lookup
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher ON class_subjects(teacher_id)
  WHERE teacher_id IS NOT NULL;
