const { query } = require('../database/connection');

class ManualJoinRequest {
    // Create a new manual join request
    static async create(requestData) {
        const { student_id, section_id, reason } = requestData;

        const text = `
            INSERT INTO manual_join_requests (student_id, section_id, reason)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const values = [student_id, section_id, reason];
        const result = await query(text, values);
        return result.rows[0];
    }

    // Find manual request by ID
    static async findById(id) {
        const text = `
            SELECT 
                mjr.*,
                u.student_id,
                u.student_name,
                u.email as student_email,
                sec.section_number,
                sec.capacity,
                sec.enrolled_count,
                sub.code as subject_code,
                sub.name as subject_name,
                lec.lecturer_name
            FROM manual_join_requests mjr
            JOIN users u ON mjr.student_id = u.id
            JOIN sections sec ON mjr.section_id = sec.id
            JOIN subjects sub ON sec.subject_id = sub.id
            LEFT JOIN users lec ON sec.lecturer_id = lec.id
            WHERE mjr.id = $1
        `;

        const result = await query(text, [id]);
        return result.rows[0];
    }

    // Get all requests for a student
    static async findByStudent(studentId) {
        const text = `
            SELECT 
                mjr.*,
                sec.section_number,
                sub.code as subject_code,
                sub.name as subject_name,
                lec.lecturer_name
            FROM manual_join_requests mjr
            JOIN sections sec ON mjr.section_id = sec.id
            JOIN subjects sub ON sec.subject_id = sub.id
            LEFT JOIN users lec ON sec.lecturer_id = lec.id
            WHERE mjr.student_id = $1
            ORDER BY mjr.created_at DESC
        `;

        const result = await query(text, [studentId]);
        return result.rows;
    }

    // Get requests for sections taught by a lecturer
    static async findByLecturer(lecturerId) {
        const text = `
            SELECT 
                mjr.*,
                u.student_id,
                u.student_name,
                u.email as student_email,
                sec.section_number,
                sec.capacity,
                sec.enrolled_count,
                sub.code as subject_code,
                sub.name as subject_name
            FROM manual_join_requests mjr
            JOIN users u ON mjr.student_id = u.id
            JOIN sections sec ON mjr.section_id = sec.id
            JOIN subjects sub ON sec.subject_id = sub.id
            WHERE sec.lecturer_id = $1 AND mjr.status = 'pending'
            ORDER BY mjr.created_at ASC
        `;

        const result = await query(text, [lecturerId]);
        return result.rows;
    }

    // Get all pending requests (for HOP)
    static async findPending() {
        const text = `
            SELECT 
                mjr.*,
                u.student_id,
                u.student_name,
                sec.section_number,
                sub.code as subject_code,
                sub.name as subject_name,
                lec.lecturer_name
            FROM manual_join_requests mjr
            JOIN users u ON mjr.student_id = u.id
            JOIN sections sec ON mjr.section_id = sec.id
            JOIN subjects sub ON sec.subject_id = sub.id
            LEFT JOIN users lec ON sec.lecturer_id = lec.id
            WHERE mjr.status = 'pending'
            ORDER BY mjr.created_at ASC
        `;

        const result = await query(text);
        return result.rows;
    }

    // Approve request
    static async approve(id, approvedBy, approvalReason) {
        const text = `
            UPDATE manual_join_requests 
            SET 
                status = 'approved',
                approved_by = $1,
                approved_at = NOW(),
                approval_reason = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `;

        const values = [approvedBy, approvalReason, id];
        const result = await query(text, values);
        return result.rows[0];
    }

    // Reject request
    static async reject(id, rejectedBy, rejectionReason) {
        const text = `
            UPDATE manual_join_requests 
            SET 
                status = 'rejected',
                rejected_by = $1,
                rejected_at = NOW(),
                rejection_reason = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `;

        const values = [rejectedBy, rejectionReason, id];
        const result = await query(text, values);
        return result.rows[0];
    }

    // Check if student has a pending request for the same section
    static async hasPendingForSection(studentId, sectionId) {
        const text = `
            SELECT id FROM manual_join_requests 
            WHERE student_id = $1 AND section_id = $2 AND status = 'pending'
        `;
        const result = await query(text, [studentId, sectionId]);
        return result.rows.length > 0;
    }

    // Get statistics
    static async getStatistics() {
        const text = `
            SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
            FROM manual_join_requests
        `;

        const result = await query(text);
        return result.rows[0];
    }
}

module.exports = ManualJoinRequest;
