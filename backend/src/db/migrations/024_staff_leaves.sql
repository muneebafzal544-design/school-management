-- ── Staff Leave Management ────────────────────────────────────────────────────

-- Leave types (Casual, Sick, Annual, Emergency, Half-Day)
CREATE TABLE IF NOT EXISTS leave_types (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(80)  NOT NULL UNIQUE,
  days_allowed     INT          NOT NULL DEFAULT 0,   -- per year; 0 = unlimited/unpaid
  is_paid          BOOLEAN      NOT NULL DEFAULT TRUE,
  color            VARCHAR(20)  NOT NULL DEFAULT '#3B82F6',
  description      TEXT,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Leave requests
CREATE TABLE IF NOT EXISTS teacher_leaves (
  id               SERIAL PRIMARY KEY,
  teacher_id       INT          NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  leave_type_id    INT          NOT NULL REFERENCES leave_types(id),
  from_date        DATE         NOT NULL,
  to_date          DATE         NOT NULL,
  total_days       NUMERIC(4,1) NOT NULL,              -- supports 0.5 for half-day
  reason           TEXT,
  status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected','cancelled')),
  admin_note       TEXT,
  applied_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      VARCHAR(100),                       -- admin username
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_leaves_teacher   ON teacher_leaves(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_leaves_status    ON teacher_leaves(status);
CREATE INDEX IF NOT EXISTS idx_teacher_leaves_from_date ON teacher_leaves(from_date DESC);

-- Add leave_deduction column to salary_payments for unpaid leave integration
ALTER TABLE salary_payments
  ADD COLUMN IF NOT EXISTS leave_days       NUMERIC(4,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leave_deduction  NUMERIC(12,2) DEFAULT 0;

-- Default leave types for Pakistani schools
INSERT INTO leave_types (name, days_allowed, is_paid, color, description) VALUES
  ('Casual Leave',    12, TRUE,  '#3B82F6', 'General purpose paid leave'),
  ('Sick Leave',      10, TRUE,  '#EF4444', 'Medical / health-related leave'),
  ('Annual Leave',    14, TRUE,  '#10B981', 'Yearly earned leave'),
  ('Half Day',         0, TRUE,  '#F59E0B', 'Leave for half a working day (0.5 days)'),
  ('Emergency Leave',  3, TRUE,  '#8B5CF6', 'Urgent personal matters'),
  ('Unpaid Leave',     0, FALSE, '#6B7280', 'Leave without pay — deducted from salary')
ON CONFLICT (name) DO NOTHING;
