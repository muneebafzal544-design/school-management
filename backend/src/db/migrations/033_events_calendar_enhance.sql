ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type VARCHAR(30)
  CHECK (event_type IN ('holiday','exam_schedule','parent_meeting','sports','trip','ceremony','general'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS target_class_id INT REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS visible_to_parents BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE events SET event_type = 'general' WHERE event_type IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_target_class   ON events(target_class_id);
CREATE INDEX IF NOT EXISTS idx_events_parent_visible ON events(visible_to_parents);
