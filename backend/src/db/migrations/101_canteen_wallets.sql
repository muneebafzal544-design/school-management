-- Migration 101: Student canteen wallet/credit system
CREATE TABLE IF NOT EXISTS canteen_wallets (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  balance     DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canteen_wallet_txns (
  id          SERIAL PRIMARY KEY,
  wallet_id   INTEGER NOT NULL REFERENCES canteen_wallets(id) ON DELETE CASCADE,
  type        VARCHAR(10) NOT NULL CHECK (type IN ('credit','debit')),
  amount      DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  balance_after DECIMAL(10,2) NOT NULL,
  note        TEXT,
  sale_id     INTEGER REFERENCES canteen_sales(id) ON DELETE SET NULL,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canteen_wallet_txns_wallet ON canteen_wallet_txns(wallet_id, created_at DESC);

-- Also add payment_method + wallet_deducted to canteen_sales
ALTER TABLE canteen_sales
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash','wallet')),
  ADD COLUMN IF NOT EXISTS student_id      INTEGER REFERENCES students(id) ON DELETE SET NULL;
