-- 021_pakistani_grading.sql
-- Update grade function and result_summary to use Pakistani grading scale:
--   A1 : 90 – 100  (Distinction)
--   A  : 80 – 89   (Excellent)
--   B  : 70 – 79   (Very Good)
--   C  : 60 – 69   (Good)
--   D  : 50 – 59   (Average / Pass)
--   F  : < 50      (Fail)

-- Widen the grade column to hold 'A1' (2 chars) — already VARCHAR(2), but be safe
ALTER TABLE result_summary ALTER COLUMN grade TYPE VARCHAR(3);

CREATE OR REPLACE FUNCTION calculate_grade(pct NUMERIC)
RETURNS VARCHAR(3)
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE
    WHEN pct >= 90 THEN 'A1'
    WHEN pct >= 80 THEN 'A'
    WHEN pct >= 70 THEN 'B'
    WHEN pct >= 60 THEN 'C'
    WHEN pct >= 50 THEN 'D'
    ELSE 'F'
  END;
END;
$$;

-- Re-generate grades for any existing result_summary rows
UPDATE result_summary
SET grade = calculate_grade(
  ROUND(obtained_marks::NUMERIC / NULLIF(total_marks, 0) * 100, 2)
);
