-- Migration 078: Live Vehicle Tracking System
-- Extends existing transport tables — does NOT modify any existing columns.

-- ── 1. Extend buses with live-state columns ───────────────────────────────────
ALTER TABLE buses
  ADD COLUMN IF NOT EXISTS current_lat    NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS current_lng    NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS current_speed  NUMERIC(5, 2)   DEFAULT 0,   -- km/h
  ADD COLUMN IF NOT EXISTS last_seen      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_online      BOOLEAN         NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS driver_user_id INTEGER         REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trip_status    VARCHAR(20)     NOT NULL DEFAULT 'idle'
    CHECK (trip_status IN ('idle', 'started', 'completed'));

CREATE INDEX IF NOT EXISTS idx_buses_driver ON buses(driver_user_id);

-- ── 2. Trip sessions: one per bus per journey ─────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_sessions (
  id            SERIAL PRIMARY KEY,
  bus_id        INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  route_id      INTEGER REFERENCES transport_routes(id) ON DELETE SET NULL,
  driver_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  trip_type     VARCHAR(10) NOT NULL DEFAULT 'morning'
                CHECK (trip_type IN ('morning', 'afternoon', 'custom')),
  status        VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  start_lat     NUMERIC(10, 7),
  start_lng     NUMERIC(10, 7),
  end_lat       NUMERIC(10, 7),
  end_lng       NUMERIC(10, 7),
  total_km      NUMERIC(8, 2),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_trip_bus       ON trip_sessions(bus_id);
CREATE INDEX IF NOT EXISTS idx_trip_status    ON trip_sessions(status);
CREATE INDEX IF NOT EXISTS idx_trip_started   ON trip_sessions(started_at DESC);

-- ── 3. Trip events: picked, dropped, near-stop, emergency, etc. ───────────────
CREATE TABLE IF NOT EXISTS trip_events (
  id            SERIAL PRIMARY KEY,
  trip_id       INTEGER REFERENCES trip_sessions(id) ON DELETE SET NULL,
  bus_id        INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  student_id    INTEGER REFERENCES students(id) ON DELETE SET NULL,
  stop_id       INTEGER REFERENCES route_stops(id) ON DELETE SET NULL,
  event_type    VARCHAR(30) NOT NULL
                CHECK (event_type IN (
                  'trip_started', 'trip_ended',
                  'near_pickup', 'student_picked', 'student_dropped',
                  'overspeed', 'route_deviation', 'emergency',
                  'driver_online', 'driver_offline'
                )),
  lat           NUMERIC(10, 7),
  lng           NUMERIC(10, 7),
  speed         NUMERIC(5, 2),
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_trip    ON trip_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_events_bus     ON trip_events(bus_id);
CREATE INDEX IF NOT EXISTS idx_events_type    ON trip_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON trip_events(created_at DESC);

-- ── 4. Vehicle location ring-buffer (max 500 rows per bus, auto-purged) ───────
CREATE TABLE IF NOT EXISTS vehicle_locations (
  id         BIGSERIAL PRIMARY KEY,
  bus_id     INTEGER      NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  trip_id    INTEGER      REFERENCES trip_sessions(id) ON DELETE SET NULL,
  lat        NUMERIC(10, 7) NOT NULL,
  lng        NUMERIC(10, 7) NOT NULL,
  speed      NUMERIC(5, 2)  NOT NULL DEFAULT 0,   -- km/h
  heading    SMALLINT       NOT NULL DEFAULT 0,   -- degrees 0-359
  accuracy   NUMERIC(6, 2),                       -- GPS accuracy in metres
  recorded_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vl_bus         ON vehicle_locations(bus_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vl_trip        ON vehicle_locations(trip_id);

-- Function: purge oldest rows, keep last 500 per bus
CREATE OR REPLACE FUNCTION purge_old_locations()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM vehicle_locations
  WHERE bus_id = NEW.bus_id
    AND id NOT IN (
      SELECT id FROM vehicle_locations
      WHERE bus_id = NEW.bus_id
      ORDER BY recorded_at DESC
      LIMIT 500
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_locations ON vehicle_locations;
CREATE TRIGGER trg_purge_locations
AFTER INSERT ON vehicle_locations
FOR EACH ROW EXECUTE FUNCTION purge_old_locations();

-- ── 5. Tracking tokens: short-lived tokens for parent map access ──────────────
-- Parents use their JWT; this table is for optional shareable links
CREATE TABLE IF NOT EXISTS tracking_share_tokens (
  id         SERIAL PRIMARY KEY,
  token      VARCHAR(64) NOT NULL UNIQUE,
  bus_id     INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_share_token  ON tracking_share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_expiry ON tracking_share_tokens(expires_at);
