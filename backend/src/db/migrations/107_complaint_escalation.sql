-- Complaint SLA escalation: add escalated_at column + status value
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- Extend status CHECK to include 'escalated'
ALTER TABLE complaints
  DROP CONSTRAINT IF EXISTS complaints_status_check;

ALTER TABLE complaints
  ADD CONSTRAINT complaints_status_check
    CHECK (status IN ('open', 'in_review', 'escalated', 'resolved', 'closed', 'rejected'));

-- Setting: complaint_sla_days (default 3 days before escalation)
INSERT INTO settings (key, value, updated_at)
  VALUES ('complaint_sla_days', '3', NOW())
  ON CONFLICT (key) DO NOTHING;
