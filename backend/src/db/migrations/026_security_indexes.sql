-- ─────────────────────────────────────────────────────────────────
-- Migration 026 · Security tables + performance indexes
-- Run this against your PostgreSQL database once.
-- ─────────────────────────────────────────────────────────────────

-- ── 1. Refresh tokens ────────────────────────────────────────────
-- Stores SHA-256 hashes of issued refresh tokens so they can be
-- revoked (logout, password change, admin force-signout).
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64)  NOT NULL UNIQUE,   -- SHA-256 of the raw JWT
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ,                    -- NULL means still valid
  ip_address  TEXT,
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_rt_user    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_rt_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_rt_hash    ON refresh_tokens(token_hash);

-- ── 2. Audit log ─────────────────────────────────────────────────
-- Immutable record of every significant action in the system.
-- Rows are NEVER updated or deleted (append-only by convention).
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     INT          REFERENCES users(id) ON DELETE SET NULL,
  username    VARCHAR(100),
  action      VARCHAR(50)  NOT NULL,  -- LOGIN | LOGOUT | CREATE | UPDATE | DELETE | PASSWORD_CHANGE
  resource    VARCHAR(100),           -- student | teacher | fee | exam …
  resource_id INT,
  details     JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_al_user     ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_al_action   ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_al_resource ON audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_al_created  ON audit_logs(created_at DESC);

-- ── 3. Login attempts ─────────────────────────────────────────────
-- Used to enforce account lockout after repeated failures.
CREATE TABLE IF NOT EXISTS login_attempts (
  id          BIGSERIAL    PRIMARY KEY,
  username    VARCHAR(100) NOT NULL,
  ip_address  TEXT,
  success     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_la_username ON login_attempts(username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_la_ip       ON login_attempts(ip_address, created_at DESC);

-- Auto-purge old login attempts (keep 30 days)
-- In production, run this as a scheduled job or cron instead:
-- DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '30 days';

-- ── 4. Performance indexes ────────────────────────────────────────

-- Students
CREATE INDEX IF NOT EXISTS idx_students_class_id     ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_status       ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);
-- Full-text search index (used by global search & student list)
CREATE INDEX IF NOT EXISTS idx_students_fts
  ON students USING gin(
    to_tsvector('simple',
      coalesce(full_name, '') || ' ' ||
      coalesce(email, '')     || ' ' ||
      coalesce(b_form_no, '')
    )
  );

-- Attendance — uses entity_type + entity_id (not student_id)
CREATE INDEX IF NOT EXISTS idx_attendance_class_date   ON attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_entity       ON attendance(entity_type, entity_id, date);

-- Fee invoices
CREATE INDEX IF NOT EXISTS idx_fi_student ON fee_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_fi_status  ON fee_invoices(status);
CREATE INDEX IF NOT EXISTS idx_fi_year    ON fee_invoices(academic_year);
CREATE INDEX IF NOT EXISTS idx_fi_due     ON fee_invoices(due_date) WHERE status = 'unpaid';

-- Fee payments
CREATE INDEX IF NOT EXISTS idx_fp_invoice  ON fee_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fp_date     ON fee_payments(payment_date);

-- Exam marks (table is student_marks, not exam_marks)
CREATE INDEX IF NOT EXISTS idx_sm_exam    ON student_marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_sm_student ON student_marks(student_id);

-- Timetable entries
CREATE INDEX IF NOT EXISTS idx_te_class   ON timetable_entries(class_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_te_teacher ON timetable_entries(teacher_id, academic_year);

-- Notifications (no user_id column — global table with is_read only)
CREATE INDEX IF NOT EXISTS idx_notif_read    ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);

-- Homework
CREATE INDEX IF NOT EXISTS idx_hw_class ON homework(class_id, due_date);

-- Diary entries (column is 'date', not 'entry_date')
CREATE INDEX IF NOT EXISTS idx_diary_class_date ON diary_entries(class_id, date);

-- Messages (column is conversation_id, not thread_id)
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, sent_at DESC);

-- Salary payments (table is salary_payments, not salary_records)
CREATE INDEX IF NOT EXISTS idx_salary_teacher ON salary_payments(teacher_id, month);

-- Syllabus
CREATE INDEX IF NOT EXISTS idx_syllabus_class_subj ON syllabus_topics(class_id, subject_id, academic_year);

-- Users (frequent lookups by username)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_entity   ON users(entity_id, role);
