-- Migration: Add timetable_group to sections
-- This allows grouping sections into timetable variants (e.g., 3.1, 3.2)

ALTER TABLE sections ADD COLUMN IF NOT EXISTS timetable_group VARCHAR(10);

-- Update existing sections with default groups based on section_number pattern
-- Sections 20-29 -> group X.1, Sections 30-39 -> group X.2, etc.
UPDATE sections s
SET timetable_group = 
    (SELECT semester FROM subjects WHERE id = s.subject_id)::text || '.' ||
    CASE 
        WHEN CAST(s.section_number AS INTEGER) BETWEEN 20 AND 29 THEN '1'
        WHEN CAST(s.section_number AS INTEGER) BETWEEN 30 AND 39 THEN '2'
        ELSE '1'
    END
WHERE timetable_group IS NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_sections_timetable_group ON sections(timetable_group);
