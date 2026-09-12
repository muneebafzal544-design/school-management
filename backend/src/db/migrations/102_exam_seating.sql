-- Migration 102: Exam seating plans
CREATE TABLE IF NOT EXISTS exam_seating_plans (
  id          SERIAL PRIMARY KEY,
  exam_name   VARCHAR(150) NOT NULL,
  hall_name   VARCHAR(100) NOT NULL,
  exam_date   DATE NOT NULL,
  rows        INTEGER NOT NULL DEFAULT 5 CHECK (rows BETWEEN 1 AND 20),
  cols        INTEGER NOT NULL DEFAULT 6 CHECK (cols BETWEEN 1 AND 20),
  notes       TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_seat_assignments (
  id          SERIAL PRIMARY KEY,
  plan_id     INTEGER NOT NULL REFERENCES exam_seating_plans(id) ON DELETE CASCADE,
  seat_row    INTEGER NOT NULL,
  seat_col    INTEGER NOT NULL,
  student_id  INTEGER REFERENCES students(id) ON DELETE SET NULL,
  roll_number VARCHAR(50),
  student_name VARCHAR(150),
  class_name  VARCHAR(100),
  UNIQUE (plan_id, seat_row, seat_col)
);

CREATE INDEX IF NOT EXISTS idx_exam_seat_plan ON exam_seat_assignments(plan_id);
