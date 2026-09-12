-- Migration 095: WhatsApp webhook support
-- Add wamid + updated_at + error columns to whatsapp_logs for status-update tracking
ALTER TABLE whatsapp_logs
  ADD COLUMN IF NOT EXISTS wamid          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_code     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS error_message  TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_wamid ON whatsapp_logs(wamid);

-- Table for inbound messages received via webhook
CREATE TABLE IF NOT EXISTS whatsapp_inbound_messages (
  id            BIGSERIAL PRIMARY KEY,
  wamid         VARCHAR(100) NOT NULL UNIQUE,
  from_phone    VARCHAR(20)  NOT NULL,
  message_type  VARCHAR(20)  NOT NULL DEFAULT 'text',
  body          TEXT,
  received_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_from ON whatsapp_inbound_messages(from_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_time ON whatsapp_inbound_messages(received_at DESC);
