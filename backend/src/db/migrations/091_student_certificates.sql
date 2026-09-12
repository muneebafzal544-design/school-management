-- Migration 091: Student TC and Admission Letter certificate log
-- Tracks every TC / Admission Letter issued so duplicates can be detected

CREATE TABLE IF NOT EXISTS student_certificate_log (
  id           SERIAL        PRIMARY KEY,
  student_id   INTEGER       NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  cert_type    VARCHAR(40)   NOT NULL CHECK (cert_type IN ('tc','admission_letter')),
  cert_no      VARCHAR(60)   NOT NULL UNIQUE,   -- e.g. TC-2526-00042
  issued_by    INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  issued_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_cert_log_student ON student_certificate_log(student_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_cert_log_type    ON student_certificate_log(cert_type);

-- Seed letter_templates with student-specific doc types (idempotent)
INSERT INTO letter_templates (title, doc_type, subject_line, body)
VALUES
('Transfer Certificate', 'tc', 'Transfer Certificate – {student_name}',
 'TC_TEMPLATE'),
('Admission Confirmation Letter', 'admission_letter', 'Admission Confirmation – {student_name}',
 'ADMISSION_TEMPLATE')
ON CONFLICT DO NOTHING;
