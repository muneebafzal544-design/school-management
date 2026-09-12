-- ============================================================
--  In-App Notifications — Additive Migration
--  Safe to re-run: CREATE TABLE IF NOT EXISTS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL        PRIMARY KEY,
  type       VARCHAR(50)   NOT NULL,
  -- types: fee_overdue, fee_due_soon, absent, library_overdue, low_stock, upcoming_exam
  title      VARCHAR(200)  NOT NULL,
  message    TEXT          NOT NULL,
  link       VARCHAR(300),
  is_read    BOOLEAN       NOT NULL DEFAULT FALSE,
  ref_key    VARCHAR(200)  UNIQUE,   -- deduplication key: type_id_date
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
