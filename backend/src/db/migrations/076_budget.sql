-- Migration 076: Budget planning module
CREATE TABLE IF NOT EXISTS budget_plans (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  fiscal_year  VARCHAR(20) NOT NULL,   -- e.g. "2025-2026"
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'approved', 'active', 'closed')),
  total_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS budget_items (
  id            SERIAL PRIMARY KEY,
  plan_id       INTEGER NOT NULL REFERENCES budget_plans(id) ON DELETE CASCADE,
  category      VARCHAR(100) NOT NULL,
  subcategory   VARCHAR(100),
  type          VARCHAR(10) NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  description   VARCHAR(255) NOT NULL,
  budgeted      NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual        NUMERIC(14,2) NOT NULL DEFAULT 0,  -- updated as transactions come in
  notes         TEXT,
  sort_order    SMALLINT DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_budget_items_plan ON budget_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_budget_fiscal     ON budget_plans(fiscal_year);
