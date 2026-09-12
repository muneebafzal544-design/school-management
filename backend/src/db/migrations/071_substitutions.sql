-- Migration 071: Teacher substitution management
CREATE TABLE IF NOT EXISTS substitutions (
  id               SERIAL PRIMARY KEY,
  original_teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  substitute_teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id         INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject          VARCHAR(100),
  date             DATE NOT NULL,
  period           SMALLINT,                           -- null = full day
  reason           VARCHAR(255),
  notes            TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sub_date              ON substitutions(date DESC);
CREATE INDEX IF NOT EXISTS idx_sub_original_teacher  ON substitutions(original_teacher_id);
CREATE INDEX IF NOT EXISTS idx_sub_substitute        ON substitutions(substitute_teacher_id);
CREATE INDEX IF NOT EXISTS idx_sub_class             ON substitutions(class_id);
