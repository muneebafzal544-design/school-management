-- Inventory / Stock Management
CREATE TABLE IF NOT EXISTS inventory_items (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  category      VARCHAR(100) NOT NULL DEFAULT 'other',
  quantity      INT          NOT NULL DEFAULT 0,
  unit          VARCHAR(50)           DEFAULT 'pcs',
  condition     VARCHAR(50)           DEFAULT 'good',
  location      VARCHAR(200),
  purchase_date DATE,
  purchase_price NUMERIC(12,2),
  supplier      VARCHAR(200),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
