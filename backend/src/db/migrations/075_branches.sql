-- Migration 075: Multi-campus / branch support
CREATE TABLE IF NOT EXISTS branches (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  code         VARCHAR(20) UNIQUE,
  address      TEXT,
  city         VARCHAR(100),
  phone        VARCHAR(30),
  principal_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  active       BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

-- Optional: link existing entities to a branch (nullable = main/default campus)
ALTER TABLE classes   ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE students  ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE users     ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classes_branch  ON classes(branch_id);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_branch    ON users(branch_id);
