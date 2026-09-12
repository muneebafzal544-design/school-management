-- Migration 104: billing_month index + composite indexes for common queries

-- fee_invoices: billing_month is used in every dashboard stats / filter query
CREATE INDEX IF NOT EXISTS idx_fee_invoices_billing_month
  ON fee_invoices(billing_month) WHERE status != 'cancelled';

-- Composite: the most common filter (class + billing_month) for fee lists and stats
CREATE INDEX IF NOT EXISTS idx_fee_invoices_class_month
  ON fee_invoices(class_id, billing_month) WHERE status != 'cancelled';

-- Composite: student + billing_month for per-student history
CREATE INDEX IF NOT EXISTS idx_fee_invoices_student_month
  ON fee_invoices(student_id, billing_month);

-- attendance: class_id + date is the hot path on the mark-attendance page
CREATE INDEX IF NOT EXISTS idx_attendance_class_date
  ON attendance(entity_id, date DESC) WHERE entity_type = 'class';

-- student_marks: exam + class join used in seating and results pages
CREATE INDEX IF NOT EXISTS idx_student_marks_exam_class
  ON student_marks(exam_id, class_id);
