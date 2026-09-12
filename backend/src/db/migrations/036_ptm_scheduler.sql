CREATE TABLE IF NOT EXISTS meeting_slots (
  id            SERIAL        PRIMARY KEY,
  teacher_id    INT           NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  slot_date     DATE          NOT NULL,
  start_time    TIME          NOT NULL,
  end_time      TIME          NOT NULL,
  duration_min  SMALLINT      NOT NULL DEFAULT 15,
  location      VARCHAR(200),
  is_booked     BOOLEAN       NOT NULL DEFAULT FALSE,
  academic_year VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meeting_slots_teacher ON meeting_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_meeting_slots_date    ON meeting_slots(slot_date);

CREATE TABLE IF NOT EXISTS meeting_bookings (
  id            SERIAL        PRIMARY KEY,
  slot_id       INT           NOT NULL REFERENCES meeting_slots(id) ON DELETE CASCADE,
  student_id    INT           NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_name   VARCHAR(200),
  parent_phone  VARCHAR(30),
  parent_email  VARCHAR(200),
  notes         TEXT,
  status        VARCHAR(20)   NOT NULL DEFAULT 'confirmed'
                  CHECK (status IN ('confirmed','cancelled','completed','no_show')),
  notify_sent   BOOLEAN       NOT NULL DEFAULT FALSE,
  booked_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_bookings_slot_confirmed
  ON meeting_bookings(slot_id) WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_student ON meeting_bookings(student_id);
