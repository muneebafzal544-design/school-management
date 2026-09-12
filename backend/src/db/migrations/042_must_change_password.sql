-- A1 fix: force password change on first login for auto-generated credentials
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email VARCHAR(200);

-- Existing records keep must_change_password = false (they've already set passwords)
