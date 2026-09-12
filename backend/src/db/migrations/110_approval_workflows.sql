-- Parent approval workflows for grade publication and student promotion
CREATE TABLE IF NOT EXISTS approval_workflows (
  id              SERIAL        PRIMARY KEY,
  workflow_type   VARCHAR(50)   NOT NULL CHECK (workflow_type IN ('grade_publication', 'student_promotion')),
  batch_ref       VARCHAR(100),                             -- shared key grouping all records in one admin action
  reference_id    INTEGER,                                  -- exam_id or promotion_to_class_id
  reference_name  VARCHAR(200),                             -- human-readable, e.g. "Annual Exam 2025"
  class_id        INTEGER       REFERENCES classes(id)  ON DELETE SET NULL,
  student_id      INTEGER       REFERENCES students(id) ON DELETE CASCADE,
  parent_user_id  INTEGER       REFERENCES users(id)    ON DELETE CASCADE,
  status          VARCHAR(20)   NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
  remarks         TEXT,
  requested_by    INTEGER       REFERENCES users(id)    ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ   DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_aw_status        ON approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_aw_parent        ON approval_workflows(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_aw_class         ON approval_workflows(class_id);
CREATE INDEX IF NOT EXISTS idx_aw_batch_ref     ON approval_workflows(batch_ref);
CREATE INDEX IF NOT EXISTS idx_aw_workflow_type ON approval_workflows(workflow_type);
