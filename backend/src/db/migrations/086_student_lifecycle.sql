-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 086: Student Lifecycle Events
-- ─────────────────────────────────────────────────────────────────────────────
-- One table stores every significant event in a student's school journey.
-- Flexible JSONB metadata means no schema change is needed to track new data.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_lifecycle_events (
  id           BIGSERIAL    PRIMARY KEY,
  student_id   INTEGER      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type   VARCHAR(60)  NOT NULL,   -- e.g. 'admission', 'fee_paid', 'transport_assigned'
  title        VARCHAR(250) NOT NULL,   -- human-readable one-liner
  description  TEXT,                   -- optional longer detail
  metadata     JSONB        NOT NULL DEFAULT '{}',  -- all extra context
  performed_by INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Hot-path indexes
CREATE INDEX IF NOT EXISTS idx_lifecycle_student   ON student_lifecycle_events(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_type      ON student_lifecycle_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lifecycle_created   ON student_lifecycle_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_meta      ON student_lifecycle_events USING GIN (metadata);

-- ── Event type reference (documentation — not enforced) ──────────────────────
-- admission              Student admitted to school
-- class_assigned         Assigned to a class for the first time
-- class_transferred      Moved from one class to another
-- transport_assigned     Assigned to bus/route
-- transport_transferred  Transferred to a different bus/route
-- fee_paid               Full fee payment recorded
-- fee_partial            Partial fee payment recorded
-- attendance_absent      Marked absent for the day
-- attendance_late        Marked late for the day
-- exam_result            Exam marks submitted
-- promotion              Promoted to next class/grade
-- graduation             Completed schooling and graduated
-- withdrawal             Student withdrawn / left school
-- suspension             Student suspended
-- suspension_lifted      Suspension revoked
-- reinstatement          Deleted student restored
-- manual_note            Admin/teacher added a manual note
