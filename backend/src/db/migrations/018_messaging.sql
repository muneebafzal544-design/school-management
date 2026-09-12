-- Messaging system: parent ↔ teacher thread-based conversations
-- Each conversation is optionally linked to a student

CREATE TABLE IF NOT EXISTS conversations (
  id          SERIAL PRIMARY KEY,
  subject     TEXT        NOT NULL DEFAULT 'General',
  student_id  INT         REFERENCES students(id) ON DELETE SET NULL,
  created_by  INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at    TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INT         NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT        NOT NULL CHECK (char_length(body) > 0),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast inbox queries
CREATE INDEX IF NOT EXISTS idx_msg_conversation ON messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_participants ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_updated ON conversations(updated_at DESC);
