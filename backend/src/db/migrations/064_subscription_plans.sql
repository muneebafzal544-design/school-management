-- Migration 064: Subscription plans (public schema — SaaS billing)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  price_monthly   NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly    NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_students    INTEGER NOT NULL DEFAULT 200,
  max_teachers    INTEGER NOT NULL DEFAULT 20,
  features        TEXT[] NOT NULL DEFAULT '{}',
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_subscriptions (
  id          SERIAL PRIMARY KEY,
  school_id   INTEGER NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id     INTEGER NOT NULL REFERENCES public.subscription_plans(id),
  status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id)
);

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id          SERIAL PRIMARY KEY,
  school_id   INTEGER NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id     INTEGER NOT NULL REFERENCES public.subscription_plans(id),
  amount      NUMERIC(10,2) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default plans
INSERT INTO public.subscription_plans (name, price_monthly, price_yearly, max_students, max_teachers, features) VALUES
  ('Starter',     1500,  15000,  200,  10,  ARRAY['basic_reports','whatsapp_notifications']),
  ('Growth',      3000,  30000,  500,  30,  ARRAY['basic_reports','whatsapp_notifications','whatsapp_bulk','risk_engine','custom_branding']),
  ('Institution', 6000,  60000, 2000, 100,  ARRAY['basic_reports','whatsapp_notifications','whatsapp_bulk','risk_engine','custom_branding','api_access','multi_branch','priority_support'])
ON CONFLICT DO NOTHING;
