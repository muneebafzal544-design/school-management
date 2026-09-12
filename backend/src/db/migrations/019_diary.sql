-- ============================================================
--  School Diary Module — Migration 019
--  Daily diary entries per class/subject with publish workflow
-- ============================================================

-- ── diary_entries: one row per subject per class per date ──
CREATE TABLE IF NOT EXISTS diary_entries (
  id              SERIAL        PRIMARY KEY,
  class_id        INT           NOT NULL REFERENCES classes(id)   ON DELETE CASCADE,
  subject_id      INT                    REFERENCES subjects(id)  ON DELETE SET NULL,
  teacher_id      INT                    REFERENCES teachers(id)  ON DELETE SET NULL,
  date            DATE          NOT NULL,
  homework        TEXT,
  classwork       TEXT,
  notes           TEXT,
  attachment_url  TEXT,
  attachment_name VARCHAR(200),
  status          VARCHAR(20)   NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','pending','published')),
  incharge_remark TEXT,                  -- class incharge can add a remark per entry
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, subject_id, date)    -- one entry per subject per class per day
);

-- ── diary_publishes: publish record per class per date ──
CREATE TABLE IF NOT EXISTS diary_publishes (
  id               SERIAL        PRIMARY KEY,
  class_id         INT           NOT NULL REFERENCES classes(id)   ON DELETE CASCADE,
  date             DATE          NOT NULL,
  published_by     INT                    REFERENCES teachers(id)  ON DELETE SET NULL,
  general_remarks  TEXT,
  whatsapp_text    TEXT,
  published_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_diary_class_date   ON diary_entries(class_id, date);
CREATE INDEX IF NOT EXISTS idx_diary_teacher       ON diary_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_diary_status        ON diary_entries(status);
CREATE INDEX IF NOT EXISTS idx_diary_pub_class_date ON diary_publishes(class_id, date);
