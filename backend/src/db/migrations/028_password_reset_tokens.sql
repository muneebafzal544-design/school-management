-- ─────────────────────────────────────────────────────────────────
-- Migration 028 · Password reset tokens
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64)  NOT NULL UNIQUE,  -- SHA-256 of the raw random token
  expires_at  TIMESTAMPTZ  NOT NULL,         -- 1 hour TTL
  used_at     TIMESTAMPTZ,                   -- NULL = not yet used
  ip_address  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_user    ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_hash    ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_expires ON password_reset_tokens(expires_at);
