-- Migration 055: Non-teaching staff module
-- Covers all support/admin staff (peons, guards, drivers, accountants, etc.)

CREATE TABLE IF NOT EXISTS staff (
  id             SERIAL        PRIMARY KEY,
  full_name      VARCHAR(120)  NOT NULL,
  designation    VARCHAR(100)  NOT NULL,
  department     VARCHAR(80),                       -- Admin, Security, Transport, Canteen, etc.
  phone          VARCHAR(20),
  email          VARCHAR(120),
  cnic           VARCHAR(20),
  base_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
  join_date      DATE,
  status         VARCHAR(20)   NOT NULL DEFAULT 'active'  CHECK (status IN ('active','inactive','terminated')),
  photo_url      TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Daily attendance for non-teaching staff
CREATE TABLE IF NOT EXISTS staff_attendance (
  id         SERIAL      PRIMARY KEY,
  staff_id   INT         NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','half_day','leave')),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, date)
);

-- Monthly salary payments for non-teaching staff
CREATE TABLE IF NOT EXISTS staff_salary_payments (
  id              SERIAL        PRIMARY KEY,
  staff_id        INT           NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  month           INT           NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            INT           NOT NULL,
  base_salary     NUMERIC(12,2) NOT NULL DEFAULT 0,
  absent_days     INT           NOT NULL DEFAULT 0,
  late_days       INT           NOT NULL DEFAULT 0,
  leave_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  late_deduction  NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus           NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_on         DATE,
  note            TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date ON staff_attendance(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_salary_month_year    ON staff_salary_payments(year, month);
