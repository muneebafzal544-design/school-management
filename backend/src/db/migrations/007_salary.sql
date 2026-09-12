-- ============================================================
--  Teacher Salary & Payroll — Additive Migration
--  Safe to re-run: CREATE TABLE IF NOT EXISTS
-- ============================================================

-- ── 1. SALARY STRUCTURES ─────────────────────────────────────
--   One row per teacher — defines their pay components.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_structures (
  id                  SERIAL        PRIMARY KEY,
  teacher_id          INT           NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  base_salary         NUMERIC(12,2) NOT NULL DEFAULT 0,
  house_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  medical_allowance   NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  income_tax          NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deduction     NUMERIC(12,2) NOT NULL DEFAULT 0,
  effective_from      DATE          NOT NULL DEFAULT CURRENT_DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_struct_teacher ON salary_structures(teacher_id);
CREATE INDEX IF NOT EXISTS idx_salary_struct_effective ON salary_structures(effective_from);

-- ── 2. SALARY PAYMENTS ───────────────────────────────────────
--   One row per teacher per month — tracks disbursement.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_payments (
  id                  SERIAL        PRIMARY KEY,
  teacher_id          INT           NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  month               VARCHAR(7)    NOT NULL,  -- e.g. '2024-01'
  base_salary         NUMERIC(12,2) NOT NULL DEFAULT 0,
  house_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  medical_allowance   NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_salary        NUMERIC(12,2) NOT NULL DEFAULT 0,
  income_tax          NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_deduction   NUMERIC(12,2) NOT NULL DEFAULT 0,
  fine_deduction      NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deduction     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions    NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary          NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method      VARCHAR(30)   NOT NULL DEFAULT 'cash',  -- cash, bank_transfer, cheque
  payment_date        DATE,
  status              VARCHAR(20)   NOT NULL DEFAULT 'pending', -- pending, paid
  remarks             TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_pay_teacher_month ON salary_payments(teacher_id, month);
CREATE INDEX IF NOT EXISTS idx_salary_pay_month  ON salary_payments(month);
CREATE INDEX IF NOT EXISTS idx_salary_pay_status ON salary_payments(status);
