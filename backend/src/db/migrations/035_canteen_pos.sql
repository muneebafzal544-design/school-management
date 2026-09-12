CREATE TABLE IF NOT EXISTS canteen_items (
  id           SERIAL        PRIMARY KEY,
  name         VARCHAR(200)  NOT NULL,
  category     VARCHAR(100)  NOT NULL DEFAULT 'Food',
  price        NUMERIC(8,2)  NOT NULL CHECK (price >= 0),
  unit         VARCHAR(30)   NOT NULL DEFAULT 'piece',
  is_available BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_canteen_items_available ON canteen_items(is_available);

CREATE TABLE IF NOT EXISTS canteen_sales (
  id              SERIAL        PRIMARY KEY,
  sale_date       DATE          NOT NULL DEFAULT CURRENT_DATE,
  item_id         INT           REFERENCES canteen_items(id) ON DELETE SET NULL,
  item_name       VARCHAR(200)  NOT NULL,
  quantity        NUMERIC(8,2)  NOT NULL DEFAULT 1,
  unit_price      NUMERIC(8,2)  NOT NULL,
  total_amount    NUMERIC(10,2) NOT NULL,
  income_entry_id INT           REFERENCES income_entries(id) ON DELETE SET NULL,
  academic_year   VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_canteen_sales_date ON canteen_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_canteen_sales_item ON canteen_sales(item_id);
