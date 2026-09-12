-- Migration 051: Exam date sheet columns
-- Adds scheduling fields to exam_subjects (already the exam×class×subject join row).
-- All columns are nullable — existing rows and queries are completely unaffected.

ALTER TABLE exam_subjects
  ADD COLUMN IF NOT EXISTS exam_date   DATE,
  ADD COLUMN IF NOT EXISTS start_time  TIME,
  ADD COLUMN IF NOT EXISTS end_time    TIME,
  ADD COLUMN IF NOT EXISTS venue       VARCHAR(100);

-- Index for fast date-sheet lookups by exam
CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam_date
  ON exam_subjects(exam_id, exam_date, start_time);
