-- Add requires_meeting flag to conversations (teacher can flag a thread as needing a PTM slot)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS requires_meeting BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS meeting_note TEXT;
