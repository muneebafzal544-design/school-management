-- ============================================================
--  Online Classes — Phase 1 (Manual link MVP)
-- ============================================================

CREATE TABLE IF NOT EXISTS online_classes (
  id                  SERIAL        PRIMARY KEY,
  teacher_id          INT           NOT NULL REFERENCES teachers(id)  ON DELETE CASCADE,
  class_id            INT           REFERENCES classes(id)            ON DELETE SET NULL,
  subject_id          INT           REFERENCES subjects(id)           ON DELETE SET NULL,
  title               VARCHAR(200)  NOT NULL,
  description         TEXT,
  agenda              TEXT,
  scheduled_at        TIMESTAMPTZ   NOT NULL,
  duration_minutes    INT           NOT NULL DEFAULT 45
                        CHECK (duration_minutes BETWEEN 10 AND 480),
  meeting_platform    VARCHAR(20)   NOT NULL DEFAULT 'manual'
                        CHECK (meeting_platform IN ('zoom','meet','teams','manual')),
  meeting_link        TEXT,
  meeting_password    VARCHAR(100),
  status              VARCHAR(20)   NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','live','completed','cancelled')),
  created_by          INT           REFERENCES users(id) ON DELETE SET NULL,
  cancelled_reason    TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Tracks which students are expected + whether they joined
CREATE TABLE IF NOT EXISTS online_class_participants (
  id          SERIAL      PRIMARY KEY,
  oc_id       INT         NOT NULL REFERENCES online_classes(id) ON DELETE CASCADE,
  student_id  INT         NOT NULL REFERENCES students(id)       ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ,
  attended    BOOLEAN     NOT NULL DEFAULT FALSE,
  UNIQUE (oc_id, student_id)
);

-- Per-school integration config (one row per platform)
CREATE TABLE IF NOT EXISTS online_class_settings (
  id                    SERIAL       PRIMARY KEY,
  platform              VARCHAR(20)  NOT NULL UNIQUE
                          CHECK (platform IN ('zoom','meet','manual')),
  is_enabled            BOOLEAN      NOT NULL DEFAULT FALSE,
  -- Google Meet (OAuth2)
  google_client_id      TEXT,
  google_client_secret  TEXT,
  google_refresh_token  TEXT,
  -- Zoom (Server-to-Server)
  zoom_account_id       TEXT,
  zoom_client_id        TEXT,
  zoom_client_secret    TEXT,
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed: manual platform always available
INSERT INTO online_class_settings (platform, is_enabled)
VALUES ('manual', TRUE)
ON CONFLICT (platform) DO NOTHING;

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_oc_teacher_id    ON online_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_oc_class_id      ON online_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_oc_scheduled_at  ON online_classes(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_oc_status        ON online_classes(status);
CREATE INDEX IF NOT EXISTS idx_ocp_oc_id        ON online_class_participants(oc_id);
CREATE INDEX IF NOT EXISTS idx_ocp_student_id   ON online_class_participants(student_id);
