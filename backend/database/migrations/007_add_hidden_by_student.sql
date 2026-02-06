-- Migration: Add hidden_by_student column to request tables for soft delete
-- This allows students to clear completed requests from their view while keeping records visible to HOP

ALTER TABLE swap_requests ADD COLUMN IF NOT EXISTS hidden_by_student BOOLEAN DEFAULT FALSE;
ALTER TABLE manual_join_requests ADD COLUMN IF NOT EXISTS hidden_by_student BOOLEAN DEFAULT FALSE;
ALTER TABLE drop_requests ADD COLUMN IF NOT EXISTS hidden_by_student BOOLEAN DEFAULT FALSE;
