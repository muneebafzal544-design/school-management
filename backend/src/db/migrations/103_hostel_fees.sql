-- Migration 103: Hostel fee structure link
ALTER TABLE hostel_rooms
  ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2) DEFAULT 0;

ALTER TABLE hostels
  ADD COLUMN IF NOT EXISTS fee_head_id INTEGER REFERENCES fee_heads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_monthly_fee DECIMAL(10,2) DEFAULT 0;
