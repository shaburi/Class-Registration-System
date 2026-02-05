-- Migration: Add Academic Sessions Support
-- Run this SQL to add session management to existing database

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) NOT NULL UNIQUE,           -- e.g., "1225", "0526"
    name VARCHAR(100) NOT NULL,                  -- e.g., "December 2025 - April 2026"
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('active', 'upcoming', 'archived')),
    is_registration_open BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(code);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Trigger for updated_at
CREATE TRIGGER update_sessions_timestamp
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ADD session_id TO sections TABLE
-- ============================================================================
ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sections_session ON sections(session_id);

-- ============================================================================
-- ADD session_id TO registrations TABLE
-- ============================================================================
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_registrations_session ON registrations(session_id);

-- ============================================================================
-- CREATE DEFAULT SESSION FOR EXISTING DATA
-- ============================================================================
-- Create a default session for existing data (Dec 2025)
INSERT INTO sessions (code, name, start_date, end_date, status, is_registration_open)
VALUES ('1225', 'December 2025 - April 2026', '2025-12-01', '2026-04-30', 'active', true)
ON CONFLICT (code) DO NOTHING;

-- Link existing sections to default session
UPDATE sections 
SET session_id = (SELECT id FROM sessions WHERE code = '1225')
WHERE session_id IS NULL;

-- Link existing registrations to default session
UPDATE registrations 
SET session_id = (SELECT id FROM sessions WHERE code = '1225')
WHERE session_id IS NULL;

-- ============================================================================
-- SUCCESS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Sessions migration completed successfully!';
    RAISE NOTICE 'Default session "1225" created and linked to existing data.';
END $$;
