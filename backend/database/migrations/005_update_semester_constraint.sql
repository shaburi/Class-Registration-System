-- Migration: Update semester constraint to allow 1-11
-- Run this migration to fix the semester constraint that was limiting to 1-8

-- Update subjects table constraint
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_semester_check;
ALTER TABLE subjects ADD CONSTRAINT subjects_semester_check CHECK (semester >= 1 AND semester <= 11);

-- Update registrations table constraint (if exists)
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_semester_check;
ALTER TABLE registrations ADD CONSTRAINT registrations_semester_check CHECK (semester >= 1 AND semester <= 11);
