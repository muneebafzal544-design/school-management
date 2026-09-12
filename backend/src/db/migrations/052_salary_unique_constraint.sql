-- ============================================================
--  Salary payments: ensure unique constraint exists for
--  ON CONFLICT (teacher_id, month) in generateMonthlySalaries
-- ============================================================

-- Drop the plain unique index if it exists (will be replaced by constraint)
DROP INDEX IF EXISTS idx_salary_pay_teacher_month;

-- Add the constraint (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'salary_payments'
      AND constraint_name = 'uq_salary_teacher_month'
      AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE salary_payments
      ADD CONSTRAINT uq_salary_teacher_month UNIQUE (teacher_id, month);
  END IF;
END $$;
