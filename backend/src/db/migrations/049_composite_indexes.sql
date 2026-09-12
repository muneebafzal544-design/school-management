-- ─────────────────────────────────────────────────────────────────
-- Migration 049 · Composite & partial indexes for real query patterns
-- ─────────────────────────────────────────────────────────────────

-- ── Students ─────────────────────────────────────────────────────

-- Dashboard counts: WHERE status = 'active' AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_students_status_active
  ON students(status) WHERE deleted_at IS NULL;

-- Dashboard gender breakdown: WHERE status = 'active' AND gender = ? AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_students_status_gender_active
  ON students(status, gender) WHERE deleted_at IS NULL;

-- Class enrollment counts: WHERE class_id = $1 AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_students_class_active
  ON students(class_id) WHERE deleted_at IS NULL;

-- List page filters: WHERE status = ? AND class_id = ? AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_students_class_status_active
  ON students(class_id, status) WHERE deleted_at IS NULL;

-- ── Teachers ─────────────────────────────────────────────────────

-- Dashboard count: WHERE status = 'active' AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_teachers_status_active
  ON teachers(status) WHERE deleted_at IS NULL;

-- ── Notifications ────────────────────────────────────────────────
-- Existing indexes: idx_notif_read ON is_read, idx_notif_created ON created_at DESC
-- Missing: unread count query hits (user_id IS NULL OR user_id = $1) AND is_read = FALSE

-- Unread count per user: WHERE is_read = FALSE AND (user_id = $1 OR user_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_notif_unread_user
  ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;

-- List query: ORDER BY created_at DESC — user_id nullable
CREATE INDEX IF NOT EXISTS idx_notif_user_created
  ON notifications(user_id, created_at DESC);

-- ── Fee invoices ─────────────────────────────────────────────────
-- Notification scanner: WHERE status = 'overdue' AND due_date IS NOT NULL
-- Per-student queries: WHERE student_id = $1 AND status IN ('unpaid','partial')
-- Composite covers both via index scan on student_id + status filter

CREATE INDEX IF NOT EXISTS idx_fi_student_status_due
  ON fee_invoices(student_id, status, due_date);

-- ── Attendance ───────────────────────────────────────────────────
-- Notification scanner: WHERE entity_type='student' AND status='absent'
--   AND date BETWEEN ? AND ? AND period_id IS NULL
-- Covers the chronic-absentee scan with one seek

CREATE INDEX IF NOT EXISTS idx_att_absent_scan
  ON attendance(entity_type, status, date) WHERE period_id IS NULL;

-- Daily register: WHERE class_id = $1 AND date = $2 AND entity_type = 'student'
-- Extends existing idx_attendance_class_date to include entity_type
CREATE INDEX IF NOT EXISTS idx_att_class_date_type
  ON attendance(class_id, date, entity_type);

-- ── Online classes ───────────────────────────────────────────────
-- Dashboard upcoming + notification scanner:
--   WHERE status = 'scheduled' AND scheduled_at BETWEEN NOW() AND $1

CREATE INDEX IF NOT EXISTS idx_oc_status_scheduled
  ON online_classes(status, scheduled_at) WHERE status IN ('scheduled', 'live');

-- Per-teacher list: WHERE teacher_id = $1 AND status != 'cancelled'
CREATE INDEX IF NOT EXISTS idx_oc_teacher_status
  ON online_classes(teacher_id, scheduled_at DESC);

-- ── Teacher leaves ───────────────────────────────────────────────
-- Notification scanner: WHERE status = 'pending'
-- Already has idx_teacher_leaves_status — add teacher lookup composite

CREATE INDEX IF NOT EXISTS idx_tl_teacher_status
  ON teacher_leaves(teacher_id, status, from_date);
