const { query, transaction } = require('../database/connection');
const { detectScheduleClash } = require('./registration.service');
const Joi = require('joi');

/**
 * Swap Request Service
 * Handles section swap requests between students
 */

/**
 * Create a swap request between two students
 * @param {string} requesterId - Requester student UUID
 * @param {string} requesterSectionId - Requester's current section UUID
 * @param {string} targetId - Target student UUID
 * @param {string} targetSectionId - Target's current section UUID
 * @returns {Promise<Object>} - Swap request result
 */
const createSwapRequest = async (requesterId, requesterSectionId, targetId, targetSectionId) => {
    // Validate inputs
    const schema = Joi.object({
        requesterId: Joi.string().uuid().required(),
        requesterSectionId: Joi.string().uuid().required(),
        targetId: Joi.string().uuid().required(),
        targetSectionId: Joi.string().uuid().required()
    });

    const { error } = schema.validate({ requesterId, requesterSectionId, targetId, targetSectionId });
    if (error) {
        throw new Error(`Validation error: ${error.message}`);
    }

    return await transaction(async (client) => {

        // 1. Verify both students exist and are active
        const studentsCheck = await client.query(
            'SELECT id FROM users WHERE id = ANY($1::uuid[]) AND role = $2 AND is_active = true',
            [[requesterId, targetId], 'student']
        );

        if (studentsCheck.rows.length !== 2) {
            throw new Error('One or both students not found or inactive');
        }

        // 2. Verify requester is registered for requester section
        const requesterRegistration = await client.query(
            'SELECT id FROM registrations WHERE student_id = $1 AND section_id = $2',
            [requesterId, requesterSectionId]
        );

        if (requesterRegistration.rows.length === 0) {
            throw new Error('Requester is not registered for the specified section');
        }

        // 3. Verify target is registered for target section
        const targetRegistration = await client.query(
            'SELECT id FROM registrations WHERE student_id = $1 AND section_id = $2',
            [targetId, targetSectionId]
        );

        if (targetRegistration.rows.length === 0) {
            throw new Error('Target student is not registered for the specified section');
        }

        // 4. Get section details for clash detection
        const sectionsCheck = await client.query(`
            SELECT 
                s.id, s.day, s.start_time, s.end_time, s.subject_id,
                sub.code, sub.name
            FROM sections s
            JOIN subjects sub ON s.subject_id = sub.id
            WHERE s.id = ANY($1::uuid[])
        `, [[requesterSectionId, targetSectionId]]);

        if (sectionsCheck.rows.length !== 2) {
            throw new Error('One or both sections not found');
        }

        // 5. Verify both sections are for the same subject
        const [section1, section2] = sectionsCheck.rows;
        if (section1.subject_id !== section2.subject_id) {
            throw new Error('Swap requests must be for sections of the same subject');
        }

        // 6. Check for schedule clashes after swap
        const requesterSection = sectionsCheck.rows.find(s => s.id === requesterSectionId);
        const targetSection = sectionsCheck.rows.find(s => s.id === targetSectionId);

        // Check if requester would have clash with target's section
        const requesterClash = await detectScheduleClash(
            client, requesterId, targetSection.day, targetSection.start_time, targetSection.end_time
        );

        if (requesterClash.hasClash) {
            throw new Error(`Requester would have schedule clash: ${requesterClash.details}`);
        }

        // Check if target would have clash with requester's section
        const targetClash = await detectScheduleClash(
            client, targetId, requesterSection.day, requesterSection.start_time, requesterSection.end_time
        );

        if (targetClash.hasClash) {
            throw new Error(`Target student would have schedule clash: ${targetClash.details}`);
        }

        // 7. Check for existing pending swap request between these students
        const existingSwap = await client.query(`
            SELECT id FROM swap_requests
            WHERE status = 'pending'
                AND (
                    (requester_id = $1 AND target_id = $2) OR
                    (requester_id = $2 AND target_id = $1)
                )
        `, [requesterId, targetId]);

        if (existingSwap.rows.length > 0) {
            throw new Error('A pending swap request already exists between these students');
        }

        // 8. Create swap request
        const swapResult = await client.query(`
            INSERT INTO swap_requests (
                requester_id, requester_section_id, 
                target_id, target_section_id,
                status
            ) VALUES ($1, $2, $3, $4, 'pending')
            RETURNING *
        `, [requesterId, requesterSectionId, targetId, targetSectionId]);

        return {
            success: true,
            message: 'Swap request created successfully',
            swapRequest: swapResult.rows[0]
        };
    });
};

/**
 * Respond to a swap request (accept or reject)
 * @param {string} swapRequestId - Swap request UUID
 * @param {string} targetId - Target student UUID (must match request)
 * @param {boolean} accept - True to accept, false to reject
 * @param {string} reason - Optional reason for response
 * @returns {Promise<Object>} - Response result
 */
const respondToSwapRequest = async (swapRequestId, targetId, accept, reason = null) => {
    return await transaction(async (client) => {

        // 1. Get swap request
        const swapCheck = await client.query(
            'SELECT * FROM swap_requests WHERE id = $1 AND target_id = $2 AND status = $3',
            [swapRequestId, targetId, 'pending']
        );

        if (swapCheck.rows.length === 0) {
            throw new Error('Swap request not found, does not belong to you, or is no longer pending');
        }

        const swapRequest = swapCheck.rows[0];

        if (accept) {
            // Auto-approve and execute swap
            return await approveSwapRequest(client, swapRequest);
        } else {
            // Reject swap request
            await client.query(`
                UPDATE swap_requests
                SET status = 'rejected', 
                    responded_at = NOW(),
                    response_reason = $1
                WHERE id = $2
            `, [reason, swapRequestId]);

            return {
                success: true,
                message: 'Swap request rejected',
                status: 'rejected'
            };
        }
    });
};

/**
 * Approve and execute a swap request (internal function)
 * @param {Object} client - Database client
 * @param {Object} swapRequest - Swap request object
 * @returns {Promise<Object>} - Approval result
 */
const approveSwapRequest = async (client, swapRequest) => {
    const { id, requester_id, requester_section_id, target_id, target_section_id } = swapRequest;

    // 1. Get both registrations
    const registrations = await client.query(`
        SELECT id, student_id, section_id
        FROM registrations
        WHERE (student_id = $1 AND section_id = $2)
            OR (student_id = $3 AND section_id = $4)
    `, [requester_id, requester_section_id, target_id, target_section_id]);

    if (registrations.rows.length !== 2) {
        throw new Error('One or both registrations no longer exist');
    }

    const requesterReg = registrations.rows.find(r => r.student_id === requester_id);
    const targetReg = registrations.rows.find(r => r.student_id === target_id);

    // 2. Swap the sections (atomic update)
    await client.query(`
        UPDATE registrations
        SET section_id = CASE
            WHEN id = $1::uuid THEN $2::uuid
            WHEN id = $3::uuid THEN $4::uuid
        END,
        registration_type = 'swap'
        WHERE id IN ($1::uuid, $3::uuid)
    `, [requesterReg.id, target_section_id, targetReg.id, requester_section_id]);

    // 3. Update swap request status
    await client.query(`
        UPDATE swap_requests
        SET status = 'approved',
            responded_at = NOW(),
            approved_at = NOW()
        WHERE id = $1
    `, [id]);

    return {
        success: true,
        message: 'Swap request approved and sections swapped successfully',
        status: 'approved'
    };
};

/**
 * Get swap requests for a student (as requester or target)
 * @param {string} studentId - Student UUID
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Array>} - List of swap requests
 */
const getSwapRequests = async (studentId, status = null) => {
    let queryText = `
        SELECT 
            sr.*,
            req_student.student_name as requester_name,
            target_student.student_name as target_name,
            req_sub.code as requester_subject_code,
            req_sec.section_number as requester_section_number,
            target_sub.code as target_subject_code,
            target_sec.section_number as target_section_number
        FROM swap_requests sr
        JOIN users req_student ON sr.requester_id = req_student.id
        JOIN users target_student ON sr.target_id = target_student.id
        JOIN sections req_sec ON sr.requester_section_id = req_sec.id
        JOIN sections target_sec ON sr.target_section_id = target_sec.id
        JOIN subjects req_sub ON req_sec.subject_id = req_sub.id
        JOIN subjects target_sub ON target_sec.subject_id = target_sub.id
        WHERE (sr.requester_id = $1 OR sr.target_id = $1)
    `;

    const params = [studentId];

    if (status) {
        queryText += ` AND sr.status = $2`;
        params.push(status);
    }

    queryText += ` ORDER BY sr.created_at DESC`;

    const result = await query(queryText, params);
    return result.rows;
};

/**
 * Get swap requests for lecturer's sections (for approval)
 * @param {string} lecturerId - Lecturer UUID
 * @param {string} status - Filter by status
 * @returns {Promise<Array>} - List of swap requests
 */
const getSwapRequestsForLecturer = async (lecturerId, status = 'pending') => {
    const result = await query(`
        SELECT DISTINCT
            sr.*,
            req_student.student_name as requester_name,
            target_student.student_name as target_name,
            req_sub.code as subject_code,
            req_sub.name as subject_name,
            req_sec.section_number as requester_section,
            target_sec.section_number as target_section
        FROM swap_requests sr
        JOIN users req_student ON sr.requester_id = req_student.id
        JOIN users target_student ON sr.target_id = target_student.id
        JOIN sections req_sec ON sr.requester_section_id = req_sec.id
        JOIN sections target_sec ON sr.target_section_id = target_sec.id
        JOIN subjects req_sub ON req_sec.subject_id = req_sub.id
        WHERE (req_sec.lecturer_id = $1 OR target_sec.lecturer_id = $1)
            AND sr.status = $2
        ORDER BY sr.created_at DESC
    `, [lecturerId, status]);

    return result.rows;
};

/**
 * Cancel a swap request (by requester only)
 * @param {string} swapRequestId - Swap request UUID
 * @param {string} requesterId - Requester UUID
 * @returns {Promise<Object>} - Cancellation result
 */
const cancelSwapRequest = async (swapRequestId, requesterId) => {
    const result = await query(`
        UPDATE swap_requests
        SET status = 'cancelled'
        WHERE id = $1 AND requester_id = $2 AND status = 'pending'
        RETURNING *
    `, [swapRequestId, requesterId]);

    if (result.rows.length === 0) {
        throw new Error('Swap request not found, does not belong to you, or is no longer pending');
    }

    return {
        success: true,
        message: 'Swap request cancelled successfully'
    };
};

/**
 * Delete a completed swap request (approved, rejected, or cancelled)
 * @param {string} swapRequestId - Swap request UUID
 * @param {string} studentId - Student UUID (requester or target)
 * @returns {Promise<Object>} - Deletion result
 */
const deleteSwapRequest = async (swapRequestId, studentId) => {
    const result = await query(`
        DELETE FROM swap_requests
        WHERE id = $1 
            AND (requester_id = $2 OR target_id = $2)
            AND status IN ('approved', 'rejected', 'cancelled')
        RETURNING *
    `, [swapRequestId, studentId]);

    if (result.rows.length === 0) {
        throw new Error('Swap request not found, does not belong to you, or is still pending');
    }

    return {
        success: true,
        message: 'Swap request deleted successfully'
    };
};

module.exports = {
    createSwapRequest,
    respondToSwapRequest,
    approveSwapRequest,
    getSwapRequests,
    getSwapRequestsForLecturer,
    cancelSwapRequest,
    deleteSwapRequest
};
