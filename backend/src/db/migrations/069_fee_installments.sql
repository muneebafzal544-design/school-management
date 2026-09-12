-- Migration 069: Fee installment plans
CREATE TABLE IF NOT EXISTS fee_installments (
  id              SERIAL PRIMARY KEY,
  invoice_id      INTEGER NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  installment_no  SMALLINT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  due_date        DATE NOT NULL,
  paid_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_at         TIMESTAMPTZ,
  payment_method  VARCHAR(20),
  status          VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                  CHECK (status IN ('unpaid','partial','paid','overdue')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invoice_id, installment_no)
);

CREATE INDEX IF NOT EXISTS idx_fee_installments_invoice_id ON fee_installments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fee_installments_due_date   ON fee_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_fee_installments_status     ON fee_installments(status);

-- Add flag to fee_invoices so we know it has an installment plan
ALTER TABLE fee_invoices
  ADD COLUMN IF NOT EXISTS has_installments BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS installment_count SMALLINT;
