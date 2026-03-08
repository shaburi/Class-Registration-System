-- Migration 011: Add profile_completed flag to users table
-- This controls whether the onboarding registration page is shown

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Set existing students who already have programme and semester as completed
UPDATE users SET profile_completed = TRUE WHERE role = 'student' AND programme IS NOT NULL AND semester IS NOT NULL;
