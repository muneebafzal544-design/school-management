-- Migration 089: Indexes missing from chat, tracking, and document tables
-- All idempotent (IF NOT EXISTS throughout).

-- chat_messages: sender lookup — "show my messages in this room"
CREATE INDEX IF NOT EXISTS idx_chat_msg_sender
  ON chat_messages(sender_id, created_at DESC);

-- chat_messages: reply thread lookup
CREATE INDEX IF NOT EXISTS idx_chat_msg_reply
  ON chat_messages(reply_to_id)
  WHERE reply_to_id IS NOT NULL;

-- trip_events: student boarding/drop history
CREATE INDEX IF NOT EXISTS idx_trip_events_student
  ON trip_events(student_id);

-- trip_events: per-bus event feed (ordered by time)
CREATE INDEX IF NOT EXISTS idx_trip_events_bus_time
  ON trip_events(bus_id, created_at DESC);

-- letter_templates: filter by doc_type (appointment, experience, etc.)
CREATE INDEX IF NOT EXISTS idx_letter_templates_type
  ON letter_templates(doc_type)
  WHERE is_active = TRUE;
