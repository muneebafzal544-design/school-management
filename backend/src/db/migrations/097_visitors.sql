-- Migration 097: Visitor Management
CREATE TABLE IF NOT EXISTS visitors (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(150) NOT NULL,
  phone            VARCHAR(25),
  id_type          VARCHAR(30) NOT NULL DEFAULT 'cnic',
  id_number        VARCHAR(60),
  purpose          VARCHAR(50) NOT NULL DEFAULT 'meeting',
  host_name        VARCHAR(150),
  host_teacher_id  INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  entry_time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exit_time        TIMESTAMPTZ,
  notes            TEXT,
  badge_printed    BOOLEAN NOT NULL DEFAULT false,
  logged_by        INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitors_entry_time ON visitors(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_host       ON visitors(host_teacher_id);
CREATE INDEX IF NOT EXISTS idx_visitors_status     ON visitors(exit_time) WHERE exit_time IS NULL;
