-- Migration: Add section_schedules table for multiple time slots per section
-- Run this migration on your database

-- Step 1: Create section_schedules table
CREATE TABLE IF NOT EXISTS section_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    day day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_schedule_time_range CHECK (end_time > start_time)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_section_schedules_section_id ON section_schedules(section_id);
CREATE INDEX IF NOT EXISTS idx_section_schedules_day_time ON section_schedules(day, start_time, end_time);

-- Step 2: Migrate existing section time data to section_schedules
INSERT INTO section_schedules (section_id, day, start_time, end_time, room)
SELECT id, day, start_time, end_time, room
FROM sections
WHERE day IS NOT NULL AND start_time IS NOT NULL AND end_time IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 3: Remove old columns from sections (OPTIONAL - run after verifying migration)
-- Note: Only run this after confirming data has been migrated correctly
-- ALTER TABLE sections DROP COLUMN IF EXISTS day;
-- ALTER TABLE sections DROP COLUMN IF EXISTS start_time;
-- ALTER TABLE sections DROP COLUMN IF EXISTS end_time;
-- ALTER TABLE sections DROP COLUMN IF EXISTS room;
-- ALTER TABLE sections DROP COLUMN IF EXISTS building;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'section_schedules table created and data migrated successfully!';
END $$;
