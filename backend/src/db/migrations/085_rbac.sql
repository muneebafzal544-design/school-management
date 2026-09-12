-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 085: Dynamic RBAC — permissions, roles, role_permissions
-- ─────────────────────────────────────────────────────────────────────────────
-- Design:
--   permissions       → master list of all possible actions (module:action keys)
--   roles             → named sets of permissions (system + custom)
--   role_permissions  → many-to-many: which permissions each role has
--   user_permissions  → per-user overrides (grant or revoke individual perms)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. permissions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL       PRIMARY KEY,
  module      VARCHAR(50)  NOT NULL,
  action      VARCHAR(50)  NOT NULL,
  key         VARCHAR(120) NOT NULL,   -- always module + ':' + action
  label       VARCHAR(100) NOT NULL,   -- human-readable display name
  description TEXT,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  UNIQUE (module, action),
  UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_key    ON permissions(key);

-- ── 2. roles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,    -- maps to users.role
  label       VARCHAR(100) NOT NULL,
  description TEXT,
  color       VARCHAR(20)  NOT NULL DEFAULT '#6366f1',
  is_system   BOOLEAN      NOT NULL DEFAULT FALSE,  -- system roles cannot be deleted
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by  INTEGER      REFERENCES users(id) ON DELETE SET NULL
);

-- ── 3. role_permissions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_perms_role ON role_permissions(role_id);

-- ── 4. user_permissions (individual overrides) ───────────────────────────────
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  type          VARCHAR(10) NOT NULL DEFAULT 'grant'
                CHECK (type IN ('grant', 'revoke')),
  granted_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_perms_user ON user_permissions(user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: All system permissions
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO permissions (module, action, key, label, sort_order) VALUES
  -- Students
  ('students',     'read',   'students:read',          'View Students',         10),
  ('students',     'create', 'students:create',         'Add Students',          11),
  ('students',     'update', 'students:update',         'Edit Students',         12),
  ('students',     'delete', 'students:delete',         'Delete Students',       13),
  ('students',     'export', 'students:export',         'Export Students',       14),
  ('students',     'import', 'students:import',         'Import Students',       15),
  -- Teachers
  ('teachers',     'read',   'teachers:read',           'View Teachers',         20),
  ('teachers',     'create', 'teachers:create',         'Add Teachers',          21),
  ('teachers',     'update', 'teachers:update',         'Edit Teachers',         22),
  ('teachers',     'delete', 'teachers:delete',         'Delete Teachers',       23),
  -- Classes
  ('classes',      'read',   'classes:read',            'View Classes',          30),
  ('classes',      'create', 'classes:create',          'Add Classes',           31),
  ('classes',      'update', 'classes:update',          'Edit Classes',          32),
  ('classes',      'delete', 'classes:delete',          'Delete Classes',        33),
  -- Attendance
  ('attendance',   'view',   'attendance:view',         'View Attendance',       40),
  ('attendance',   'mark',   'attendance:mark',         'Mark Attendance',       41),
  ('attendance',   'export', 'attendance:export',       'Export Attendance',     42),
  -- Fees
  ('fees',         'read',   'fees:read',               'View Fees',             50),
  ('fees',         'create', 'fees:create',             'Create Invoices',       51),
  ('fees',         'update', 'fees:update',             'Edit Fees',             52),
  ('fees',         'delete', 'fees:delete',             'Delete Fee Records',    53),
  ('fees',         'export', 'fees:export',             'Export Fee Reports',    54),
  -- Timetable
  ('timetable',    'read',   'timetable:read',          'View Timetable',        60),
  ('timetable',    'create', 'timetable:create',        'Create Timetable',      61),
  ('timetable',    'update', 'timetable:update',        'Edit Timetable',        62),
  ('timetable',    'delete', 'timetable:delete',        'Delete Timetable',      63),
  -- Transport
  ('transport',    'view',   'transport:view',          'View Transport',        70),
  ('transport',    'manage', 'transport:manage',        'Manage Transport',      71),
  ('transport',    'track',  'transport:track',         'Track Vehicles',        72),
  -- Homework
  ('homework',     'read',   'homework:read',           'View Homework',         80),
  ('homework',     'create', 'homework:create',         'Assign Homework',       81),
  ('homework',     'update', 'homework:update',         'Edit Homework',         82),
  ('homework',     'delete', 'homework:delete',         'Delete Homework',       83),
  -- Exams
  ('exams',        'read',   'exams:read',              'View Exams',            90),
  ('exams',        'create', 'exams:create',            'Create Exams',          91),
  ('exams',        'update', 'exams:update',            'Edit Exams',            92),
  ('exams',        'delete', 'exams:delete',            'Delete Exams',          93),
  -- Announcements
  ('announcements','read',   'announcements:read',      'View Announcements',   100),
  ('announcements','create', 'announcements:create',    'Post Announcements',   101),
  ('announcements','update', 'announcements:update',    'Edit Announcements',   102),
  ('announcements','delete', 'announcements:delete',    'Delete Announcements', 103),
  -- Reports
  ('reports',      'view',   'reports:view',            'View Reports',         110),
  ('reports',      'export', 'reports:export',          'Export Reports',       111),
  -- Library
  ('library',      'view',   'library:view',            'View Library',         120),
  ('library',      'manage', 'library:manage',          'Manage Library',       121),
  -- Salary
  ('salary',       'view',   'salary:view',             'View Salaries',        130),
  ('salary',       'manage', 'salary:manage',           'Manage Salaries',      131),
  -- Settings
  ('settings',     'view',   'settings:view',           'View Settings',        140),
  ('settings',     'manage', 'settings:manage',         'Manage Settings',      141),
  -- Chatbot
  ('chatbot',      'access', 'chatbot:access',          'Use AI Chatbot',       150)
ON CONFLICT (module, action) DO UPDATE SET
  label      = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;


-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: System roles
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO roles (name, label, description, color, is_system) VALUES
  ('admin',   'Administrator', 'Full system access. Can do everything.',       '#ef4444', TRUE),
  ('teacher', 'Teacher',       'Class management, attendance, homework.',      '#8b5cf6', TRUE),
  ('student', 'Student',       'Self-service: view own data.',                 '#3b82f6', TRUE),
  ('parent',  'Parent',        'Monitor child progress and transport.',        '#10b981', TRUE),
  ('driver',  'Driver',        'Transport operations and vehicle tracking.',   '#f59e0b', TRUE)
ON CONFLICT (name) DO UPDATE SET
  label       = EXCLUDED.label,
  description = EXCLUDED.description,
  color       = EXCLUDED.color,
  is_system   = EXCLUDED.is_system;


-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Default role → permission mappings
-- ─────────────────────────────────────────────────────────────────────────────

-- Admin: ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Teacher
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'students:read',
  'classes:read',
  'attendance:view', 'attendance:mark', 'attendance:export',
  'homework:read', 'homework:create', 'homework:update', 'homework:delete',
  'exams:read',
  'timetable:read',
  'announcements:read', 'announcements:create',
  'reports:view',
  'library:view',
  'chatbot:access'
)
WHERE r.name = 'teacher'
ON CONFLICT DO NOTHING;

-- Student
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'attendance:view',
  'fees:read',
  'timetable:read',
  'homework:read',
  'exams:read',
  'announcements:read',
  'transport:view',
  'library:view',
  'chatbot:access'
)
WHERE r.name = 'student'
ON CONFLICT DO NOTHING;

-- Parent
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'attendance:view',
  'fees:read',
  'timetable:read',
  'announcements:read',
  'transport:view',
  'chatbot:access'
)
WHERE r.name = 'parent'
ON CONFLICT DO NOTHING;

-- Driver
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'transport:view',
  'transport:track',
  'chatbot:access'
)
WHERE r.name = 'driver'
ON CONFLICT DO NOTHING;
