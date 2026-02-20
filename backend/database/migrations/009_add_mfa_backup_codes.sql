-- Migration 009: Add MFA backup codes column
-- The mfa_enabled and mfa_secret columns already exist in the schema.
-- This adds backup/recovery codes for 2FA.

ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];
