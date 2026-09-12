-- Migration 074: Hostel / boarding management
CREATE TABLE IF NOT EXISTS hostels (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  type         VARCHAR(10) NOT NULL DEFAULT 'boys' CHECK (type IN ('boys', 'girls', 'mixed')),
  warden_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  address      TEXT,
  capacity     INTEGER NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
  id           SERIAL PRIMARY KEY,
  hostel_id    INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_number  VARCHAR(20) NOT NULL,
  capacity     SMALLINT NOT NULL DEFAULT 2,
  floor        SMALLINT DEFAULT 1,
  type         VARCHAR(20) NOT NULL DEFAULT 'dormitory' CHECK (type IN ('dormitory', 'single', 'double', 'suite')),
  status       VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'full', 'maintenance')),
  notes        TEXT,
  UNIQUE (hostel_id, room_number)
);

CREATE TABLE IF NOT EXISTS hostel_boarders (
  id           SERIAL PRIMARY KEY,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  room_id      INTEGER NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  check_in     DATE NOT NULL DEFAULT CURRENT_DATE,
  check_out    DATE,
  active       BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, active) DEFERRABLE INITIALLY DEFERRED   -- one active room per student
);

CREATE TABLE IF NOT EXISTS hostel_fees (
  id           SERIAL PRIMARY KEY,
  boarder_id   INTEGER NOT NULL REFERENCES hostel_boarders(id) ON DELETE CASCADE,
  month        DATE NOT NULL,        -- first day of the month
  amount       NUMERIC(10,2) NOT NULL,
  paid         BOOLEAN NOT NULL DEFAULT false,
  paid_at      TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hostel_rooms_hostel ON hostel_rooms(hostel_id);
CREATE INDEX IF NOT EXISTS idx_boarders_student    ON hostel_boarders(student_id);
CREATE INDEX IF NOT EXISTS idx_boarders_room       ON hostel_boarders(room_id);
CREATE INDEX IF NOT EXISTS idx_hostel_fees_boarder ON hostel_fees(boarder_id);
