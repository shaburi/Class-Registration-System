const { query } = require('../database/connection');

class SwapRequest {
    // Create a new swap request
    static async create(requestData) {
        const { requester_id, requester_section_id, target_id, target_section_id } = requestData;

        const text = `
            INSERT INTO swap_requests (
                requester_id, requester_section_id, target_id, target_section_id
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const values = [requester_id, requester_section_id, target_id, target_section_id];
        const result = await query(text, values);
        return result.rows[0];
    }

    // Find swap request by ID
    static async findById(id) {
        const text = `
            SELECT 
                sr.*,
                req_sec.section_number as requester_section,
                req_sub.code as requester_subject_code,
                req_sub.name as requester_subject_name,
                tar_sec.section_number as target_section,
                tar_sub.code as target_subject_code,
                tar_sub.name as target_subject_name,
                req_user.student_name as requester_name,
                tar_user.student_name as target_name
            FROM swap_requests sr
            JOIN sections req_sec ON sr.requester_section_id = req_sec.id
            JOIN subjects req_sub ON req_sec.subject_id = req_sub.id
            JOIN sections tar_sec ON sr.target_section_id = tar_sec.id
            JOIN subjects tar_sub ON tar_sec.subject_id = tar_sub.id
            JOIN users req_user ON sr.requester_id = req_user.id
            JOIN users tar_user ON sr.target_id = tar_user.id
            WHERE sr.id = $1
        `;

        const result = await query(text, [id]);
        return result.rows[0];
    }

    // Get all swap requests for a user (as requester or target)
    static async findByUser(userId, role = 'both') {
        let text = `
            SELECT 
                sr.*,
                req_sec.section_number as requester_section,
                req_sub.code as requester_subject_code,
                req_sub.name as requester_subject_name,
                tar_sec.section_number as target_section,
                tar_sub.code as target_subject_code,
                tar_sub.name as target_subject_name,
                req_user.student_name as requester_name,
                tar_user.student_name as target_name
            FROM swap_requests sr
            JOIN sections req_sec ON sr.requester_section_id = req_sec.id
            JOIN subjects req_sub ON req_sec.subject_id = req_sub.id
            JOIN sections tar_sec ON sr.target_section_id = tar_sec.id
            JOIN subjects tar_sub ON tar_sec.subject_id = tar_sub.id
            JOIN users req_user ON sr.requester_id = req_user.id
            JOIN users tar_user ON sr.target_id = tar_user.id
            WHERE 
        `;

        if (role === 'requester') {
            text += 'sr.requester_id = $1';
        } else if (role === 'target') {
            text += 'sr.target_id = $1';
        } else {
            text += '(sr.requester_id = $1 OR sr.target_id = $1)';
        }

        text += ' ORDER BY sr.created_at DESC';

        const result = await query(text, [userId]);
        return result.rows;
    }

    // Get pending swap requests
    static async findPending() {
        const text = `
            SELECT 
                sr.*,
                req_sec.section_number as requester_section,
                req_sub.code as requester_subject_code,
                tar_sec.section_number as target_section,
                tar_sub.code as target_subject_code
            FROM swap_requests sr
            JOIN sections req_sec ON sr.requester_section_id = req_sec.id
            JOIN subjects req_sub ON req_sec.subject_id = req_sub.id
            JOIN sections tar_sec ON sr.target_section_id = tar_sec.id
            JOIN subjects tar_sub ON tar_sec.subject_id = tar_sub.id
            WHERE sr.status = 'pending'
            ORDER BY sr.created_at ASC
        `;

        const result = await query(text);
        return result.rows;
    }

    // Update swap request status
    static async updateStatus(id, status, userId, reason = null) {
        const text = `
            UPDATE swap_requests 
            SET 
                status = $1,
                responded_at = NOW(),
                response_reason = $2,
                approved_by = $3,
                approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END,
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
        `;

        const values = [status, reason, userId, id];
        const result = await query(text, values);
        return result.rows[0];
    }

    // Find matching swap requests (for automatic swaps)
    static async findMatching(sectionAId, sectionBId) {
        const text = `
            SELECT * FROM swap_requests
            WHERE status = 'pending'
            AND (
                (requester_section_id = $1 AND target_section_id = $2)
                OR
                (requester_section_id = $2 AND target_section_id = $1)
            )
            ORDER BY created_at ASC
            LIMIT 2
        `;

        const result = await query(text, [sectionAId, sectionBId]);
        return result.rows;
    }

    // Delete swap request
    static async delete(id) {
        const text = 'DELETE FROM swap_requests WHERE id = $1 RETURNING *';
        const result = await query(text, [id]);
        return result.rows[0];
    }

    // Get statistics
    static async getStatistics() {
        const text = `
            SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
            FROM swap_requests
        `;

        const result = await query(text);
        return result.rows[0];
    }
}

module.exports = SwapRequest;
