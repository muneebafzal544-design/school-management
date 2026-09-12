-- Migration 098: Book reservation / hold queue
CREATE TABLE IF NOT EXISTS book_reservations (
  id            SERIAL PRIMARY KEY,
  book_id       INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reserved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','fulfilled','cancelled','expired')),
  notified_at   TIMESTAMPTZ,
  fulfilled_at  TIMESTAMPTZ,
  notes         TEXT,
  UNIQUE (book_id, student_id, status)   -- one active reservation per student per book
);

CREATE INDEX IF NOT EXISTS idx_book_res_book   ON book_reservations(book_id, status);
CREATE INDEX IF NOT EXISTS idx_book_res_student ON book_reservations(student_id, status);
