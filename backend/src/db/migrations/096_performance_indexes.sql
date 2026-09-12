-- Migration 096: Performance indexes for high-traffic queries

-- fee_invoices: composite already exists from 049 (student_id,status,due_date)
-- Add a tighter covering index for the common status-only filter
CREATE INDEX IF NOT EXISTS idx_fee_invoices_status_student
  ON fee_invoices(status, student_id);

-- attendance: table uses entity_id + entity_type (no student_id column)
-- Per-student history: WHERE entity_type='student' AND entity_id=$1 AND date BETWEEN
CREATE INDEX IF NOT EXISTS idx_attendance_entity_date
  ON attendance(entity_id, date DESC) WHERE entity_type = 'student';

-- homework: class feed page filters by class + recency
CREATE INDEX IF NOT EXISTS idx_homework_class_created
  ON homework(class_id, created_at DESC);

-- announcements: active announcements sorted by date (uses is_active, not deleted_at)
CREATE INDEX IF NOT EXISTS idx_announcements_active_date
  ON announcements(created_at DESC) WHERE is_active = TRUE;

-- refresh_tokens: token revocation check is the hot path on every API call
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked
  ON refresh_tokens(user_id, revoked_at);

-- students: frequent lookup by admission_number and b_form_no
CREATE INDEX IF NOT EXISTS idx_students_admission_no
  ON students(admission_number) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_students_b_form
  ON students(b_form_no) WHERE deleted_at IS NULL;
