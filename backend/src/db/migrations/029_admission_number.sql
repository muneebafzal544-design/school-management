-- Auto-generated admission number for students
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_number VARCHAR(20) UNIQUE;

-- Sequence for guaranteed-unique, gap-free numbers
CREATE SEQUENCE IF NOT EXISTS admission_number_seq START WITH 1;

-- Backfill existing students so UNIQUE constraint has no NULLs conflicting
UPDATE students
SET admission_number = 'ADM-' || EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::text
                       || '-' || LPAD(id::text, 4, '0')
WHERE admission_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
