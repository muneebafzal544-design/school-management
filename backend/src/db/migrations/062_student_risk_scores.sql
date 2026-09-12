-- Migration 062: Student risk scores (at-risk detection engine)
CREATE TABLE IF NOT EXISTS student_risk_scores (
  student_id        INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  score             NUMERIC(5,2) NOT NULL DEFAULT 0,
  band              VARCHAR(10)  NOT NULL DEFAULT 'low' CHECK (band IN ('low','medium','high')),
  attendance_score  NUMERIC(5,2) NOT NULL DEFAULT 0,
  exam_score        NUMERIC(5,2) NOT NULL DEFAULT 0,
  homework_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  fee_score         NUMERIC(5,2) NOT NULL DEFAULT 0,
  calculated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_scores_band  ON student_risk_scores(band);
CREATE INDEX IF NOT EXISTS idx_risk_scores_score ON student_risk_scores(score DESC);
