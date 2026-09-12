-- Migration 090: Online payments (JazzCash + EasyPaisa)
CREATE TABLE IF NOT EXISTS online_payments (
  id              SERIAL        PRIMARY KEY,
  invoice_id      INT           NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  student_id      INT           NOT NULL REFERENCES students(id)     ON DELETE CASCADE,
  gateway         VARCHAR(20)   NOT NULL CHECK (gateway IN ('jazzcash','easypaisa')),
  amount          NUMERIC(10,2) NOT NULL,
  phone           VARCHAR(20)   NOT NULL,
  txn_ref         VARCHAR(60)   NOT NULL UNIQUE,
  gateway_txn_id  VARCHAR(100),
  status          VARCHAR(20)   NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','completed','failed','expired')),
  response_code   VARCHAR(10),
  response_desc   TEXT,
  initiated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  raw_response    JSONB
);

CREATE INDEX IF NOT EXISTS idx_op_invoice   ON online_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_op_student   ON online_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_op_txn_ref   ON online_payments(txn_ref);
CREATE INDEX IF NOT EXISTS idx_op_status    ON online_payments(status);
CREATE INDEX IF NOT EXISTS idx_op_initiated ON online_payments(initiated_at DESC);
