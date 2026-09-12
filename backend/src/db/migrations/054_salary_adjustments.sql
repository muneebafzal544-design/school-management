-- ============================================================
--  Salary Adjustments: Late-arrival deductions + Policy table
--  Safe to re-run: all statements are idempotent
-- ============================================================

-- ── 1. Add late-arrival columns to salary_payments ───────────
ALTER TABLE salary_payments
  ADD COLUMN IF NOT EXISTS late_days        INT           NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_deduction   NUMERIC(12,2) NOT NULL DEFAULT 0;

-- ── 2. Salary Policy table ───────────────────────────────────
--   Single-row table storing school-wide payroll rules.
--   Use ON CONFLICT to seed exactly one row idempotently.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_policies (
  id                       SERIAL        PRIMARY KEY,
  allowed_leaves_per_month INT           NOT NULL DEFAULT 2,   -- free absent days per month
  late_arrivals_per_leave  INT           NOT NULL DEFAULT 3,   -- N late arrivals = 1 day deduction
  working_days_basis       INT           NOT NULL DEFAULT 26,  -- divisor for per-day rate
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Seed one row (id=1) — safe on re-run
INSERT INTO salary_policies (id, allowed_leaves_per_month, late_arrivals_per_leave, working_days_basis)
VALUES (1, 2, 3, 26)
ON CONFLICT (id) DO NOTHING;
