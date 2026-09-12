-- ═══════════════════════════════════════════════════════════════════════
--  Migration 087 — Advanced Fee Module
--  Tables: fee_late_rules, fee_policy, fee_adjustments,
--           fee_defaulter_actions, fee_collection_targets
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Configurable late-fee rules ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_late_rules (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  applies_to  VARCHAR(10)  NOT NULL DEFAULT 'all'   CHECK (applies_to IN ('all','class','grade')),
  class_id    INT REFERENCES classes(id) ON DELETE CASCADE,
  grade       VARCHAR(20),
  grace_days  SMALLINT     NOT NULL DEFAULT 0,
  fine_type   VARCHAR(10)  NOT NULL DEFAULT 'percent' CHECK (fine_type IN ('fixed','percent')),
  fine_value  NUMERIC(10,2) NOT NULL CHECK (fine_value > 0),
  max_fine    NUMERIC(10,2),                    -- NULL = no cap
  recurs      BOOLEAN      NOT NULL DEFAULT false,
  recur_days  SMALLINT,                          -- interval when recurs=true
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_late_rules_active  ON fee_late_rules (is_active);
CREATE INDEX IF NOT EXISTS idx_fee_late_rules_class   ON fee_late_rules (class_id);

-- ── 2. Fee policy per academic year ────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_policy (
  id                   SERIAL PRIMARY KEY,
  academic_year        VARCHAR(9) NOT NULL UNIQUE,
  auto_generate_day    SMALLINT   NOT NULL DEFAULT 1  CHECK (auto_generate_day BETWEEN 1 AND 28),
  carry_forward        BOOLEAN    NOT NULL DEFAULT false,
  carry_forward_label  VARCHAR(50) NOT NULL DEFAULT 'Arrears',
  lock_after_days      INT,                           -- NULL = never lock
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO fee_policy (academic_year, carry_forward, carry_forward_label)
  VALUES ('2024-25', false, 'Arrears')
  ON CONFLICT (academic_year) DO NOTHING;

-- ── 3. Waiver / refund / correction adjustment requests ────────────────
CREATE TABLE IF NOT EXISTS fee_adjustments (
  id            SERIAL PRIMARY KEY,
  invoice_id    INT          NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  student_id    INT          NOT NULL REFERENCES students(id)     ON DELETE CASCADE,
  type          VARCHAR(20)  NOT NULL CHECK (type IN ('waiver','refund','correction','fine_waiver')),
  amount        NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason        TEXT         NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by  INT REFERENCES users(id),
  approved_by   INT REFERENCES users(id),
  requested_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_fee_adj_invoice   ON fee_adjustments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_fee_adj_student   ON fee_adjustments (student_id);
CREATE INDEX IF NOT EXISTS idx_fee_adj_status    ON fee_adjustments (status);

-- ── 4. Defaulter follow-up action log ──────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_defaulter_actions (
  id           SERIAL PRIMARY KEY,
  student_id   INT         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  invoice_ids  INT[]       NOT NULL DEFAULT '{}',
  action_type  VARCHAR(30) NOT NULL
                 CHECK (action_type IN ('notice_sent','parent_called','sms_sent','email_sent','escalated','resolved','other')),
  notes        TEXT,
  amount_owed  NUMERIC(12,2),
  taken_by     INT REFERENCES users(id),
  taken_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defaulter_actions_student ON fee_defaulter_actions (student_id);
CREATE INDEX IF NOT EXISTS idx_defaulter_actions_taken   ON fee_defaulter_actions (taken_at DESC);

-- ── 5. Monthly collection targets per class ─────────────────────────────
CREATE TABLE IF NOT EXISTS fee_collection_targets (
  id            SERIAL PRIMARY KEY,
  class_id      INT         NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year VARCHAR(9)  NOT NULL,
  month         VARCHAR(7)  NOT NULL,        -- YYYY-MM
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, month)
);

CREATE INDEX IF NOT EXISTS idx_fee_targets_month ON fee_collection_targets (month);
