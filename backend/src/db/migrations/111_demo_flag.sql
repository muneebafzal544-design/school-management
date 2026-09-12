-- Migration 111: mark a school as an auto-seeded demo/trial (public schema).
-- Explicitly public.-qualified so it's safe to replay inside any tenant's
-- migration set (same pattern as 094_super_admin_lockout.sql /
-- 095_whatsapp_webhook_tables.sql) — it only ever touches public.schools
-- regardless of the current search_path.
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
