-- Migration 112: distinguish the school's founding Owner from other admin
-- accounts. Deliberately a flag on top of role='admin', not a new role
-- value — see memory/plan notes: authorization is dominated by hardcoded
-- requireRole('admin') checks across ~68 route files, so a genuine new
-- role string would need every one of those touched. An owner keeps
-- role='admin' (identical day-to-day access) and gains the sole authority
-- to create/reset/deactivate OTHER admin-level accounts.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;
