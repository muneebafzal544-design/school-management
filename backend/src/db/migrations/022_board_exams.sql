-- 022_board_exams.sql
-- BISE / Board Exam Registration Tracker (Pakistani schools)

CREATE TABLE IF NOT EXISTS board_exam_registrations (
  id                SERIAL PRIMARY KEY,
  student_id        INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year     VARCHAR(20),
  board_name        VARCHAR(100) NOT NULL,          -- e.g. BISE Lahore, Federal Board
  exam_level        VARCHAR(20)  NOT NULL,          -- SSC-I, SSC-II, HSSC-I, HSSC-II
  exam_group        VARCHAR(100),                   -- Pre-Medical, Pre-Engineering, Arts, etc.
  exam_year         INT          NOT NULL,          -- 2024, 2025
  registration_no   VARCHAR(50),                   -- School-assigned reg no
  board_roll_no     VARCHAR(50),                   -- Roll number assigned by board
  centre_no         VARCHAR(30),
  centre_name       VARCHAR(200),
  registration_date DATE,
  fee_paid          BOOLEAN      DEFAULT FALSE,
  fee_amount        NUMERIC(10,2),
  status            VARCHAR(20)  DEFAULT 'registered'
    CHECK (status IN ('registered','appeared','result_awaited','passed','failed','cancelled')),
  total_marks       INT,
  obtained_marks    INT,
  grade             VARCHAR(5),
  remarks           TEXT,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_exam_student  ON board_exam_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_board_exam_year     ON board_exam_registrations(exam_year);
CREATE INDEX IF NOT EXISTS idx_board_exam_level    ON board_exam_registrations(exam_level);
CREATE INDEX IF NOT EXISTS idx_board_exam_status   ON board_exam_registrations(status);
