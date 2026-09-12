-- Academic Years & School Settings
CREATE TABLE IF NOT EXISTS academic_years (
  id         SERIAL PRIMARY KEY,
  label      VARCHAR(20) NOT NULL UNIQUE,
  start_date DATE        NOT NULL,
  end_date   DATE        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('school_name',    'School Management System'),
  ('school_address', ''),
  ('school_phone',   ''),
  ('school_email',   ''),
  ('school_motto',   ''),
  ('currency',       'PKR'),
  ('active_academic_year', '')
ON CONFLICT (key) DO NOTHING;

-- Seed a default academic year if none exists
INSERT INTO academic_years (label, start_date, end_date, is_active)
SELECT '2024-2025', '2024-04-01', '2025-03-31', TRUE
WHERE NOT EXISTS (SELECT 1 FROM academic_years);
