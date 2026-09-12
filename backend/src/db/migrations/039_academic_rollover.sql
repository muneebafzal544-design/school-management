CREATE TABLE IF NOT EXISTS promotion_records (
  id                 SERIAL        PRIMARY KEY,
  from_academic_year VARCHAR(10)   NOT NULL,
  to_academic_year   VARCHAR(10)   NOT NULL,
  from_class_id      INT           REFERENCES classes(id) ON DELETE SET NULL,
  to_class_id        INT           REFERENCES classes(id) ON DELETE SET NULL,
  student_id         INT           NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  action             VARCHAR(20)   NOT NULL CHECK (action IN ('promoted','repeated','graduated','dropped')),
  promoted_by        VARCHAR(100),
  notes              TEXT,
  promoted_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promotions_student ON promotion_records(student_id);
CREATE INDEX IF NOT EXISTS idx_promotions_year    ON promotion_records(to_academic_year);
