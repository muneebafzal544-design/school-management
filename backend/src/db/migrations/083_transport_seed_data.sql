-- 083_transport_seed_data.sql
-- Enriches transport data: better vehicle types, links all buses to routes,
-- adds stops for all routes, links drivers to buses.

-- ── Update buses with vehicle types and link to drivers ───────────────────────
UPDATE buses SET vehicle_type = 'bus',      make_model = 'Toyota Coaster 2019'  WHERE id = 1;
UPDATE buses SET vehicle_type = 'van',      make_model = 'Toyota HiAce 2021'    WHERE id = 2;
UPDATE buses SET vehicle_type = 'coaster',  make_model = 'Hino Coaster 2020'    WHERE id = 3;
UPDATE buses SET vehicle_type = 'mini_bus', make_model = 'Suzuki Every 2022'    WHERE id = 4;
UPDATE buses SET vehicle_type = 'bus',      make_model = 'Isuzu NPR 2018'       WHERE id = 5;

-- Link each bus to its corresponding driver (by position)
UPDATE buses SET driver_id = 1 WHERE id = 1 AND driver_id IS NULL;
UPDATE buses SET driver_id = 2 WHERE id = 2 AND driver_id IS NULL;
UPDATE buses SET driver_id = 3 WHERE id = 3 AND driver_id IS NULL;
UPDATE buses SET driver_id = 4 WHERE id = 4 AND driver_id IS NULL;
UPDATE buses SET driver_id = 5 WHERE id = 5 AND driver_id IS NULL;

-- ── Ensure all 5 buses have route assignments ─────────────────────────────────
INSERT INTO bus_route_assignments (bus_id, route_id, academic_year, is_active)
VALUES
  (1, 1, '2024-25', TRUE),
  (2, 2, '2024-25', TRUE),
  (3, 3, '2024-25', TRUE),
  (4, 4, '2024-25', TRUE),
  (5, 5, '2024-25', TRUE)
ON CONFLICT DO NOTHING;

-- Deactivate old duplicate assignments
UPDATE bus_route_assignments SET is_active = FALSE
WHERE id NOT IN (
  SELECT DISTINCT ON (bus_id) id FROM bus_route_assignments ORDER BY bus_id, id DESC
);

-- ── Enrich route details ──────────────────────────────────────────────────────
UPDATE transport_routes SET
  start_point    = 'School Gate',
  end_point      = 'City Center – Model Town',
  distance_km    = 12.5,
  estimated_time = 35
WHERE id = 1;

UPDATE transport_routes SET
  start_point    = 'School Gate',
  end_point      = 'North Area – Johar Town',
  distance_km    = 9.8,
  estimated_time = 28
WHERE id = 2;

UPDATE transport_routes SET
  start_point    = 'School Gate',
  end_point      = 'East Colony – Gulberg',
  distance_km    = 7.2,
  estimated_time = 22
WHERE id = 3;

UPDATE transport_routes SET
  start_point    = 'School Gate',
  end_point      = 'South Zone – DHA Phase 5',
  distance_km    = 14.1,
  estimated_time = 40
WHERE id = 4;

UPDATE transport_routes SET
  start_point    = 'School Gate',
  end_point      = 'West Side – Iqbal Town',
  distance_km    = 10.3,
  estimated_time = 30
WHERE id = 5;

-- ── Add stop data (skip if already present) ───────────────────────────────────
-- Route 1 stops
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 1, 'School Gate',       1, '07:00', '15:00', 'Main Entrance'          WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=1 AND stop_order=1);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 1, 'Model Town Park',   2, '07:08', '15:10', 'Near Park Entrance'     WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=1 AND stop_order=2);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 1, 'Liberty Market',    3, '07:18', '15:20', 'Opposite Liberty Chowk' WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=1 AND stop_order=3);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 1, 'Gulberg Main Blvd', 4, '07:28', '15:30', 'MM Alam Road'           WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=1 AND stop_order=4);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 1, 'City Center',       5, '07:35', '15:38', 'City Center Mall'       WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=1 AND stop_order=5);

-- Route 2 stops
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 2, 'School Gate',       1, '07:00', '15:00', 'Main Entrance'          WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=2 AND stop_order=1);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 2, 'Johar Town Ph-1',   2, '07:10', '15:12', 'Johar Town Chowk'      WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=2 AND stop_order=2);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 2, 'Johar Town Ph-2',   3, '07:18', '15:20', 'Expo Center Road'       WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=2 AND stop_order=3);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 2, 'North Area Main',   4, '07:28', '15:30', 'North Town Residencia'  WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=2 AND stop_order=4);

-- Route 3 stops
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 3, 'School Gate',       1, '07:00', '15:00', 'Main Entrance'          WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=3 AND stop_order=1);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 3, 'Gulberg III',       2, '07:08', '15:10', 'Gulberg Galleria'       WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=3 AND stop_order=2);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 3, 'East Colony Gate',  3, '07:15', '15:18', 'Colony Roundabout'      WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=3 AND stop_order=3);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 3, 'Ichra Bazar',       4, '07:22', '15:25', 'Old Ichra Market'       WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=3 AND stop_order=4);

-- Route 4 stops
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 4, 'School Gate',       1, '07:00', '15:00', 'Main Entrance'          WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=4 AND stop_order=1);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 4, 'DHA Phase 1',       2, '07:12', '15:15', 'DHA Y-Block'            WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=4 AND stop_order=2);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 4, 'DHA Phase 3',       3, '07:22', '15:25', 'Hussain Chowk'          WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=4 AND stop_order=3);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 4, 'DHA Phase 5',       4, '07:35', '15:38', 'Lahore Cantt'           WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=4 AND stop_order=4);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 4, 'South Zone End',    5, '07:40', '15:45', 'Walton Road'            WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=4 AND stop_order=5);

-- Route 5 stops
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 5, 'School Gate',       1, '07:00', '15:00', 'Main Entrance'          WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=5 AND stop_order=1);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 5, 'Iqbal Town Blk-A',  2, '07:10', '15:12', 'Block A Chowk'          WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=5 AND stop_order=2);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 5, 'Iqbal Town Blk-C',  3, '07:18', '15:20', 'Barkat Market'          WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=5 AND stop_order=3);
INSERT INTO route_stops (route_id, stop_name, stop_order, pickup_time, dropoff_time, landmark)
SELECT 5, 'West End Terminal', 4, '07:30', '15:32', 'Chauburji'              WHERE NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id=5 AND stop_order=4);
