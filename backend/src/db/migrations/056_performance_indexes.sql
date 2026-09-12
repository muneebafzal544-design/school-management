-- Migration 056: Additional performance indexes
-- Uses CREATE INDEX IF NOT EXISTS throughout — fully idempotent.
-- Complements existing indexes in 026, 043, 049 without duplicating them.

-- Enable trigram extension for fast ILIKE search on names
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Students ─────────────────────────────────────────────────────────────────
-- (class_id already in 026; these add the remaining high-value columns)
CREATE INDEX IF NOT EXISTS idx_students_status         ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_gender         ON students(gender);
CREATE INDEX IF NOT EXISTS idx_students_admission_no   ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_full_name_trgm ON students USING gin(full_name gin_trgm_ops);

-- ── Attendance ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_entity_type  ON attendance(entity_type);
CREATE INDEX IF NOT EXISTS idx_attendance_status       ON attendance(status);

-- ── Fee invoices ──────────────────────────────────────────────────────────────
-- (student_id already in 026; add remaining columns)
CREATE INDEX IF NOT EXISTS idx_fee_invoices_billing_month ON fee_invoices(billing_month);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_status        ON fee_invoices(status);

-- ── Fee payments ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice_id    ON fee_payments(invoice_id);

-- ── Salary payments ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_salary_payments_payment_date ON salary_payments(payment_date);

-- ── Fee structures ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_year  ON fee_structures(class_id, academic_year);

-- ── Exams & marks ─────────────────────────────────────────────────────────────
-- exams table has no class_id (school-wide) — index already on academic_year/status
CREATE INDEX IF NOT EXISTS idx_student_marks_student_id ON student_marks(student_id);

-- ── Events ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_start_date        ON events(start_date);

-- ── Non-teaching staff ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_staff_status             ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_department         ON staff(department);
