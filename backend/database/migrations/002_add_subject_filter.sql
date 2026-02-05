-- Add subject_filter column to users table
-- This stores a JSON array of subject codes for students to filter their course view

ALTER TABLE users ADD COLUMN IF NOT EXISTS subject_filter TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.subject_filter IS 'JSON array of subject codes imported by student for semester filtering';
