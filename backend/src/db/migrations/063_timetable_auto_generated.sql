-- Migration 063: Add auto_generated flag to timetable_entries
ALTER TABLE timetable_entries
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_timetable_auto_generated ON timetable_entries(auto_generated);
