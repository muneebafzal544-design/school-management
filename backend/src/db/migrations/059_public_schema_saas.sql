-- ── SaaS public-schema tables ───────────────────────────────────────────────
-- These live in the PUBLIC schema, shared across all tenants.
-- Run once against the main DB (not per-tenant).

-- Super-admin accounts (platform owner / developer)
CREATE TABLE IF NOT EXISTS public.super_admins (
  id           SERIAL       PRIMARY KEY,
  username     VARCHAR(100) NOT NULL UNIQUE,
  password     TEXT         NOT NULL,
  email        VARCHAR(200),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Registered schools
CREATE TABLE IF NOT EXISTS public.schools (
  id           SERIAL       PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  slug         VARCHAR(50)  NOT NULL UNIQUE,   -- schema name = school_{slug}
  school_code  VARCHAR(20)  NOT NULL UNIQUE,   -- typed at login e.g. GVPS
  logo_url     TEXT,
  address      TEXT,
  city         VARCHAR(100),
  phone        VARCHAR(30),
  email        VARCHAR(200),
  plan         VARCHAR(20)  NOT NULL DEFAULT 'standard',   -- standard | pro | enterprise
  status       VARCHAR(20)  NOT NULL DEFAULT 'active',     -- active | suspended | expired
  max_students INT          NOT NULL DEFAULT 500,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_code ON public.schools(school_code);
CREATE INDEX IF NOT EXISTS idx_schools_slug ON public.schools(slug);
