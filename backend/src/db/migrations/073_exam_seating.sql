-- Migration 073: Exam seating plan generator
CREATE TABLE IF NOT EXISTS exam_halls (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  capacity     SMALLINT NOT NULL DEFAULT 30,
  rows         SMALLINT NOT NULL DEFAULT 5,
  cols         SMALLINT NOT NULL DEFAULT 6,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_seating_plans (
  id           SERIAL PRIMARY KEY,
  exam_id      INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  hall_id      INTEGER NOT NULL REFERENCES exam_halls(id) ON DELETE CASCADE,
  title        VARCHAR(255),
  strategy     VARCHAR(20) NOT NULL DEFAULT 'roll_alternating'
               CHECK (strategy IN ('roll_alternating', 'class_alternating', 'random', 'alphabetical')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (exam_id, hall_id)
);

CREATE TABLE IF NOT EXISTS exam_seat_assignments (
  id           SERIAL PRIMARY KEY,
  plan_id      INTEGER NOT NULL REFERENCES exam_seating_plans(id) ON DELETE CASCADE,
  student_id   INTEGER REFERENCES students(id) ON DELETE SET NULL,
  seat_row     SMALLINT NOT NULL,
  seat_col     SMALLINT NOT NULL,
  seat_label   VARCHAR(10),      -- e.g. "A3", "B7"
  roll_number  VARCHAR(50),      -- denormalized for quick print
  student_name VARCHAR(150),     -- denormalized
  class_name   VARCHAR(100),
  UNIQUE (plan_id, seat_row, seat_col)
);

CREATE INDEX IF NOT EXISTS idx_seating_plan    ON exam_seat_assignments(plan_id);
CREATE INDEX IF NOT EXISTS idx_seating_student ON exam_seat_assignments(student_id);
