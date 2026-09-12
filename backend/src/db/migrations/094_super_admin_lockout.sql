-- Migration 094: Super-admin login attempt tracking for account lockout
-- Mirrors the tenant-level login_attempts table but lives in public schema.

CREATE TABLE IF NOT EXISTS public.super_admin_login_attempts (
  id          SERIAL      PRIMARY KEY,
  username    VARCHAR(100) NOT NULL,
  ip_address  VARCHAR(45),
  success     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sa_attempts_username_time
  ON public.super_admin_login_attempts(username, created_at DESC);

-- Auto-purge rows older than 30 days (same policy as tenant login_attempts)
