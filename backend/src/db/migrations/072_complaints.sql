-- Migration 072: Complaint & feedback portal
CREATE TABLE IF NOT EXISTS complaints (
  id              SERIAL PRIMARY KEY,
  submitted_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category        VARCHAR(50) NOT NULL
                  CHECK (category IN ('academic', 'facilities', 'staff', 'administration', 'harassment', 'other')),
  subject         VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL,
  anonymous       BOOLEAN NOT NULL DEFAULT false,
  priority        VARCHAR(10) NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status          VARCHAR(20) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'in_review', 'resolved', 'closed', 'rejected')),
  assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolution      TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- Threaded responses / comments on a complaint
CREATE TABLE IF NOT EXISTS complaint_responses (
  id           SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  author_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message      TEXT NOT NULL,
  internal     BOOLEAN NOT NULL DEFAULT false,   -- staff-only note if true
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_status     ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category   ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_submitted  ON complaints(submitted_by);
CREATE INDEX IF NOT EXISTS idx_complaint_resp        ON complaint_responses(complaint_id);
