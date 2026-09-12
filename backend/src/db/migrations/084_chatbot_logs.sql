-- Migration 084: Chatbot query logs
-- Stores user queries for analytics and improvement.
-- Non-critical — chatbot works without this table; inserts are fire-and-forget.

CREATE TABLE IF NOT EXISTS chatbot_logs (
  id               BIGSERIAL    PRIMARY KEY,
  user_id          INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message          VARCHAR(500) NOT NULL,
  intent           VARCHAR(60)  NOT NULL,
  response_preview VARCHAR(200),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_logs_user    ON chatbot_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_intent  ON chatbot_logs(intent);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_created ON chatbot_logs(created_at DESC);
