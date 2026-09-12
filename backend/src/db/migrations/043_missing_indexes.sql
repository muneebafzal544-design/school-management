-- A2 fix: missing DB indexes for performance

-- Fee invoices — most queried by student
CREATE INDEX IF NOT EXISTS idx_fee_invoices_student_id ON fee_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_status     ON fee_invoices(status);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_due_date   ON fee_invoices(due_date);

-- Attendance — heavily used in analytics date-range queries
CREATE INDEX IF NOT EXISTS idx_attendance_date   ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_entity ON attendance(entity_type, entity_id);

-- Teacher leaves — filtered by status
CREATE INDEX IF NOT EXISTS idx_teacher_leaves_status     ON teacher_leaves(status);
CREATE INDEX IF NOT EXISTS idx_teacher_leaves_teacher_id ON teacher_leaves(teacher_id);

-- Homework — filtered by class + due_date
CREATE INDEX IF NOT EXISTS idx_homework_class_due ON homework(class_id, due_date);

-- Students — common filters
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_status   ON students(status);

-- Fee payments — date-range queries
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(payment_date);

-- Expenses — date range
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- Salary payments — teacher + month
CREATE INDEX IF NOT EXISTS idx_salary_payments_teacher ON salary_payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_month   ON salary_payments(month);
