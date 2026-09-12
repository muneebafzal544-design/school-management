-- ============================================================
--  Library Management System — Additive Migration
--  Safe to re-run: CREATE TABLE IF NOT EXISTS, ON CONFLICT DO NOTHING
--  No existing tables are modified.
-- ============================================================

-- ── 1. BOOK CATEGORIES ───────────────────────────────────────
--   Taxonomy for organising the library catalog.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_categories (
  id          SERIAL        PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL UNIQUE,
  description TEXT,
  color       VARCHAR(20)   NOT NULL DEFAULT '#6366f1',
  icon        VARCHAR(10)   NOT NULL DEFAULT '📚',
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_cat_active ON book_categories(is_active);

-- ── 2. BOOKS ─────────────────────────────────────────────────
--   Master catalog. Physical copies tracked separately.
--   cover_color used for UI avatar when no cover image.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id              SERIAL        PRIMARY KEY,
  title           VARCHAR(300)  NOT NULL,
  author          VARCHAR(200)  NOT NULL,
  isbn            VARCHAR(30)   UNIQUE,
  publisher       VARCHAR(200),
  published_year  INTEGER       CHECK (published_year BETWEEN 1800 AND 2100),
  category_id     INTEGER       REFERENCES book_categories(id) ON DELETE SET NULL,
  description     TEXT,
  language        VARCHAR(50)   NOT NULL DEFAULT 'English',
  edition         VARCHAR(50),
  cover_color     VARCHAR(20)   NOT NULL DEFAULT '#6366f1',
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_category  ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_active    ON books(is_active);
CREATE INDEX IF NOT EXISTS idx_books_author    ON books(author);

-- ── 3. BOOK COPIES ───────────────────────────────────────────
--   Every physical copy of a book tracked individually.
--   copy_number is human-readable (e.g. C-001, C-002).
--   location is shelf reference (e.g. "Shelf-B-12").
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_copies (
  id          SERIAL       PRIMARY KEY,
  book_id     INTEGER      NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  copy_number VARCHAR(20)  NOT NULL,
  barcode     VARCHAR(100) UNIQUE,
  status      VARCHAR(20)  NOT NULL DEFAULT 'available'
              CHECK (status IN ('available','issued','lost','damaged')),
  condition   VARCHAR(20)  NOT NULL DEFAULT 'good'
              CHECK (condition IN ('new','good','fair','poor')),
  location    VARCHAR(100),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (book_id, copy_number)
);

CREATE INDEX IF NOT EXISTS idx_copies_book   ON book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_copies_status ON book_copies(status);

-- ── 4. BOOK ISSUES ───────────────────────────────────────────
--   Tracks every issue event (student or teacher borrows a copy).
--   Polymorphic borrower via borrower_type + borrower_id.
--   Partial unique index prevents issuing an already-issued copy.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_issues (
  id                  SERIAL      PRIMARY KEY,
  book_copy_id        INTEGER     NOT NULL REFERENCES book_copies(id) ON DELETE RESTRICT,
  borrower_type       VARCHAR(20) NOT NULL CHECK (borrower_type IN ('student','teacher')),
  borrower_id         INTEGER     NOT NULL,
  issue_date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE        NOT NULL,
  return_date         DATE,
  status              VARCHAR(20) NOT NULL DEFAULT 'issued'
                      CHECK (status IN ('issued','returned','overdue','lost')),
  -- Future: issued_by / return_accepted_by (librarian user id)
  issued_by           INTEGER,
  return_accepted_by  INTEGER,
  remarks             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent two active issues for the same physical copy
CREATE UNIQUE INDEX IF NOT EXISTS uq_copy_active_issue
  ON book_issues(book_copy_id)
  WHERE status IN ('issued','overdue');

CREATE INDEX IF NOT EXISTS idx_issues_copy     ON book_issues(book_copy_id);
CREATE INDEX IF NOT EXISTS idx_issues_borrower ON book_issues(borrower_type, borrower_id);
CREATE INDEX IF NOT EXISTS idx_issues_status   ON book_issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_due      ON book_issues(due_date) WHERE return_date IS NULL;

-- ── 5. LIBRARY FINES ─────────────────────────────────────────
--   Auto-created on late return.  fine = late_days × fine_per_day.
--   fine_per_day stored per record so historic rates are preserved.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_fines (
  id            SERIAL         PRIMARY KEY,
  issue_id      INTEGER        NOT NULL REFERENCES book_issues(id) ON DELETE CASCADE,
  borrower_type VARCHAR(20)    NOT NULL,
  borrower_id   INTEGER        NOT NULL,
  fine_amount   NUMERIC(10,2)  NOT NULL,
  fine_per_day  NUMERIC(10,2)  NOT NULL DEFAULT 5.00,
  late_days     INTEGER        NOT NULL,
  paid_status   BOOLEAN        NOT NULL DEFAULT FALSE,
  paid_at       TIMESTAMPTZ,
  remarks       TEXT,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fines_issue    ON library_fines(issue_id);
CREATE INDEX IF NOT EXISTS idx_fines_borrower ON library_fines(borrower_type, borrower_id);
CREATE INDEX IF NOT EXISTS idx_fines_paid     ON library_fines(paid_status);

-- ── SEED: BOOK CATEGORIES ────────────────────────────────────
INSERT INTO book_categories (name, description, color, icon) VALUES
  ('Science',          'Physics, Chemistry, Biology & General Science', '#06b6d4', '🔬'),
  ('Mathematics',      'Arithmetic, Algebra, Geometry & Calculus',      '#6366f1', '📐'),
  ('Literature',       'Urdu, English Literature, Poetry & Prose',      '#ec4899', '📖'),
  ('Computer Science', 'Programming, IT & Digital Technology',          '#8b5cf6', '💻'),
  ('History',          'Pakistan, World & Islamic History',             '#f59e0b', '🏛️'),
  ('Islamic Studies',  'Quran, Hadith, Fiqh & Islamic Knowledge',      '#10b981', '🕌'),
  ('General Knowledge','Current Affairs, GK & Encyclopaedia',          '#ef4444', '🌍')
ON CONFLICT (name) DO NOTHING;

-- ── SEED: BOOKS ──────────────────────────────────────────────
INSERT INTO books (title, author, isbn, publisher, published_year, category_id, language, edition, cover_color) VALUES
  ('Physics Concepts',         'H.C. Verma',          '978-8177091878', 'Bharati Bhawan',    2020, (SELECT id FROM book_categories WHERE name='Science'),          'English', '2nd',  '#06b6d4'),
  ('Biology for Class 10',     'NCERT',               '978-9352783267', 'NCERT',             2021, (SELECT id FROM book_categories WHERE name='Science'),          'English', '1st',  '#10b981'),
  ('Chemistry Organic',        'Morrison & Boyd',     '978-0136400158', 'Pearson',           2021, (SELECT id FROM book_categories WHERE name='Science'),          'English', '6th',  '#0891b2'),
  ('Mathematics Grade 9',      'Dr. Asif Shahzad',    '978-9696320067', 'Punjab Board',      2022, (SELECT id FROM book_categories WHERE name='Mathematics'),      'Urdu',    '3rd',  '#6366f1'),
  ('Calculus & Algebra',       'Howard Anton',        '978-0470648032', 'Wiley',             2019, (SELECT id FROM book_categories WHERE name='Mathematics'),      'English', '10th', '#8b5cf6'),
  ('Anaa (Novel)',              'Umera Ahmed',         '978-9696321027', 'Al-Faisal Nashar',  2018, (SELECT id FROM book_categories WHERE name='Literature'),       'Urdu',    '1st',  '#ec4899'),
  ('Shakespeare Complete Works','William Shakespeare', '978-0198325440', 'Oxford',            2020, (SELECT id FROM book_categories WHERE name='Literature'),       'English', '5th',  '#f43f5e'),
  ('Python Programming',       'Mark Lutz',           '978-1449355739', 'O''Reilly',         2021, (SELECT id FROM book_categories WHERE name='Computer Science'), 'English', '5th',  '#8b5cf6'),
  ('Computer Science A Level', 'Brian Underdahl',     '978-1119276951', 'Wiley',             2020, (SELECT id FROM book_categories WHERE name='Computer Science'), 'English', '2nd',  '#6366f1'),
  ('Tareekh-e-Pakistan',       'Dr. Mubarak Ali',     '978-9696010069', 'Fiction House',     2017, (SELECT id FROM book_categories WHERE name='History'),          'Urdu',    '4th',  '#f59e0b'),
  ('World History',            'J.M. Roberts',        '978-0195221343', 'Oxford',            2018, (SELECT id FROM book_categories WHERE name='History'),          'English', '3rd',  '#d97706'),
  ('Al-Quran with Translation','Mufti Taqi Usmani',   '978-1567446036', 'Maktaba Rehmania',  2019, (SELECT id FROM book_categories WHERE name='Islamic Studies'),  'Urdu',    '1st',  '#10b981'),
  ('Islamic Studies Grade 8',  'Punjab Curriculum',   '978-9696320082', 'Punjab Board',      2022, (SELECT id FROM book_categories WHERE name='Islamic Studies'),  'Urdu',    '2nd',  '#059669'),
  ('General Knowledge 2024',   'Imtiaz Shahid',       '978-9696450012', 'Famous Books',      2024, (SELECT id FROM book_categories WHERE name='General Knowledge'),'Urdu',    '1st',  '#ef4444'),
  ('Encyclopedia Britannica',  'Britannica Group',    '978-1593392925', 'Encyclopaedia Bri.',2020, (SELECT id FROM book_categories WHERE name='General Knowledge'),'English', '15th', '#dc2626')
ON CONFLICT (isbn) DO NOTHING;

-- ── SEED: BOOK COPIES (2-3 copies per book) ──────────────────
INSERT INTO book_copies (book_id, copy_number, barcode, status, condition, location)
SELECT
  b.id,
  'C-' || LPAD(s.n::text, 3, '0'),
  'LIB-' || LPAD(b.id::text, 4, '0') || '-' || LPAD(s.n::text, 2, '0'),
  'available',
  CASE s.n WHEN 1 THEN 'new' WHEN 2 THEN 'good' ELSE 'fair' END,
  'Shelf-' || CHR(64 + ((b.id - 1) % 5) + 1) || '-' || LPAD(b.id::text, 2, '0')
FROM books b
CROSS JOIN (VALUES (1),(2),(3)) AS s(n)
ON CONFLICT DO NOTHING;
