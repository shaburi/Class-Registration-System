const { query, transaction } = require('../database/connection');
const { registerForSection } = require('./registration.service');
const Joi = require('joi');

/**
 * Manual Join Request Service
 * Handles requests to join full sections with lecturer/HOP approval
 */

/**
 * Create a manual join request for a full section
 * @param {string} studentId - Student UUID
 * @param {string} sectionId - Section UUID
 * @param {string} reason - Reason for manual join request
 * @returns {Promise<Object>} - Manual join request result
 */
const createManualJoinRequest = async (studentId, sectionId, reason) => {
    // Validate inputs
    const schema = Joi.object({
        studentId: Joi.string().uuid().required(),
        sectionId: Joi.string().uuid().required(),
        reason: Joi.string().min(10).max(500).required()
    });

    const { error } = schema.validate({ studentId, sectionId, reason });
    if (error) {
        throw new Error(`Validation error: ${error.message}`);
    }

    return await transaction(async (client) => {

        // 1. Verify student exists
        const studentCheck = await client.query(
            'SELECT id, semester, programme FROM users WHERE id = $1 AND role = $2 AND is_active = true',
            [studentId, 'student']
        );

        if (studentCheck.rows.length === 0) {
            throw new Error('Student not found or inactive');
        }

        const student = studentCheck.rows[0];

        // 2. Get section details
        const sectionCheck = await client.query(`
            SELECT 
                s.id, s.capacity, s.enrolled_count, s.subject_id, s.lecturer_id,
                sub.code, sub.name, sub.semester, sub.programme
            FROM sections s
            JOIN subjects sub ON s.subject_id = sub.id
            WHERE s.id = $1 AND s.is_active = true
        `, [sectionId]);

        if (sectionCheck.rows.length === 0) {
            throw new Error('Section not found or inactive');
        }

        const section = sectionCheck.rows[0];

        // 3. Verify subject matches student's semester and programme
        if (section.semester !== student.semester) {
            throw new Error(`Section is for semester ${section.semester}, but student is in semester ${student.semester}`);
        }

        if (section.programme !== student.programme) {
            throw new Error(`Section is for ${section.programme} programme`);
        }

        // 4. Check if already registered for this section
        const existingRegistration = await client.query(
            'SELECT id FROM registrations WHERE student_id = $1 AND section_id = $2',
            [studentId, sectionId]
        );

        if (existingRegistration.rows.length > 0) {
            throw new Error('Student is already registered for this section');
        }

        // 5. Check if already registered for same subject (different section)
        const sameSubjectCheck = await client.query(`
            SELECT r.id
            FROM registrations r
            JOIN sections s ON r.section_id = s.id
            WHERE r.student_id = $1 AND s.subject_id = $2
        `, [studentId, section.subject_id]);

        if (sameSubjectCheck.rows.length > 0) {
            throw new Error(`Student is already registered for ${section.code} in another section`);
        }

        // 6. Check for existing pending manual join request
        const existingRequest = await client.query(`
            SELECT id FROM manual_join_requests
            WHERE student_id = $1 AND section_id = $2 AND status = 'pending'
        `, [studentId, sectionId]);

        if (existingRequest.rows.length > 0) {
            throw new Error('A pending manual join request already exists for this section');
        }

        // 7. Create manual join request
        const requestResult = await client.query(`
            INSERT INTO manual_join_requests (student_id, section_id, reason, status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING *
        `, [studentId, sectionId, reason]);

        return {
            success: true,
            message: 'Manual join request created successfully. Awaiting approval from lecturer or Head of Programme.',
            request: requestResult.rows[0]
        };
    });
};

/**
 * Approve a manual join request
 * @param {string} requestId - Manual join request UUID
 * @param {string} approverId - Approver UUID (lecturer or HOP)
 * @param {string} approverRole - Approver role
 * @param {string} approvalReason - Reason for approval (optional)
 * @returns {Promise<Object>} - Approval result
 */
const approveManualJoinRequest = async (requestId, approverId, approverRole, approvalReason = null) => {
    return await transaction(async (client) => {
        // 1. Get the request
        const requestCheck = await client.query(
            'SELECT * FROM manual_join_requests WHERE id = $1 AND status = $2',
            [requestId, 'pending']
        );

        if (requestCheck.rows.length === 0) {
            throw new Error('Manual join request not found or is no longer pending');
        }

        const request = requestCheck.rows[0];

        // 2. If approver is lecturer, verify they teach this section
        if (approverRole === 'lecturer') {
            const sectionCheck = await client.query(
                'SELECT id FROM sections WHERE id = $1 AND lecturer_id = $2',
                [request.section_id, approverId]
            );

            if (sectionCheck.rows.length === 0) {
                throw new Error('Lecturer is not assigned to this section');
            }
        }

        // 3. Register student for section (manual registration type)
        try {
            await registerForSection(
                request.student_id,
                request.section_id,
                'manual',
                approverId
            );
        } catch (error) {
            // Update request status to rejected if registration fails
            await client.query(`
                UPDATE manual_join_requests
                SET status = 'rejected',
                    rejected_by = $1,
                    rejected_at = NOW(),
                    rejection_reason = $2
                WHERE id = $3
            `, [approverId, `Registration failed: ${error.message}`, requestId]);

            throw error;
        }

        // 4. Update request status to approved
        await client.query(`
            UPDATE manual_join_requests
            SET status = 'approved',
                approved_by = $1,
                approved_at = NOW(),
                approval_reason = $2
            WHERE id = $3
        `, [approverId, approvalReason, requestId]);

        return {
            success: true,
            message: 'Manual join request approved and student registered successfully'
        };
    });
};

/**
 * Reject a manual join request
 * @param {string} requestId - Manual join request UUID
 * @param {string} rejecterId - Rejecter UUID (lecturer or HOP)
 * @param {string} rejecterRole - Rejecter role
 * @param {string} rejectionReason - Reason for rejection
 * @returns {Promise<Object>} - Rejection result
 */
const rejectManualJoinRequest = async (requestId, rejecterId, rejecterRole, rejectionReason) => {
    // Validate reason is provided
    if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new Error('Rejection reason is required');
    }

    return await transaction(async (client) => {
        // 1. Get the request
        const requestCheck = await client.query(
            'SELECT * FROM manual_join_requests WHERE id = $1 AND status = $2',
            [requestId, 'pending']
        );

        if (requestCheck.rows.length === 0) {
            throw new Error('Manual join request not found or is no longer pending');
        }

        const request = requestCheck.rows[0];

        // 2. If rejecter is lecturer, verify they teach this section
        if (rejecterRole === 'lecturer') {
            const sectionCheck = await client.query(
                'SELECT id FROM sections WHERE id = $1 AND lecturer_id = $2',
                [request.section_id, rejecterId]
            );

            if (sectionCheck.rows.length === 0) {
                throw new Error('Lecturer is not assigned to this section');
            }
        }

        // 3. Update request status
        await client.query(`
            UPDATE manual_join_requests
            SET status = 'rejected',
                rejected_by = $1,
                rejected_at = NOW(),
                rejection_reason = $2
            WHERE id = $3
        `, [rejecterId, rejectionReason, requestId]);

        return {
            success: true,
            message: 'Manual join request rejected'
        };
    });
};

/**
 * Get manual join requests for a student
 * @param {string} studentId - Student UUID
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Array>} - List of manual join requests
 */
const getManualJoinRequestsForStudent = async (studentId, status = null) => {
    let queryText = `
        SELECT 
            mjr.*,
            sub.code as subject_code,
            sub.name as subject_name,
            s.section_number,
            s.capacity,
            s.enrolled_count,
            approver.lecturer_name as approver_name,
            rejecter.lecturer_name as rejecter_name
        FROM manual_join_requests mjr
        JOIN sections s ON mjr.section_id = s.id
        JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN users approver ON mjr.approved_by = approver.id
        LEFT JOIN users rejecter ON mjr.rejected_by = rejecter.id
        WHERE mjr.student_id = $1 AND (mjr.hidden_by_student = FALSE OR mjr.hidden_by_student IS NULL)
    `;

    const params = [studentId];

    if (status) {
        queryText += ` AND mjr.status = $2`;
        params.push(status);
    }

    queryText += ` ORDER BY mjr.created_at DESC`;

    const result = await query(queryText, params);
    return result.rows;
};

/**
 * Get manual join requests for lecturer's sections
 * @param {string} lecturerId - Lecturer UUID
 * @param {string} status - Filter by status
 * @returns {Promise<Array>} - List of manual join requests
 */
const getManualJoinRequestsForLecturer = async (lecturerId, status = 'pending') => {
    const result = await query(`
        SELECT 
            mjr.*,
            student.student_name,
            student.student_id as student_number,
            sub.code as subject_code,
            sub.name as subject_name,
            s.section_number,
            s.capacity,
            s.enrolled_count,
            (s.capacity - s.enrolled_count) as available_seats
        FROM manual_join_requests mjr
        JOIN users student ON mjr.student_id = student.id
        JOIN sections s ON mjr.section_id = s.id
        JOIN subjects sub ON s.subject_id = sub.id
        WHERE s.lecturer_id = $1 AND mjr.status = $2
        ORDER BY mjr.created_at DESC
    `, [lecturerId, status]);

    return result.rows;
};

/**
 * Get all manual join requests (HOP only)
 * @param {string} status - Filter by status (optional)
 * @param {string} hopProgramme - HOP's assigned programme for data isolation (optional)
 * @returns {Promise<Array>} - List of all manual join requests
 */
const getAllManualJoinRequests = async (status = null, hopProgramme = null) => {
    let queryText = `
        SELECT 
            mjr.*,
            student.student_name,
            student.student_id as student_number,
            sub.code as subject_code,
            sub.name as subject_name,
            s.section_number,
            s.capacity,
            s.enrolled_count,
            lecturer.lecturer_name,
            approver.lecturer_name as approver_name
        FROM manual_join_requests mjr
        JOIN users student ON mjr.student_id = student.id
        JOIN sections s ON mjr.section_id = s.id
        JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN users lecturer ON s.lecturer_id = lecturer.id
        LEFT JOIN users approver ON mjr.approved_by = approver.id
        WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
        queryText += ` AND mjr.status = $${paramCount}`;
        params.push(status);
        paramCount++;
    }

    // HOP programme isolation
    if (hopProgramme) {
        queryText += ` AND (
            sub.programme = $${paramCount}
            OR sub.code IN (
                SELECT DISTINCT sub2.code FROM subjects sub2
                WHERE sub2.programme = $${paramCount}
            )
            OR sub.code IN (
                SELECT DISTINCT sub3.code
                FROM program_structure_courses psc
                JOIN program_structures ps ON psc.structure_id = ps.id
                JOIN subjects sub3 ON psc.subject_id = sub3.id
                WHERE ps.programme = $${paramCount}
            )
        )`;
        params.push(hopProgramme);
        paramCount++;
    }

    queryText += ` ORDER BY mjr.created_at DESC`;

    const result = await query(queryText, params);
    return result.rows;
};

module.exports = {
    createManualJoinRequest,
    approveManualJoinRequest,
    rejectManualJoinRequest,
    getManualJoinRequestsForStudent,
    getManualJoinRequestsForLecturer,
    getAllManualJoinRequests
};
