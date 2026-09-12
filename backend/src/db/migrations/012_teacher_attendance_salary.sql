-- ============================================================
--  Teacher Attendance → Salary Deduction
--  Additive Migration — safe to re-run
-- ============================================================

-- Add absence-deduction tracking columns to salary_payments
ALTER TABLE salary_payments
  ADD COLUMN IF NOT EXISTS absent_days         INT           NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attendance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0;
