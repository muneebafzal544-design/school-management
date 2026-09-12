-- Bus geofencing: track bus entry/exit state + school location settings
ALTER TABLE buses
  ADD COLUMN IF NOT EXISTS in_geofence BOOLEAN NOT NULL DEFAULT FALSE;

-- School GPS coordinates and geofence radius (meters)
INSERT INTO settings (key, value, updated_at) VALUES ('school_latitude',        NULL,   NOW()) ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value, updated_at) VALUES ('school_longitude',       NULL,   NOW()) ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value, updated_at) VALUES ('school_geofence_radius', '500',  NOW()) ON CONFLICT (key) DO NOTHING;
