CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  username   VARCHAR(100) UNIQUE NOT NULL,
  password   VARCHAR(200) NOT NULL,
  role       VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
  name       VARCHAR(200) NOT NULL,
  entity_id  INT,          -- teacher_id / student_id / (parent → student_id of child)
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);
