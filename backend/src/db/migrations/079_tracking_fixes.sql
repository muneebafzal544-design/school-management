-- Migration 079: Tracking system fixes
-- Safe to run after 078, or even if 078 was already run with the old schema.

-- ── 1. Add parent_user_id to students (needed by getMyBus endpoint) ───────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS parent_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_user_id);

-- ── 2. Fix trip_events.trip_id: make nullable so emergency events work without
--      an active trip session (e.g. driver triggers panic before starting trip)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_events' AND column_name = 'trip_id'
  ) THEN
    ALTER TABLE trip_events
      ALTER COLUMN trip_id DROP NOT NULL;
  END IF;
END
$$;
