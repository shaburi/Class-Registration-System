-- Migration: Add Program Structure Tables
-- Description: Creates tables for intake-based program structures with course mappings

-- Program Structures table - defines a structure for a programme/intake combination
CREATE TABLE IF NOT EXISTS program_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme VARCHAR(20) NOT NULL,
    intake_type VARCHAR(20) NOT NULL CHECK (intake_type IN ('may', 'august', 'december')),
    name VARCHAR(100),
    effective_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    UNIQUE(programme, intake_type, effective_year)
);

-- Program Structure Courses - maps subjects to semesters within a structure
CREATE TABLE IF NOT EXISTS program_structure_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    structure_id UUID NOT NULL REFERENCES program_structures(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester INT NOT NULL CHECK (semester >= 1 AND semester <= 12),
    status VARCHAR(50) DEFAULT 'Core Computing',
    prerequisite_codes TEXT[], -- Array of prerequisite course codes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(structure_id, subject_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ps_programme_intake ON program_structures(programme, intake_type);
CREATE INDEX IF NOT EXISTS idx_ps_active ON program_structures(is_active);
CREATE INDEX IF NOT EXISTS idx_psc_structure ON program_structure_courses(structure_id);
CREATE INDEX IF NOT EXISTS idx_psc_subject ON program_structure_courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_psc_semester ON program_structure_courses(semester);

-- Add intake_session column to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'intake_session') THEN
        ALTER TABLE users ADD COLUMN intake_session VARCHAR(10);
    END IF;
END $$;

-- Comment for documentation
COMMENT ON TABLE program_structures IS 'Defines program course structures by intake session';
COMMENT ON TABLE program_structure_courses IS 'Maps subjects to specific semesters within a program structure';
COMMENT ON COLUMN users.intake_session IS 'Student intake session code e.g. 0825 for August 2025';
