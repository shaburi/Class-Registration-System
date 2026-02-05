-- Migration: 003_edupage_sync.sql
-- Description: Create table for storing Edupage timetable data
-- Date: 2026-01-31

-- Table to store fetched Edupage timetable data
-- This avoids rate limiting by storing data locally after manual fetch
CREATE TABLE IF NOT EXISTS edupage_timetables (
    id SERIAL PRIMARY KEY,
    
    -- Parsed data from Edupage API stored as JSONB for flexibility
    teachers JSONB DEFAULT '[]',           -- Array of teacher objects
    subjects JSONB DEFAULT '[]',           -- Array of subject objects  
    classes JSONB DEFAULT '[]',            -- Array of class/group objects
    classrooms JSONB DEFAULT '[]',         -- Array of classroom/room objects
    lessons JSONB DEFAULT '[]',            -- Array of lesson/period objects
    periods JSONB DEFAULT '[]',            -- Array of period definitions (time slots)
    days JSONB DEFAULT '[]',               -- Array of day definitions
    
    -- Raw API response for debugging/reference
    raw_basedata JSONB,                    -- Raw getbasedata response
    raw_timetable JSONB,                   -- Raw gettimetable response
    
    -- Sync metadata
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_by INTEGER,                     -- User ID who triggered sync (optional reference)
    
    -- Track which timetable version was fetched
    timetable_id VARCHAR(100),
    timetable_name VARCHAR(255)
);

-- Index for quick lookup of latest sync
CREATE INDEX IF NOT EXISTS idx_edupage_timetables_synced_at 
ON edupage_timetables(synced_at DESC);

-- Table to log sync history for audit purposes
CREATE TABLE IF NOT EXISTS edupage_sync_log (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,        -- 'full', 'basedata', 'timetable'
    status VARCHAR(20) NOT NULL,           -- 'success', 'failed', 'partial'
    records_fetched INTEGER DEFAULT 0,
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_by INTEGER,                     -- User ID who triggered sync (optional reference)
    duration_ms INTEGER                    -- How long the sync took
);

-- Index for sync log queries
CREATE INDEX IF NOT EXISTS idx_edupage_sync_log_synced_at 
ON edupage_sync_log(synced_at DESC);

COMMENT ON TABLE edupage_timetables IS 'Stores timetable data fetched from aSc Edupage API';
COMMENT ON TABLE edupage_sync_log IS 'Audit log for Edupage sync operations';
