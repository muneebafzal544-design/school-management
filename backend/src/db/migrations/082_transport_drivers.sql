-- Migration 082: Proper Drivers table + vehicle type + transfer history
-- Fixes the denormalized driver_name/driver_phone text fields in buses

-- ── 1. DRIVERS TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id              SERIAL        PRIMARY KEY,
  user_id         INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  full_name       VARCHAR(100)  NOT NULL,
  cnic            VARCHAR(20)   UNIQUE,          -- e.g. 35202-1234567-1
  license_number  VARCHAR(60)   UNIQUE,
  license_expiry  DATE,
  phone           VARCHAR(20)   NOT NULL,
  emergency_phone VARCHAR(20),
  address         TEXT,
  date_of_birth   DATE,
  photo_url       VARCHAR(500),
  status          VARCHAR(20)   NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive','suspended')),
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_status  ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);

-- ── 2. EXTEND BUSES with vehicle_type + proper driver FK ─────────────────────
ALTER TABLE buses
  ADD COLUMN IF NOT EXISTS vehicle_type   VARCHAR(20) DEFAULT 'bus'
    CHECK (vehicle_type IN ('bus','van','car','coaster','mini_bus')),
  ADD COLUMN IF NOT EXISTS driver_id      INTEGER REFERENCES drivers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_buses_driver_id ON buses(driver_id);

-- ── 3. TRANSFER HISTORY ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transport_transfer_history (
  id              SERIAL        PRIMARY KEY,
  student_id      INTEGER       NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assignment_id   INTEGER       REFERENCES student_transport(id) ON DELETE SET NULL,
  from_bus_id     INTEGER       REFERENCES buses(id) ON DELETE SET NULL,
  to_bus_id       INTEGER       REFERENCES buses(id) ON DELETE SET NULL,
  from_route_id   INTEGER       REFERENCES transport_routes(id) ON DELETE SET NULL,
  to_route_id     INTEGER       REFERENCES transport_routes(id) ON DELETE SET NULL,
  from_stop_id    INTEGER       REFERENCES route_stops(id) ON DELETE SET NULL,
  to_stop_id      INTEGER       REFERENCES route_stops(id) ON DELETE SET NULL,
  transfer_reason TEXT,
  transferred_by  INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  transferred_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_student ON transport_transfer_history(student_id);
CREATE INDEX IF NOT EXISTS idx_transfer_at      ON transport_transfer_history(transferred_at DESC);

-- ── 4. SEED: Migrate existing denormalized driver data into drivers table ──────
-- Create a driver row for every distinct driver_name in buses (if not already done)
INSERT INTO drivers (full_name, phone, license_number, status)
SELECT DISTINCT
  b.driver_name,
  COALESCE(b.driver_phone,  '0000-0000000'),
  b.driver_license,
  'active'
FROM buses b
WHERE b.driver_name IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.full_name = b.driver_name)
ON CONFLICT DO NOTHING;

-- Link buses.driver_id to the new drivers table
UPDATE buses b
SET driver_id = d.id
FROM drivers d
WHERE b.driver_name = d.full_name
  AND b.driver_id IS NULL;
