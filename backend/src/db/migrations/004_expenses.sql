-- ============================================================
--  School Expense & Accounting System — Additive Migration
--  Safe to re-run: CREATE TABLE IF NOT EXISTS, INSERT … ON CONFLICT DO NOTHING
--  No existing tables are modified.
-- ============================================================

-- ── 1. EXPENSE CATEGORIES ────────────────────────────────────
--   Defines the taxonomy of school spending.
--   New categories can be added at any time.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_categories (
  id              SERIAL        PRIMARY KEY,
  category_name   VARCHAR(100)  NOT NULL UNIQUE,
  description     TEXT,
  icon            VARCHAR(50),                    -- emoji / icon key for UI
  color           VARCHAR(20),                    -- hex color for charts
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exp_cat_active ON expense_categories(is_active);

-- ── 2. EXPENSES ──────────────────────────────────────────────
--   Master ledger of every school expense transaction.
--   Immutable records — update only descriptive fields, never amount.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id                  SERIAL          PRIMARY KEY,

  -- Classification
  category_id         INT             NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  title               VARCHAR(200)    NOT NULL,
  description         TEXT,

  -- Financials
  amount              NUMERIC(12, 2)  NOT NULL CHECK (amount > 0),
  expense_date        DATE            NOT NULL DEFAULT CURRENT_DATE,

  -- Payment details
  payment_method      VARCHAR(20)     NOT NULL DEFAULT 'cash'
                      CHECK (payment_method IN ('cash','bank_transfer','cheque','online','card')),
  reference_number    VARCHAR(100),               -- cheque no / transaction ID / voucher no
  receipt_url         TEXT,                       -- path or URL to scanned receipt

  -- Approval / workflow (nullable until admin auth is added)
  status              VARCHAR(20)     NOT NULL DEFAULT 'approved'
                      CHECK (status IN ('draft','pending','approved','rejected')),

  -- ── Future-proof author tracking ──────────────────────────
  --   created_by_type and created_by_id are nullable now (no admin table yet).
  --   When auth is added:
  --     created_by_type = 'admin'      → created_by_id points to admins.id
  --     created_by_type = 'accountant' → created_by_id points to accountants.id
  --     created_by_type = 'teacher'    → created_by_id points to teachers.id
  created_by_type     VARCHAR(20),                -- 'admin' | 'accountant' | 'teacher' | NULL
  created_by_id       INT,                        -- FK resolved at application layer

  -- Soft-delete support (keeps history intact)
  is_deleted          BOOLEAN         NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,

  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- Fiscal year derived column for fast grouping
  fiscal_year         VARCHAR(10)     GENERATED ALWAYS AS (
    CASE
      WHEN EXTRACT(MONTH FROM expense_date) >= 4
      THEN LPAD(CAST(EXTRACT(YEAR FROM expense_date) AS TEXT), 4, '0')
           || '-'
           || LPAD(CAST(EXTRACT(YEAR FROM expense_date) + 1 AS TEXT), 2, '0')
      ELSE LPAD(CAST(EXTRACT(YEAR FROM expense_date) - 1 AS TEXT), 4, '0')
           || '-'
           || LPAD(CAST(EXTRACT(YEAR FROM expense_date) AS TEXT), 2, '0')
    END
  ) STORED
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_exp_category      ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_exp_date          ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_exp_method        ON expenses(payment_method);
CREATE INDEX IF NOT EXISTS idx_exp_status        ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_exp_fiscal_year   ON expenses(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_exp_not_deleted   ON expenses(is_deleted) WHERE is_deleted = FALSE;

-- Composite: monthly/yearly report queries
CREATE INDEX IF NOT EXISTS idx_exp_date_cat
  ON expenses(expense_date DESC, category_id)
  WHERE is_deleted = FALSE;

-- ── 3. SEED — EXPENSE CATEGORIES ─────────────────────────────
INSERT INTO expense_categories (category_name, description, icon, color)
VALUES
  ('Salaries',          'Staff and teacher salary payments',                '💼', '#6366f1'),
  ('Electricity',       'Monthly electricity and power bills',              '⚡', '#f59e0b'),
  ('Maintenance',       'Building, equipment and facility maintenance',     '🔧', '#64748b'),
  ('Office Supplies',   'Stationery, printing and office consumables',      '🖊️',  '#10b981'),
  ('Internet & Phone',  'Internet service, telephone and communication',    '📡', '#06b6d4'),
  ('Transport',         'School bus, fuel and vehicle maintenance',         '🚌', '#f97316'),
  ('Events',            'School events, ceremonies and extracurriculars',   '🎉', '#ec4899'),
  ('Cleaning',          'Cleaning staff, supplies and sanitation',          '🧹', '#84cc16'),
  ('Security',          'Security staff, cameras and safety systems',       '🛡️',  '#8b5cf6'),
  ('Library',           'Books, journals and library resources',            '📚', '#14b8a6'),
  ('Laboratory',        'Science lab equipment, chemicals and supplies',    '🔬', '#ef4444'),
  ('Miscellaneous',     'Other uncategorised school expenses',              '📦', '#a8a29e')
ON CONFLICT (category_name) DO NOTHING;

-- ── 4. SEED — SAMPLE EXPENSES ────────────────────────────────
INSERT INTO expenses
  (category_id, title, description, amount, expense_date, payment_method, reference_number, status)
SELECT
  c.id,
  e.title,
  e.description,
  e.amount,
  e.expense_date::DATE,
  e.method,
  e.ref,
  'approved'
FROM (VALUES
  ('Salaries',        'March 2025 — Teaching Staff Salaries',  'Monthly salaries for all teaching staff',            285000.00, '2025-03-05', 'bank_transfer', 'TXN-MAR-001'),
  ('Salaries',        'March 2025 — Support Staff Salaries',   'Monthly salaries for non-teaching staff',             95000.00, '2025-03-05', 'bank_transfer', 'TXN-MAR-002'),
  ('Electricity',     'February 2025 Electricity Bill',        'LESCO bill for main school building',                 18500.00, '2025-02-28', 'online',        'LESCO-FEB-25'),
  ('Maintenance',     'Generator Fuel & Service',              'Monthly generator fuel refill and servicing',          8200.00, '2025-03-02', 'cash',          NULL),
  ('Office Supplies', 'Stationery Restock Q1',                 'Pens, registers, printer paper and folders',           4750.00, '2025-01-15', 'cash',          NULL),
  ('Internet & Phone', 'Internet Subscription — March',        'Monthly broadband internet for school campus',         3500.00, '2025-03-01', 'online',        'NET-MAR-25'),
  ('Transport',       'Bus Fuel — February',                   'Diesel for 3 school buses for February',              22000.00, '2025-02-28', 'cash',          NULL),
  ('Events',          'Annual Day Decoration & Sound',         'Stage decoration, sound system hire for Annual Day',  35000.00, '2025-02-20', 'cheque',        'CHQ-00241'),
  ('Cleaning',        'Cleaning Supplies — February',          'Detergents, mops, brooms and janitorial supplies',     2900.00, '2025-02-10', 'cash',          NULL),
  ('Library',         'New Book Purchase — Science Series',    'Grade 9-10 science reference books (20 copies each)', 16000.00, '2025-01-22', 'bank_transfer', 'TXN-LIB-004'),
  ('Laboratory',      'Chemistry Lab Chemicals Restock',       'Acids, indicators and lab glassware replenishment',   11500.00, '2025-02-05', 'cheque',        'CHQ-00238'),
  ('Maintenance',     'Plumbing Repair — Block B',             'Blocked drain and pipe repair in Block B washrooms',   5500.00, '2025-03-08', 'cash',          NULL),
  ('Security',        'CCTV Annual Maintenance Contract',      'Yearly AMC for 24 CCTV cameras across campus',        18000.00, '2025-01-10', 'bank_transfer', 'TXN-SEC-001'),
  ('Salaries',        'April 2025 — Teaching Staff Salaries',  'Monthly salaries for all teaching staff',            285000.00, '2025-04-05', 'bank_transfer', 'TXN-APR-001'),
  ('Electricity',     'March 2025 Electricity Bill',           'LESCO bill for main school building',                 16800.00, '2025-03-31', 'online',        'LESCO-MAR-25'),
  ('Transport',       'Bus Fuel — March',                      'Diesel for 3 school buses for March',                 24000.00, '2025-03-31', 'cash',          NULL),
  ('Miscellaneous',   'Printer Repair & Toner',                'Office printer drum replacement and toner cartridges', 7200.00, '2025-03-15', 'cash',          NULL)
) AS e(cat, title, description, amount, expense_date, method, ref)
JOIN expense_categories c ON c.category_name = e.cat
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
--  ANALYTICAL VIEWS  (created with CREATE OR REPLACE — safe to re-run)
-- ────────────────────────────────────────────────────────────

-- ── View A: Monthly Expense Summary ────────────────────────
CREATE OR REPLACE VIEW vw_monthly_expense_summary AS
SELECT
  TO_CHAR(expense_date, 'YYYY')           AS year,
  TO_CHAR(expense_date, 'MM')             AS month_num,
  TO_CHAR(expense_date, 'Month YYYY')     AS month_label,
  COUNT(*)                                AS transaction_count,
  SUM(amount)                             AS total_amount,
  AVG(amount)                             AS avg_transaction
FROM expenses
WHERE is_deleted = FALSE
  AND status = 'approved'
GROUP BY
  TO_CHAR(expense_date, 'YYYY'),
  TO_CHAR(expense_date, 'MM'),
  TO_CHAR(expense_date, 'Month YYYY')
ORDER BY year DESC, month_num DESC;

-- ── View B: Yearly Expense Summary ─────────────────────────
CREATE OR REPLACE VIEW vw_yearly_expense_summary AS
SELECT
  EXTRACT(YEAR FROM expense_date)::INT    AS year,
  fiscal_year,
  COUNT(*)                                AS transaction_count,
  SUM(amount)                             AS total_amount,
  AVG(amount)                             AS avg_transaction,
  MAX(amount)                             AS largest_expense,
  MIN(amount)                             AS smallest_expense
FROM expenses
WHERE is_deleted = FALSE
  AND status = 'approved'
GROUP BY EXTRACT(YEAR FROM expense_date)::INT, fiscal_year
ORDER BY year DESC;

-- ── View C: Expenses by Category ────────────────────────────
CREATE OR REPLACE VIEW vw_category_expense_summary AS
SELECT
  ec.id                                   AS category_id,
  ec.category_name,
  ec.icon,
  ec.color,
  COUNT(e.id)                             AS transaction_count,
  COALESCE(SUM(e.amount), 0)             AS total_amount,
  COALESCE(AVG(e.amount), 0)             AS avg_amount,
  COALESCE(MAX(e.amount), 0)             AS max_single_expense,
  MAX(e.expense_date)                     AS last_expense_date
FROM expense_categories ec
LEFT JOIN expenses e
  ON e.category_id = ec.id
  AND e.is_deleted = FALSE
  AND e.status = 'approved'
WHERE ec.is_active = TRUE
GROUP BY ec.id, ec.category_name, ec.icon, ec.color
ORDER BY total_amount DESC;
