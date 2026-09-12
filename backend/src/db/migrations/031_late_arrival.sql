CREATE TABLE IF NOT EXISTS late_arrivals (
  id            SERIAL        PRIMARY KEY,
  student_id    INT           NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id      INT           REFERENCES classes(id) ON DELETE SET NULL,
  date          DATE          NOT NULL DEFAULT CURRENT_DATE,
  arrival_time  TIME          NOT NULL,
  reason        TEXT,
  recorded_by   VARCHAR(100),
  academic_year VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_late_arrivals_student_date ON late_arrivals(student_id, date);
CREATE INDEX IF NOT EXISTS idx_late_arrivals_class ON late_arrivals(class_id);
CREATE INDEX IF NOT EXISTS idx_late_arrivals_date  ON late_arrivals(date DESC);
