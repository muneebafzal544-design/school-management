-- Migration 065: Push notification tokens (Expo / FCM)
CREATE TABLE IF NOT EXISTS push_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER,
  student_id  INTEGER,
  role        VARCHAR(50),
  token       VARCHAR(500) NOT NULL,
  platform    VARCHAR(20) NOT NULL DEFAULT 'unknown',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ,
  UNIQUE(token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_student_id ON push_tokens(student_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_role       ON push_tokens(role) WHERE active = true;
