-- Migration 061: WhatsApp message logs
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id             BIGSERIAL PRIMARY KEY,
  to_phone       VARCHAR(20) NOT NULL,
  template       VARCHAR(100) NOT NULL,
  params         JSONB,
  status         VARCHAR(20) NOT NULL DEFAULT 'sent',
  wa_message_id  VARCHAR(100),
  error          TEXT,
  student_id     INTEGER,
  triggered_by   VARCHAR(50),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_student_id  ON whatsapp_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status      ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at  ON whatsapp_logs(created_at DESC);
