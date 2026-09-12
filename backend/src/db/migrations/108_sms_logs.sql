-- SMS log table for outbound messages
CREATE TABLE IF NOT EXISTS sms_logs (
  id          SERIAL        PRIMARY KEY,
  to_number   VARCHAR(20)   NOT NULL,
  message     VARCHAR(500)  NOT NULL,
  status      VARCHAR(10)   NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  provider    VARCHAR(20),
  message_id  VARCHAR(100),
  error_msg   TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status     ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);
