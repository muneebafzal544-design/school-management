-- ============================================================
--  Student Concessions / Discounts — Additive Migration
--  Safe to re-run: CREATE TABLE IF NOT EXISTS
-- ============================================================

CREATE TABLE IF NOT EXISTS student_concessions (
  id             SERIAL        PRIMARY KEY,
  student_id     INT           NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_head_id    INT           REFERENCES fee_heads(id) ON DELETE SET NULL,
  -- NULL fee_head_id = applies to total invoice
  discount_type  VARCHAR(10)   NOT NULL CHECK (discount_type IN ('fixed','percent')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  reason         TEXT,
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concessions_student ON student_concessions(student_id);
CREATE INDEX IF NOT EXISTS idx_concessions_active  ON student_concessions(student_id, is_active);
