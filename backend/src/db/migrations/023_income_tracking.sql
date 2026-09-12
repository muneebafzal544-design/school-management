-- ── Income Tracking ─────────────────────────────────────────────────────────
-- Income categories (tuition, admissions, donations, canteen, etc.)
CREATE TABLE IF NOT EXISTS income_categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  color       VARCHAR(20)  NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Income entries
CREATE TABLE IF NOT EXISTS income_entries (
  id             SERIAL PRIMARY KEY,
  category_id    INT          NOT NULL REFERENCES income_categories(id),
  title          VARCHAR(200) NOT NULL,
  description    TEXT,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  income_date    DATE         NOT NULL,
  payment_method VARCHAR(30)  NOT NULL DEFAULT 'cash'
                   CHECK (payment_method IN ('cash','bank_transfer','cheque','online','card')),
  reference_no   VARCHAR(100),
  academic_year  VARCHAR(20),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_entries_date       ON income_entries(income_date DESC);
CREATE INDEX IF NOT EXISTS idx_income_entries_category   ON income_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_acad_year  ON income_entries(academic_year);

-- Default categories
INSERT INTO income_categories (name, color, description) VALUES
  ('Tuition Fees',   '#10B981', 'Monthly school fee collection'),
  ('Admission Fees', '#3B82F6', 'New student registration & admission'),
  ('Donations',      '#F59E0B', 'Charitable donations & grants'),
  ('Canteen',        '#EF4444', 'School canteen / tuck shop revenue'),
  ('Transport',      '#8B5CF6', 'Van & transport charges'),
  ('Exam Fees',      '#06B6D4', 'Board exam & internal test fees'),
  ('Other',          '#6B7280', 'Miscellaneous income')
ON CONFLICT (name) DO NOTHING;
