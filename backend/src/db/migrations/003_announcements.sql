-- ============================================================
--  Announcements / Notifications System — Additive Migration
--  Safe to re-run: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS
--  No existing tables are modified.
-- ============================================================

-- ── 1. ANNOUNCEMENTS  (master table) ────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id                  SERIAL        PRIMARY KEY,

  -- Content
  title               VARCHAR(200)  NOT NULL,
  message             TEXT          NOT NULL,

  -- Classification
  announcement_type   VARCHAR(20)   NOT NULL DEFAULT 'general'
                      CHECK (announcement_type IN ('general','exam','fee','event','holiday')),

  -- Audience targeting
  --   'all'      → everyone
  --   'students' → students only
  --   'teachers' → teachers only
  --   'parents'  → parents / guardians
  --   'class'    → specific class (use class_id)
  target_audience     VARCHAR(20)   NOT NULL DEFAULT 'all'
                      CHECK (target_audience IN ('all','students','teachers','parents','class')),

  -- Optional class restriction (only used when target_audience = 'class')
  class_id            INT           REFERENCES classes(id) ON DELETE SET NULL,

  -- Priority level for visual emphasis
  priority            VARCHAR(10)   NOT NULL DEFAULT 'normal'
                      CHECK (priority IN ('low','normal','high','urgent')),

  -- ── Future-proof author tracking ──────────────────────────
  --   created_by_type and created_by_id are nullable now (no admin table yet).
  --   When an auth system is added, populate these fields without any schema change:
  --     created_by_type = 'teacher'  → created_by_id points to teachers.id
  --     created_by_type = 'admin'    → created_by_id points to admins.id  (future)
  --     created_by_type = 'staff'    → created_by_id points to staff.id   (future)
  created_by_type     VARCHAR(20),          -- 'teacher' | 'admin' | 'staff' | NULL
  created_by_id       INT,                  -- FK resolved at application layer

  -- Lifecycle
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  expires_at          TIMESTAMPTZ,          -- NULL = never expires
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- A class-targeted announcement MUST have a class_id
  CONSTRAINT chk_class_audience CHECK (
    target_audience != 'class' OR class_id IS NOT NULL
  )
);

-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ann_type        ON announcements(announcement_type);
CREATE INDEX IF NOT EXISTS idx_ann_audience    ON announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_ann_class       ON announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_ann_is_active   ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_ann_priority    ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_ann_created_at  ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ann_expires_at  ON announcements(expires_at);

-- Composite: active + audience queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_ann_active_audience
  ON announcements(is_active, target_audience, created_at DESC);

-- ── 2. ANNOUNCEMENT READS  (optional read-tracking) ────────
--   Tracks which student or teacher has seen an announcement.
--   reader_type  = 'student' | 'teacher'
--   reader_id    = the id in the respective table
CREATE TABLE IF NOT EXISTS announcement_reads (
  id                SERIAL      PRIMARY KEY,
  announcement_id   INT         NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  reader_type       VARCHAR(20) NOT NULL CHECK (reader_type IN ('student','teacher')),
  reader_id         INT         NOT NULL,
  read_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One read record per person per announcement
  CONSTRAINT uq_ann_read UNIQUE (announcement_id, reader_type, reader_id)
);

CREATE INDEX IF NOT EXISTS idx_ann_reads_ann    ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_ann_reads_reader ON announcement_reads(reader_type, reader_id);

-- ── 3. SEED DATA ─────────────────────────────────────────────
INSERT INTO announcements (title, message, announcement_type, target_audience, priority, expires_at)
VALUES
  (
    'Welcome Back — New Academic Year 2024-25',
    'Dear students and staff, we warmly welcome you to the new academic year 2024-25. Classes will commence from Monday. Please ensure all fee payments are cleared before the first week ends.',
    'general', 'all', 'high',
    NOW() + INTERVAL '30 days'
  ),
  (
    'Midterm Exam Schedule Released',
    'The midterm examination schedule for all classes has been published. Exams will be held from October 1st to October 7th. Students are advised to collect their admit cards from the administration office.',
    'exam', 'students', 'urgent',
    NOW() + INTERVAL '14 days'
  ),
  (
    'Monthly Fee Submission Deadline',
    'This is a reminder that monthly fee for October is due by 10th October. Late submission will incur a fine of PKR 200. Please visit the accounts office during school hours.',
    'fee', 'parents', 'high',
    NOW() + INTERVAL '10 days'
  ),
  (
    'Annual Sports Day — Save the Date',
    'Annual Sports Day will be held on 25th October at the school ground. All students are encouraged to participate. Registration forms are available at the front office.',
    'event', 'all', 'normal',
    NOW() + INTERVAL '20 days'
  ),
  (
    'Public Holiday — 25th December',
    'The school will remain closed on 25th December on account of Christmas. Classes will resume on 26th December as normal.',
    'holiday', 'all', 'normal',
    NOW() + INTERVAL '60 days'
  )
ON CONFLICT DO NOTHING;
