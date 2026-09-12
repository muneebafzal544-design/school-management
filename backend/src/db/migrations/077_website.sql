-- Migration 077: School website builder
CREATE TABLE IF NOT EXISTS website_config (
  id              SERIAL PRIMARY KEY,
  school_name     VARCHAR(200),
  tagline         VARCHAR(300),
  logo_url        TEXT,
  hero_image_url  TEXT,
  hero_title      VARCHAR(300),
  hero_subtitle   TEXT,
  about_text      TEXT,
  contact_email   VARCHAR(150),
  contact_phone   VARCHAR(50),
  contact_address TEXT,
  facebook_url    TEXT,
  twitter_url     TEXT,
  instagram_url   TEXT,
  youtube_url     TEXT,
  primary_color   VARCHAR(10) DEFAULT '#2563eb',
  accent_color    VARCHAR(10) DEFAULT '#7c3aed',
  published       BOOLEAN NOT NULL DEFAULT false,
  custom_domain   VARCHAR(200),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_sections (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(30) NOT NULL
              CHECK (type IN ('gallery', 'faculty', 'achievement', 'testimonial', 'announcement', 'custom')),
  title       VARCHAR(200),
  content     TEXT,
  image_url   TEXT,
  link_url    TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  visible     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- Seed default config row if not exists
INSERT INTO website_config (school_name, tagline, hero_title, hero_subtitle, published)
SELECT 'My School', 'Excellence in Education', 'Welcome to Our School', 'Shaping the leaders of tomorrow', false
WHERE NOT EXISTS (SELECT 1 FROM website_config);
