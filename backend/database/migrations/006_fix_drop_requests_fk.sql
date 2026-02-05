-- Migration: Fix drop_requests table to preserve records after registration deletion
-- This changes the registration_id FK from ON DELETE CASCADE to ON DELETE SET NULL

-- Step 1: Check if the constraint exists and drop it
DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'drop_requests_registration_id_fkey' 
        AND table_name = 'drop_requests'
    ) THEN
        ALTER TABLE drop_requests DROP CONSTRAINT drop_requests_registration_id_fkey;
    END IF;
END $$;

-- Step 2: Make registration_id nullable (if not already)
ALTER TABLE drop_requests ALTER COLUMN registration_id DROP NOT NULL;

-- Step 3: Add the constraint back with ON DELETE SET NULL
ALTER TABLE drop_requests 
ADD CONSTRAINT drop_requests_registration_id_fkey 
FOREIGN KEY (registration_id) 
REFERENCES registrations(id) 
ON DELETE SET NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'drop_requests table updated: registration_id FK now uses ON DELETE SET NULL';
    RAISE NOTICE 'Drop requests will now persist even after registration deletion (approval)';
END $$;
