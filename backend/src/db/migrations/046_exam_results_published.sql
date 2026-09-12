-- Migration 046: Add results_published_at to exams
-- When set, marks entry and result recalculation are locked.
-- Admin can publish (lock) and unpublish (unlock) results.

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS results_published_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN exams.results_published_at IS
  'When non-null, exam results are published/locked. Marks cannot be edited.';
