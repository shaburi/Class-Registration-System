-- Migration 010: Performance indexes for frequently queried tables
-- Run with: node scripts/run-migration.js 010_performance_indexes.sql

-- ============================================================================
-- 1. drop_requests — has NO indexes despite being queried 9+ times by status/student/section
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_drop_requests_status ON drop_requests(status);
CREATE INDEX IF NOT EXISTS idx_drop_requests_student ON drop_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_drop_requests_section ON drop_requests(section_id);
CREATE INDEX IF NOT EXISTS idx_drop_requests_registration ON drop_requests(registration_id);

-- Composite index for the most common query: "pending requests for a student"
CREATE INDEX IF NOT EXISTS idx_drop_requests_student_status ON drop_requests(student_id, status);

-- ============================================================================
-- 2. users.programme — used in HOP data isolation filters, currently unindexed
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_programme ON users(programme) WHERE programme IS NOT NULL;

-- ============================================================================
-- 3. registrations composite — the (student_id, section_id) UNIQUE constraint
--    already acts as an index, but add a covering index for session lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_registrations_session_student ON registrations(session_id, student_id);

-- ============================================================================
-- 4. manual_join_requests — add composite for "pending requests by student"
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_manual_join_student_status ON manual_join_requests(student_id, status);

-- ============================================================================
-- 5. sections.session_id + subject_id composite for HOP dashboard loads
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sections_session_subject ON sections(session_id, subject_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Performance indexes created successfully!';
    RAISE NOTICE 'Indexes added for: drop_requests, users.programme, registrations, manual_join_requests, sections';
END $$;
