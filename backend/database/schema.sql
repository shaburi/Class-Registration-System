-- UPTM Class Registration & Scheduling System - Database Schema
-- PostgreSQL 14+
-- Includes row-level security, triggers, and comprehensive constraints

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS manual_join_requests CASCADE;
DROP TABLE IF EXISTS swap_requests CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
DROP TYPE IF EXISTS day_of_week CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom ENUM types
CREATE TYPE user_role AS ENUM ('student', 'lecturer', 'hop');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    
    -- Student-specific fields
    student_id VARCHAR(50) UNIQUE,
    student_name VARCHAR(255),
    semester INTEGER CHECK (semester >= 1 AND semester <= 11),
    programme VARCHAR(100),
    
    -- Lecturer-specific fields
    lecturer_id VARCHAR(50) UNIQUE,
    lecturer_name VARCHAR(255),
    department VARCHAR(100),
    
    -- Security fields
    password_hash VARCHAR(255), -- bcrypt hash for optional password auth
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255), -- Encrypted TOTP secret
    last_login_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    CONSTRAINT valid_student CHECK (
        (role = 'student' AND student_id IS NOT NULL AND semester IS NOT NULL) OR
        (role != 'student')
    ),
    CONSTRAINT valid_lecturer CHECK (
        (role = 'lecturer' AND lecturer_id IS NOT NULL) OR
        (role != 'lecturer')
    )
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_student_id ON users(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_users_lecturer_id ON users(lecturer_id) WHERE lecturer_id IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- SUBJECTS TABLE
-- ============================================================================
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    credit_hours INTEGER NOT NULL CHECK (credit_hours > 0),
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 11),
    programme VARCHAR(100) NOT NULL,
    description TEXT,
    prerequisites TEXT[], -- Array of subject codes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_subjects_code ON subjects(code);
CREATE INDEX idx_subjects_semester ON subjects(semester);
CREATE INDEX idx_subjects_programme ON subjects(programme);

-- ============================================================================
-- SECTIONS TABLE
-- ============================================================================
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    section_number VARCHAR(10) NOT NULL,
    
    -- Capacity management
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    enrolled_count INTEGER DEFAULT 0 CHECK (enrolled_count >= 0),
    
    -- Schedule information
    day day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(50),
    building VARCHAR(50),
    
    -- Lecturer assignment
    lecturer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT capacity_limit CHECK (enrolled_count <= capacity),
    CONSTRAINT unique_section UNIQUE(subject_id, section_number)
);

CREATE INDEX idx_sections_subject_id ON sections(subject_id);
CREATE INDEX idx_sections_lecturer_id ON sections(lecturer_id);
CREATE INDEX idx_sections_schedule ON sections(day, start_time, end_time);

-- ============================================================================
-- REGISTRATIONS TABLE
-- ============================================================================
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    
    -- Registration metadata
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registration_type VARCHAR(20) DEFAULT 'normal' CHECK (registration_type IN ('normal', 'manual', 'swap')),
    approved_by UUID REFERENCES users(id), -- For manual registrations
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_student_section UNIQUE(student_id, section_id)
);

CREATE INDEX idx_registrations_student ON registrations(student_id);
CREATE INDEX idx_registrations_section ON registrations(section_id);
CREATE INDEX idx_registrations_date ON registrations(registered_at);

-- ============================================================================
-- SWAP REQUESTS TABLE
-- ============================================================================
CREATE TABLE swap_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Requester (student who initiates swap)
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    
    -- Target (student who receives swap request)
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    
    -- Request status
    status request_status DEFAULT 'pending',
    
    -- Response details
    responded_at TIMESTAMP WITH TIME ZONE,
    response_reason TEXT,
    
    -- Approval details (if requires lecturer/HOP approval)
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT different_students CHECK (requester_id != target_id),
    CONSTRAINT different_sections CHECK (requester_section_id != target_section_id)
);

CREATE INDEX idx_swap_requests_requester ON swap_requests(requester_id);
CREATE INDEX idx_swap_requests_target ON swap_requests(target_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);

-- ============================================================================
-- MANUAL JOIN REQUESTS TABLE
-- ============================================================================
CREATE TABLE manual_join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    
    -- Request details
    reason TEXT NOT NULL,
    status request_status DEFAULT 'pending',
    
    -- Approval details
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_reason TEXT,
    
    -- Rejection details
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_manual_join_student ON manual_join_requests(student_id);
CREATE INDEX idx_manual_join_section ON manual_join_requests(section_id);
CREATE INDEX idx_manual_join_status ON manual_join_requests(status);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User identification (hashed for privacy)
    user_id_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
    user_role user_role,
    
    -- Request details
    ip_address INET NOT NULL,
    user_agent TEXT,
    
    -- Action details
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    
    -- Request/Response metadata (encrypted)
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    request_body_encrypted TEXT, -- AES-256 encrypted JSON
    response_status INTEGER,
    
    -- Security events
    is_suspicious BOOLEAN DEFAULT FALSE,
    suspicious_reason TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_hash ON audit_logs(user_id_hash);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_suspicious ON audit_logs(is_suspicious) WHERE is_suspicious = TRUE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subjects_timestamp
    BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sections_timestamp
    BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Section capacity management trigger
CREATE OR REPLACE FUNCTION update_section_capacity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE sections 
        SET enrolled_count = enrolled_count + 1 
        WHERE id = NEW.section_id;
        
        -- Check if section is now over capacity
        IF (SELECT enrolled_count FROM sections WHERE id = NEW.section_id) > 
           (SELECT capacity FROM sections WHERE id = NEW.section_id) THEN
            RAISE EXCEPTION 'Section is at full capacity';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE sections 
        SET enrolled_count = enrolled_count - 1 
        WHERE id = OLD.section_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manage_section_capacity
    AFTER INSERT OR DELETE ON registrations
    FOR EACH ROW EXECUTE FUNCTION update_section_capacity();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_join_requests ENABLE ROW LEVEL SECURITY;

-- Students can only view their own registrations
CREATE POLICY student_view_own_registrations ON registrations
    FOR SELECT
    USING (student_id = current_setting('app.current_user_id')::UUID);

-- Students can only create/delete their own registrations
CREATE POLICY student_manage_own_registrations ON registrations
    FOR ALL
    USING (student_id = current_setting('app.current_user_id')::UUID);

-- Lecturers can view registrations for their sections
CREATE POLICY lecturer_view_section_registrations ON registrations
    FOR SELECT
    USING (
        section_id IN (
            SELECT id FROM sections 
            WHERE lecturer_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample HOP user
INSERT INTO users (email, firebase_uid, role, lecturer_name, department, lecturer_id) 
VALUES 
    ('hop@uptm.edu.my', 'firebase_hop_uid_123', 'hop', 'Dr. Ahmad Hassan', 'Computer Science', 'L001');

-- Insert sample lecturer
INSERT INTO users (email, firebase_uid, role, lecturer_name, department, lecturer_id)
VALUES 
    ('lecturer1@uptm.edu.my', 'firebase_lecturer_uid_456', 'lecturer', 'Prof. Siti Aminah', 'Computer Science', 'L002');

-- Insert sample students
INSERT INTO users (email, firebase_uid, role, student_id, student_name, semester, programme)
VALUES 
    ('student1@student.uptm.edu.my', 'firebase_student_uid_789', 'student', 'S2020001', 'Ahmad bin Abdullah', 3, 'Computer Science'),
    ('student2@student.uptm.edu.my', 'firebase_student_uid_790', 'student', 'S2020002', 'Nurul binti Ibrahim', 3, 'Computer Science');

-- Insert sample subject
INSERT INTO subjects (code, name, credit_hours, semester, programme, created_by)
VALUES 
    ('CSC301', 'Data Structures and Algorithms', 3, 3, 'Computer Science', 
     (SELECT id FROM users WHERE email = 'hop@uptm.edu.my'));

-- Insert sample sections
INSERT INTO sections (subject_id, section_number, capacity, day, start_time, end_time, room, lecturer_id)
VALUES 
    ((SELECT id FROM subjects WHERE code = 'CSC301'), 'A', 30, 'monday', '09:00', '11:00', 'R301',
     (SELECT id FROM users WHERE email = 'lecturer1@uptm.edu.my')),
    ((SELECT id FROM subjects WHERE code = 'CSC301'), 'B', 30, 'wednesday', '14:00', '16:00', 'R302',
     (SELECT id FROM users WHERE email = 'lecturer1@uptm.edu.my'));

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Sample data inserted for testing.';
    RAISE NOTICE 'Remember to configure row-level security settings for your application user.';
END $$;
