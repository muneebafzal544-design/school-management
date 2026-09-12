-- Medical leave: add leave date range + certificate flag to medical visits
ALTER TABLE student_medical_visits
  ADD COLUMN IF NOT EXISTS leave_from_date  DATE,
  ADD COLUMN IF NOT EXISTS leave_to_date    DATE,
  ADD COLUMN IF NOT EXISTS has_certificate  BOOLEAN NOT NULL DEFAULT FALSE;
