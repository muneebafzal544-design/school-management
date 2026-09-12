-- Migration 050: Promotion safeguards
-- Adds unique constraint to prevent duplicate promotions for the same student+year pair.
-- Safe to run multiple times (IF NOT EXISTS / DO NOTHING pattern).

-- Unique constraint: one promotion record per student per academic year transition.
-- ON CONFLICT in bulkPromote will DO UPDATE (idempotent re-runs) instead of throwing.
ALTER TABLE promotion_records
  DROP CONSTRAINT IF EXISTS uq_promotion_student_year;

ALTER TABLE promotion_records
  ADD CONSTRAINT uq_promotion_student_year
  UNIQUE (student_id, from_academic_year, to_academic_year);
