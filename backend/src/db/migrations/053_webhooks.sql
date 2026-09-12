-- ============================================================
--  Webhook endpoints & delivery log
--  Safe to re-run: IF NOT EXISTS guards throughout
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id          SERIAL        PRIMARY KEY,
  url         TEXT          NOT NULL,
  secret      TEXT          NOT NULL,           -- HMAC-SHA256 signing secret
  events      TEXT[]        NOT NULL DEFAULT '{}',
  description TEXT,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id           SERIAL        PRIMARY KEY,
  endpoint_id  INT           REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event        TEXT          NOT NULL,
  payload      JSONB         NOT NULL,
  status       TEXT          NOT NULL DEFAULT 'pending',  -- success | failed
  http_status  INT,
  response     TEXT,
  error        TEXT,
  duration_ms  INT,
  fired_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_endpoint ON webhook_logs(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_fired    ON webhook_logs(fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status   ON webhook_logs(status);
