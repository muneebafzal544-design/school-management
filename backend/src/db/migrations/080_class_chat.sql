-- ============================================================
--  Migration 080: Class-based Chat System
--  Slack-style: class rooms + announcement channels
--  Does NOT touch existing messages/conversations tables.
-- ============================================================

-- ── 1. CHAT ROOMS ─────────────────────────────────────────────
--   Two rooms auto-exist per class: class_chat + announcement.
--   UNIQUE(class_id, type) prevents duplicates.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_rooms (
  id          SERIAL       PRIMARY KEY,
  class_id    INT          NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  type        VARCHAR(20)  NOT NULL
              CHECK (type IN ('class_chat', 'announcement')),
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, type)
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_class ON chat_rooms(class_id);

-- ── 2. CHAT MESSAGES ──────────────────────────────────────────
--   BIGSERIAL for future-proof IDs on high-volume tables.
--   Soft-delete (is_deleted=true) preserves thread context.
--   message_type drives frontend rendering (text vs image vs file).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id            BIGSERIAL    PRIMARY KEY,
  room_id       INT          NOT NULL REFERENCES chat_rooms(id)  ON DELETE CASCADE,
  sender_id     INT          NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
  content       TEXT,                              -- NULL for pure file messages
  file_url      TEXT,                              -- NULL for pure text messages
  file_name     VARCHAR(255),
  file_size     INT,                               -- bytes
  file_type     VARCHAR(50),                       -- MIME type, e.g. image/jpeg
  message_type  VARCHAR(10)  NOT NULL DEFAULT 'text'
                CHECK (message_type IN ('text', 'image', 'file')),
  reply_to_id   BIGINT       REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Ensure message has either text or a file
  CONSTRAINT chk_msg_has_content CHECK (content IS NOT NULL OR file_url IS NOT NULL)
);

-- Hot-path indexes: room history (newest first) + sender lookup
CREATE INDEX IF NOT EXISTS idx_chat_msg_room    ON chat_messages(room_id, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_chat_msg_sender  ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_reply   ON chat_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- ── 3. CHAT REACTIONS ─────────────────────────────────────────
--   One row per (user, message, emoji) — same user can react
--   with different emojis but not duplicate the same one.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_reactions (
  id          SERIAL      PRIMARY KEY,
  message_id  BIGINT      NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id     INT         NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  emoji       VARCHAR(10) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_msg ON chat_reactions(message_id);

-- ── 4. READ RECEIPTS ──────────────────────────────────────────
--   Tracks the LAST read message per user per room.
--   O(users × rooms) storage — stays tiny regardless of message count.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_read_receipts (
  room_id          INT         NOT NULL REFERENCES chat_rooms(id)    ON DELETE CASCADE,
  user_id          INT         NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  last_read_msg_id BIGINT      REFERENCES chat_messages(id)          ON DELETE SET NULL,
  last_read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_receipts_user ON chat_read_receipts(user_id);

-- ── 5. AUTO-CREATE ROOMS TRIGGER ──────────────────────────────
--   Every new class automatically gets class_chat + announcement rooms.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_class_chat_rooms()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO chat_rooms (class_id, type, name)
  VALUES
    (NEW.id, 'class_chat',    NEW.name || ' — Class Chat'),
    (NEW.id, 'announcement',  NEW.name || ' — Announcements')
  ON CONFLICT (class_id, type) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_chat_rooms ON classes;
CREATE TRIGGER trg_class_chat_rooms
AFTER INSERT ON classes
FOR EACH ROW EXECUTE FUNCTION create_class_chat_rooms();

-- ── 6. SEED — rooms for every existing class ──────────────────
INSERT INTO chat_rooms (class_id, type, name)
SELECT
  c.id,
  t.type,
  c.name || CASE t.type
    WHEN 'class_chat'   THEN ' — Class Chat'
    WHEN 'announcement' THEN ' — Announcements'
  END
FROM classes c
CROSS JOIN (VALUES ('class_chat'), ('announcement')) AS t(type)
WHERE c.status = 'active'
ON CONFLICT (class_id, type) DO NOTHING;
