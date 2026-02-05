-- Migration: Add alternate_codes column to subjects table
-- This stores alternative subject codes that refer to the same subject
-- Example: UCS3103 might also be known as UCS3083, UCS3183

-- Add the column
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS alternate_codes TEXT[] DEFAULT '{}';

-- Create an index for searching alternate codes
CREATE INDEX IF NOT EXISTS idx_subjects_alternate_codes ON subjects USING GIN (alternate_codes);

-- Comment for documentation
COMMENT ON COLUMN subjects.alternate_codes IS 'Alternative subject codes that refer to the same subject (e.g., UCS3083, UCS3183 for UCS3103)';

-- Verify
SELECT 'Migration 004_add_alternate_codes completed successfully' as status;
