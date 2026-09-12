CREATE TABLE IF NOT EXISTS scholarship_applications (
  id              SERIAL        PRIMARY KEY,
  student_id      INT           NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_head_id     INT           REFERENCES fee_heads(id) ON DELETE SET NULL,
  discount_type   VARCHAR(10)   NOT NULL CHECK (discount_type IN ('fixed','percent')),
  discount_value  NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  reason          TEXT          NOT NULL,
  status          VARCHAR(20)   NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','under_review','approved','rejected')),
  admin_note      TEXT,
  reviewed_by     VARCHAR(100),
  reviewed_at     TIMESTAMPTZ,
  concession_id   INT           REFERENCES student_concessions(id) ON DELETE SET NULL,
  academic_year   VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  applied_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scholarship_student ON scholarship_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_status  ON scholarship_applications(status);
CREATE INDEX IF NOT EXISTS idx_scholarship_year    ON scholarship_applications(academic_year);
