-- ============================================================
--  Phase 4 — Communication & Notifications
--  Safe to re-run (IF NOT EXISTS / DO NOTHING patterns)
-- ============================================================

-- 1. Per-user notifications
--    user_id NULL = global (all admin/teachers see it)
--    user_id set  = only that user sees it
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- 2. Track whether an announcement email was broadcast
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS email_sent_count INT DEFAULT 0;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMPTZ;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS sms_sent_count INT DEFAULT 0;

-- 3. Fee reminder log (prevents duplicate sends on same day)
CREATE TABLE IF NOT EXISTS fee_reminder_log (
  id           SERIAL       PRIMARY KEY,
  invoice_id   INT          NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  channel      VARCHAR(10)  NOT NULL CHECK (channel IN ('email','sms')),
  sent_to      VARCHAR(200),
  sent_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- Prevent duplicate reminders on the same day: store the date separately
ALTER TABLE fee_reminder_log ADD COLUMN IF NOT EXISTS sent_date DATE NOT NULL DEFAULT CURRENT_DATE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_log_daily
  ON fee_reminder_log (invoice_id, channel, sent_date);
CREATE INDEX IF NOT EXISTS idx_reminder_log_invoice ON fee_reminder_log(invoice_id);
