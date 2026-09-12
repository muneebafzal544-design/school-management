-- ============================================================
--  School Events Calendar — Additive Migration
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id            SERIAL        PRIMARY KEY,
  title         VARCHAR(255)  NOT NULL,
  description   TEXT,
  start_date    DATE          NOT NULL,
  end_date      DATE,
  type          VARCHAR(30)   NOT NULL DEFAULT 'general',
  -- types: general, exam, holiday, meeting, sport, trip, ceremony
  color         VARCHAR(20)   NOT NULL DEFAULT '#6366f1',
  is_holiday    BOOLEAN       NOT NULL DEFAULT FALSE,
  academic_year VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_start  ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_type   ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_year   ON events(academic_year);
