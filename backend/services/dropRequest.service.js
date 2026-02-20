const { query, transaction } = require('../database/connection');
const { unregisterFromSection } = require('./registration.service');
const Joi = require('joi');

/**
 * Drop Request Service
 * Handles student requests to drop classes with HOP approval
 */

/**
 * Create a drop request
 * @param {string} studentId - Student UUID
 * @param {string} registrationId - Registration UUID
 * @param {string} reason - Reason for dropping
 * @returns {Promise<Object>} - Drop request result
 */
const createDropRequest = async (studentId, registrationId, reason) => {
    // Validate inputs
    const schema = Joi.object({
        studentId: Joi.string().uuid().required(),
        registrationId: Joi.string().uuid().required(),
        reason: Joi.string().min(10).max(500).required()
    });

    const { error } = schema.validate({ studentId, registrationId, reason });
    if (error) {
        throw new Error(`Validation error: ${error.message}`);
    }

    return await transaction(async (client) => {
        // 1. Verify registration exists and belongs to student
        const regCheck = await client.query(`
            SELECT r.id, r.section_id, s.section_number, sub.code, sub.name
            FROM registrations r
            JOIN sections s ON r.section_id = s.id
            JOIN subjects sub ON s.subject_id = sub.id
            WHERE r.id = $1 AND r.student_id = $2
        `, [registrationId, studentId]);

        if (regCheck.rows.length === 0) {
            throw new Error('Registration not found or does not belong to student');
        }

        const registration = regCheck.rows[0];

        // 2. Check for existing pending drop request
        const existingRequest = await client.query(`
            SELECT id FROM drop_requests
            WHERE registration_id = $1 AND status = 'pending'
        `, [registrationId]);

        if (existingRequest.rows.length > 0) {
            throw new Error('A pending drop request already exists for this registration');
        }

        // 3. Create drop request
        const requestResult = await client.query(`
            INSERT INTO drop_requests (student_id, registration_id, section_id, reason, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING *
        `, [studentId, registrationId, registration.section_id, reason]);

        return {
            success: true,
            message: 'Drop request submitted successfully. Awaiting HOP approval.',
            request: requestResult.rows[0]
        };
    });
};

/**
 * Approve a drop request
 * @param {string} requestId - Drop request UUID
 * @param {string} hopId - HOP UUID
 * @param {string} approvalReason - Optional approval reason
 * @returns {Promise<Object>} - Approval result
 */
const approveDropRequest = async (requestId, hopId, approvalReason = null) => {
    return await transaction(async (client) => {
        // 1. Get the drop request
        const requestCheck = await client.query(
            'SELECT * FROM drop_requests WHERE id = $1 AND status = $2',
            [requestId, 'pending']
        );

        if (requestCheck.rows.length === 0) {
            throw new Error('Drop request not found or is no longer pending');
        }

        const request = requestCheck.rows[0];

        // 2. Unregister the student from the section
        try {
            await unregisterFromSection(request.student_id, request.registration_id);
        } catch (error) {
            throw new Error(`Failed to drop student: ${error.message}`);
        }

        // 3. Update drop request status
        await client.query(`
            UPDATE drop_requests
            SET status = 'approved',
                reviewed_by = $1,
                reviewed_at = NOW()
            WHERE id = $2
        `, [hopId, requestId]);

        return {
            success: true,
            message: 'Drop request approved and student has been dropped from the section'
        };
    });
};

/**
 * Reject a drop request
 * @param {string} requestId - Drop request UUID
 * @param {string} hopId - HOP UUID
 * @param {string} rejectionReason - Reason for rejection
 * @returns {Promise<Object>} - Rejection result
 */
const rejectDropRequest = async (requestId, hopId, rejectionReason) => {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new Error('Rejection reason is required');
    }

    return await transaction(async (client) => {
        // 1. Get the drop request
        const requestCheck = await client.query(
            'SELECT * FROM drop_requests WHERE id = $1 AND status = $2',
            [requestId, 'pending']
        );

        if (requestCheck.rows.length === 0) {
            throw new Error('Drop request not found or is no longer pending');
        }

        // 2. Update drop request status
        await client.query(`
            UPDATE drop_requests
            SET status = 'rejected',
                reviewed_by = $1,
                reviewed_at = NOW(),
                rejection_reason = $2
            WHERE id = $3
        `, [hopId, rejectionReason, requestId]);

        return {
            success: true,
            message: 'Drop request rejected'
        };
    });
};

/**
 * Get drop requests for a student
 * @param {string} studentId - Student UUID
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Array>} - List of drop requests
 */
const getDropRequestsForStudent = async (studentId, status = null) => {
    let queryText = `
        SELECT 
            dr.*,
            sub.code as subject_code,
            sub.name as subject_name,
            s.section_number,
            reviewer.lecturer_name as reviewer_name
        FROM drop_requests dr
        JOIN sections s ON dr.section_id = s.id
        JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN users reviewer ON dr.reviewed_by = reviewer.id
        WHERE dr.student_id = $1
    `;

    const params = [studentId];

    if (status) {
        queryText += ` AND dr.status = $2`;
        params.push(status);
    }

    queryText += ` ORDER BY dr.created_at DESC`;

    const result = await query(queryText, params);
    return result.rows;
};

/**
 * Get all drop requests (HOP only)
 * @param {string} status - Filter by status (optional)
 * @param {string} hopProgramme - HOP's assigned programme for data isolation (optional)
 * @returns {Promise<Array>} - List of all drop requests
 */
const getAllDropRequests = async (status = null, hopProgramme = null) => {
    let queryText = `
        SELECT 
            dr.*,
            student.student_name,
            student.student_id as student_number,
            sub.code as subject_code,
            sub.name as subject_name,
            s.section_number,
            reviewer.lecturer_name as reviewer_name
        FROM drop_requests dr
        JOIN users student ON dr.student_id = student.id
        JOIN sections s ON dr.section_id = s.id
        JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN users reviewer ON dr.reviewed_by = reviewer.id
        WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
        queryText += ` AND dr.status = $${paramCount}`;
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

    queryText += ` ORDER BY dr.created_at DESC`;

    const result = await query(queryText, params);
    return result.rows;
};

module.exports = {
    createDropRequest,
    approveDropRequest,
    rejectDropRequest,
    getDropRequestsForStudent,
    getAllDropRequests
};
