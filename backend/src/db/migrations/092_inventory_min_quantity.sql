-- Migration 092: Add min_quantity threshold to inventory items for low-stock alerts
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS min_quantity INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_inventory_low_stock
  ON inventory_items(quantity)
  WHERE quantity > 0;
