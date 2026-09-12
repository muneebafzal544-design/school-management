-- ============================================================
--  Transport Management System — Additive Migration
--  Safe to re-run: CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE
--  No existing tables are modified.
-- ============================================================

-- ── 1. BUSES ─────────────────────────────────────────────────
--   Master registry of school transport vehicles.
--   Scalable: GPS fields, insurance, etc. can be added later.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buses (
  id               SERIAL        PRIMARY KEY,
  bus_number       VARCHAR(20)   NOT NULL UNIQUE,     -- e.g. "Bus-01"
  vehicle_number   VARCHAR(30)   NOT NULL UNIQUE,     -- registration plate
  capacity         INT           NOT NULL CHECK (capacity > 0),
  make_model       VARCHAR(100),                       -- e.g. "Toyota Coaster"
  manufacture_year INT           CHECK (manufacture_year BETWEEN 1980 AND 2100),

  -- ── Driver info (denormalised for now, extractable to drivers table later)
  driver_name      VARCHAR(100),
  driver_phone     VARCHAR(20),
  driver_license   VARCHAR(50),

  -- ── Future-proof fields (nullable until features are built)
  gps_device_id    VARCHAR(50),                        -- GPS tracker serial
  insurance_expiry DATE,                               -- for maintenance alerts

  status           VARCHAR(20)   NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','inactive','maintenance')),

  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bus_status ON buses(status);

-- ── 2. ROUTES ────────────────────────────────────────────────
--   Defines the named paths buses travel each day.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transport_routes (
  id               SERIAL        PRIMARY KEY,
  route_name       VARCHAR(100)  NOT NULL UNIQUE,     -- e.g. "Route 1 – City Center"
  description      TEXT,
  start_point      VARCHAR(150)  NOT NULL,
  end_point        VARCHAR(150)  NOT NULL,
  estimated_time   INT,                                -- minutes (one way)
  distance_km      NUMERIC(6,2),                       -- for future GPS validation
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_active ON transport_routes(is_active);

-- ── 3. ROUTE STOPS ───────────────────────────────────────────
--   Ordered pickup / drop-off points on a route.
--   stop_order must be unique per route.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS route_stops (
  id               SERIAL        PRIMARY KEY,
  route_id         INT           NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  stop_name        VARCHAR(150)  NOT NULL,
  stop_order       INT           NOT NULL CHECK (stop_order > 0),
  pickup_time      TIME,                               -- morning pickup
  dropoff_time     TIME,                               -- afternoon drop
  landmark         VARCHAR(200),                       -- helpful description
  latitude         NUMERIC(10,7),                      -- for future map integration
  longitude        NUMERIC(10,7),

  CONSTRAINT uq_stop_order UNIQUE (route_id, stop_order)
);

CREATE INDEX IF NOT EXISTS idx_stop_route ON route_stops(route_id);

-- ── 4. BUS–ROUTE ASSIGNMENTS ─────────────────────────────────
--   Binds a specific bus to a specific route for an academic year.
--   One bus can serve only one route per academic year.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bus_route_assignments (
  id               SERIAL        PRIMARY KEY,
  bus_id           INT           NOT NULL REFERENCES buses(id) ON DELETE RESTRICT,
  route_id         INT           NOT NULL REFERENCES transport_routes(id) ON DELETE RESTRICT,
  academic_year    VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  assigned_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- A bus cannot be assigned to two routes in the same academic year
  CONSTRAINT uq_bus_year UNIQUE (bus_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_bra_route   ON bus_route_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_bra_year    ON bus_route_assignments(academic_year);

-- ── 5. STUDENT TRANSPORT ASSIGNMENTS ─────────────────────────
--   Maps a student to a route + stop + bus for a given year.
--   Enforces: one assignment per student per academic year.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_transport (
  id               SERIAL        PRIMARY KEY,
  student_id       INT           NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  route_id         INT           NOT NULL REFERENCES transport_routes(id) ON DELETE RESTRICT,
  stop_id          INT           REFERENCES route_stops(id) ON DELETE SET NULL,
  bus_id           INT           NOT NULL REFERENCES buses(id) ON DELETE RESTRICT,
  academic_year    VARCHAR(10)   NOT NULL DEFAULT '2024-25',
  status           VARCHAR(20)   NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','inactive','suspended')),
  assigned_date    DATE          NOT NULL DEFAULT CURRENT_DATE,

  -- Transport type: pickup only, drop only, or both ways
  transport_type   VARCHAR(20)   NOT NULL DEFAULT 'both'
                   CHECK (transport_type IN ('pickup','dropoff','both')),

  -- ── Future: fee linkage
  monthly_fee      NUMERIC(10,2),                      -- transport fee per month
  fee_status       VARCHAR(20)   NOT NULL DEFAULT 'unpaid'
                   CHECK (fee_status IN ('paid','unpaid','waived')),

  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- One transport assignment per student per academic year
  CONSTRAINT uq_student_transport_year UNIQUE (student_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_st_student  ON student_transport(student_id);
CREATE INDEX IF NOT EXISTS idx_st_route    ON student_transport(route_id);
CREATE INDEX IF NOT EXISTS idx_st_bus      ON student_transport(bus_id);
CREATE INDEX IF NOT EXISTS idx_st_year     ON student_transport(academic_year);
CREATE INDEX IF NOT EXISTS idx_st_status   ON student_transport(status);

-- Composite: most common dashboard query
CREATE INDEX IF NOT EXISTS idx_st_year_status
  ON student_transport(academic_year, status);

-- ── 6. SEED — BUSES ──────────────────────────────────────────
INSERT INTO buses
  (bus_number, vehicle_number, capacity, make_model, manufacture_year, driver_name, driver_phone, status)
VALUES
  ('Bus-01', 'LEA-1234', 35, 'Toyota Coaster',  2019, 'Muhammad Arif',    '0300-1234567', 'active'),
  ('Bus-02', 'LEA-5678', 30, 'Hino FB',         2020, 'Ahmed Raza',       '0301-2345678', 'active'),
  ('Bus-03', 'LEB-3456', 40, 'Isuzu NQR',       2021, 'Tariq Mehmood',    '0302-3456789', 'active'),
  ('Bus-04', 'LEB-7890', 35, 'Toyota Coaster',  2018, 'Khalid Hussain',   '0303-4567890', 'active'),
  ('Bus-05', 'LEC-2345', 25, 'Suzuki Carry Van', 2022, 'Imran Shah',      '0304-5678901', 'maintenance')
ON CONFLICT DO NOTHING;

-- ── 7. SEED — ROUTES ─────────────────────────────────────────
INSERT INTO transport_routes
  (route_name, description, start_point, end_point, estimated_time, distance_km)
VALUES
  ('Route 1 – City Center',  'Covers main city area and commercial zones',     'School Main Gate',  'City Center Chowk',    25, 8.5),
  ('Route 2 – North Area',   'Covers northern residential colonies',           'School Main Gate',  'North Town Phase-5',   30, 12.0),
  ('Route 3 – East Colony',  'Covers Model Town and east-side neighbourhoods', 'School Main Gate',  'East Colony Sector-3', 20, 7.0),
  ('Route 4 – South Bypass', 'Covers Defence and Cantt area',                  'School Main Gate',  'Defence Phase-2 Gate', 35, 14.5),
  ('Route 5 – West Gardens', 'Covers Johar Town and Gulberg West',             'School Main Gate',  'Gulberg West Block-D', 28, 10.0)
ON CONFLICT DO NOTHING;

-- ── 8. SEED — ROUTE STOPS ────────────────────────────────────
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT r.id, s.stop_name, s.stop_order, s.pickup_time::TIME, s.dropoff_time::TIME, s.landmark
FROM (VALUES
  ('Route 1 – City Center',  'School Main Gate',         1, '07:00', '14:00', 'School entrance'),
  ('Route 1 – City Center',  'Allama Iqbal Town Chowk',  2, '07:15', '14:20', 'Near MCB Bank'),
  ('Route 1 – City Center',  'Ghosia Market Stop',       3, '07:22', '14:28', 'Opposite Ghosia Masjid'),
  ('Route 1 – City Center',  'Railway Station Gate',     4, '07:30', '14:35', 'Main railway gate'),
  ('Route 1 – City Center',  'City Center Chowk',        5, '07:45', '14:50', 'Terminal stop'),

  ('Route 2 – North Area',   'School Main Gate',         1, '07:00', '14:00', 'School entrance'),
  ('Route 2 – North Area',   'Wapda Town Roundabout',    2, '07:12', '14:18', 'Near Wapda offices'),
  ('Route 2 – North Area',   'Iqbal Town Phase-2',       3, '07:20', '14:25', 'Petrol pump corner'),
  ('Route 2 – North Area',   'Green Town Flyover',       4, '07:28', '14:32', 'Under flyover'),
  ('Route 2 – North Area',   'North Town Phase-5',       5, '07:40', '14:45', 'Terminal stop'),

  ('Route 3 – East Colony',  'School Main Gate',         1, '07:00', '14:00', 'School entrance'),
  ('Route 3 – East Colony',  'Model Town Block-B',       2, '07:10', '14:12', 'Near LDA office'),
  ('Route 3 – East Colony',  'Muslim Town Roundabout',   3, '07:18', '14:20', 'Iqra University road'),
  ('Route 3 – East Colony',  'East Colony Sector-3',     4, '07:28', '14:30', 'Terminal stop'),

  ('Route 4 – South Bypass', 'School Main Gate',         1, '07:00', '14:00', 'School entrance'),
  ('Route 4 – South Bypass', 'Cavalry Ground Stop',      2, '07:15', '14:18', 'Cavalry ground park'),
  ('Route 4 – South Bypass', 'Cantt Main Bazaar',        3, '07:22', '14:26', 'Near cantt hospital'),
  ('Route 4 – South Bypass', 'Defence Phase-1 Gate',    4, '07:30', '14:33', 'DHA phase-1 entrance'),
  ('Route 4 – South Bypass', 'Defence Phase-2 Gate',    5, '07:45', '14:45', 'Terminal stop'),

  ('Route 5 – West Gardens', 'School Main Gate',         1, '07:00', '14:00', 'School entrance'),
  ('Route 5 – West Gardens', 'Johar Town Chowk',         2, '07:12', '14:15', 'Near Q-mart'),
  ('Route 5 – West Gardens', 'Gulberg Main Boulevard',   3, '07:20', '14:22', 'Hussain Chowk'),
  ('Route 5 – West Gardens', 'Gulberg West Block-D',     4, '07:35', '14:35', 'Terminal stop')
) AS s(route_name, stop_name, stop_order, pickup_time, dropoff_time, landmark)
JOIN transport_routes r ON r.route_name = s.route_name
ON CONFLICT DO NOTHING;

-- ── 9. SEED — BUS–ROUTE ASSIGNMENTS ─────────────────────────
INSERT INTO bus_route_assignments (bus_id, route_id, academic_year)
SELECT b.id, r.id, '2024-25'
FROM (VALUES
  ('Bus-01', 'Route 1 – City Center'),
  ('Bus-02', 'Route 2 – North Area'),
  ('Bus-03', 'Route 3 – East Colony'),
  ('Bus-04', 'Route 4 – South Bypass')
) AS a(bus_number, route_name)
JOIN buses             b ON b.bus_number  = a.bus_number
JOIN transport_routes  r ON r.route_name  = a.route_name
ON CONFLICT DO NOTHING;

-- ── 10. SEED — STUDENT TRANSPORT ASSIGNMENTS ─────────────────
-- Assign first 12 students (if they exist) to routes for demo purposes
INSERT INTO student_transport
  (student_id, route_id, stop_id, bus_id, academic_year, transport_type, monthly_fee)
SELECT
  s.id                    AS student_id,
  a.route_id,
  a.stop_id,
  a.bus_id,
  '2024-25'               AS academic_year,
  'both'                  AS transport_type,
  1500.00                 AS monthly_fee
FROM (
  -- Pick students ranked 1-12 and map them round-robin to bus-route assignments
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM students
  LIMIT 12
) s
JOIN LATERAL (
  SELECT bra.route_id, bra.bus_id,
         (SELECT rs.id FROM route_stops rs
          WHERE rs.route_id = bra.route_id
          ORDER BY rs.stop_order
          OFFSET (s.rn % 3) LIMIT 1) AS stop_id
  FROM bus_route_assignments bra
  WHERE bra.academic_year = '2024-25' AND bra.is_active = TRUE
  ORDER BY (s.rn % (SELECT COUNT(*) FROM bus_route_assignments WHERE academic_year = '2024-25'))
  LIMIT 1
) a ON TRUE
ON CONFLICT DO NOTHING;

-- ── ANALYTICAL VIEWS ─────────────────────────────────────────

-- ── View A: Full student transport info ──────────────────────
DROP VIEW IF EXISTS vw_student_transport;
CREATE OR REPLACE VIEW vw_student_transport AS
SELECT
  st.id,
  st.student_id,
  s.full_name                           AS student_name,
  s.roll_number,
  c.name || ' – ' || c.section         AS class_section,
  r.route_name,
  rs.stop_name,
  rs.pickup_time,
  rs.dropoff_time,
  b.bus_number,
  b.driver_name,
  b.driver_phone,
  st.transport_type,
  st.status,
  st.academic_year,
  st.monthly_fee,
  st.fee_status,
  st.assigned_date
FROM student_transport st
JOIN students            s  ON s.id  = st.student_id
LEFT JOIN classes        c  ON c.id  = s.class_id
JOIN transport_routes    r  ON r.id  = st.route_id
LEFT JOIN route_stops    rs ON rs.id = st.stop_id
JOIN buses               b  ON b.id  = st.bus_id;

-- ── View B: Bus occupancy summary ────────────────────────────
CREATE OR REPLACE VIEW vw_bus_occupancy AS
SELECT
  b.id             AS bus_id,
  b.bus_number,
  b.vehicle_number,
  b.capacity,
  b.driver_name,
  b.status         AS bus_status,
  r.route_name,
  bra.academic_year,
  COUNT(st.id)     AS assigned_students,
  b.capacity - COUNT(st.id) AS available_seats,
  ROUND(COUNT(st.id) * 100.0 / NULLIF(b.capacity, 0), 1) AS occupancy_pct
FROM buses b
LEFT JOIN bus_route_assignments bra ON bra.bus_id  = b.id AND bra.is_active = TRUE
LEFT JOIN transport_routes      r   ON r.id        = bra.route_id
LEFT JOIN student_transport     st  ON st.bus_id   = b.id
  AND st.status = 'active'
  AND st.academic_year = bra.academic_year
GROUP BY b.id, b.bus_number, b.vehicle_number, b.capacity, b.driver_name, b.status,
         r.route_name, bra.academic_year;

-- ── View C: Route passenger count ────────────────────────────
CREATE OR REPLACE VIEW vw_route_summary AS
SELECT
  r.id             AS route_id,
  r.route_name,
  r.start_point,
  r.end_point,
  r.estimated_time,
  r.is_active,
  COUNT(DISTINCT rs.id)   AS total_stops,
  COUNT(DISTINCT st.id)   AS assigned_students,
  b.bus_number,
  b.capacity
FROM transport_routes r
LEFT JOIN route_stops           rs  ON rs.route_id = r.id
LEFT JOIN bus_route_assignments bra ON bra.route_id = r.id AND bra.is_active = TRUE
LEFT JOIN buses                 b   ON b.id = bra.bus_id
LEFT JOIN student_transport     st  ON st.route_id = r.id AND st.status = 'active'
GROUP BY r.id, r.route_name, r.start_point, r.end_point, r.estimated_time, r.is_active,
         b.bus_number, b.capacity;
