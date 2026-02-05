const { query, transaction } = require('../database/connection');
const Joi = require('joi');

/**
 * HOP Management Service
 * Handles subject, section, and lecturer management (HOP only)
 */

// ============================================================================
// SUBJECT MANAGEMENT
// ============================================================================

/**
 * Create a new subject
 */
const createSubject = async (code, name, creditHours, semester, programme, description, prerequisites, createdBy) => {
    const schema = Joi.object({
        code: Joi.string().required(),
        name: Joi.string().required(),
        creditHours: Joi.number().integer().min(1).required(),
        semester: Joi.number().integer().min(1).max(8).required(),
        programme: Joi.string().required(),
        description: Joi.string().allow('', null),
        prerequisites: Joi.array().items(Joi.string()).default([]),
        createdBy: Joi.string().uuid().required()
    });

    const { error } = schema.validate({ code, name, creditHours, semester, programme, description, prerequisites, createdBy });
    if (error) throw new Error(`Validation error: ${error.message}`);

    const result = await query(`
        INSERT INTO subjects (code, name, credit_hours, semester, programme, description, prerequisites, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `, [code, name, creditHours, semester, programme, description, prerequisites, createdBy]);

    return result.rows[0];
};

/**
 * Update subject
 */
const updateSubject = async (subjectId, updates) => {
    const allowedFields = ['name', 'credit_hours', 'description', 'prerequisites', 'is_active'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = $${paramCount}`);
            values.push(updates[key]);
            paramCount++;
        }
    });

    if (fields.length === 0) {
        throw new Error('No valid fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(subjectId);

    const result = await query(`
        UPDATE subjects SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
    `, values);

    if (result.rows.length === 0) {
        throw new Error('Subject not found');
    }

    return result.rows[0];
};

/**
 * Delete subject (hard delete)
 */
const deleteSubject = async (subjectId) => {
    // Check if subject has sections
    const sectionsCheck = await query(
        'SELECT COUNT(*) as count FROM sections WHERE subject_id = $1',
        [subjectId]
    );

    if (parseInt(sectionsCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete subject with existing sections. Delete all sections first.');
    }

    const result = await query(`
        DELETE FROM subjects
        WHERE id = $1
        RETURNING *
    `, [subjectId]);

    if (result.rows.length === 0) {
        throw new Error('Subject not found');
    }

    return { success: true, message: 'Subject deleted successfully' };
};

// ============================================================================
// SECTION MANAGEMENT
// ============================================================================

/**
 * Create a new section
 */
const createSection = async (subjectId, sectionNumber, capacity, day, startTime, endTime, room, building, lecturerId) => {
    const schema = Joi.object({
        subjectId: Joi.string().uuid().required(),
        sectionNumber: Joi.string().required(),
        capacity: Joi.number().integer().min(1).required(),
        day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
        startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        room: Joi.string().allow('', null),
        building: Joi.string().allow('', null),
        lecturerId: Joi.string().uuid().allow(null)
    });

    const { error } = schema.validate({ subjectId, sectionNumber, capacity, day, startTime, endTime, room, building, lecturerId });
    if (error) throw new Error(`Validation error: ${error.message}`);

    const result = await query(`
        INSERT INTO sections (subject_id, section_number, capacity, day, start_time, end_time, room, building, lecturer_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `, [subjectId, sectionNumber, capacity, day, startTime, endTime, room, building, lecturerId]);

    return result.rows[0];
};

/**
 * Update section
 */
const updateSection = async (sectionId, updates) => {
    const allowedFields = ['section_number', 'capacity', 'day', 'start_time', 'end_time', 'room', 'building', 'lecturer_id', 'is_active'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = $${paramCount}`);
            values.push(updates[key]);
            paramCount++;
        }
    });

    if (fields.length === 0) {
        throw new Error('No valid fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(sectionId);

    const result = await query(`
        UPDATE sections SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
    `, values);

    if (result.rows.length === 0) {
        throw new Error('Section not found');
    }

    return result.rows[0];
};

/**
 * Assign lecturer to section
 */
const assignLecturerToSection = async (sectionId, lecturerId) => {
    // Verify lecturer exists
    const lecturerCheck = await query(
        'SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = true',
        [lecturerId, 'lecturer']
    );

    if (lecturerCheck.rows.length === 0) {
        throw new Error('Lecturer not found or inactive');
    }

    const result = await query(`
        UPDATE sections SET lecturer_id = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
    `, [lecturerId, sectionId]);

    if (result.rows.length === 0) {
        throw new Error('Section not found');
    }

    return result.rows[0];
};

/**
 * Delete section (hard delete)
 * Deletes all registrations first, then deletes the section
 */
const deleteSection = async (sectionId) => {
    // First, delete all registrations for this section
    await query(
        'DELETE FROM registrations WHERE section_id = $1',
        [sectionId]
    );

    // Then delete the section itself
    const result = await query(`
        DELETE FROM sections
        WHERE id = $1
        RETURNING *
    `, [sectionId]);

    if (result.rows.length === 0) {
        throw new Error('Section not found');
    }

    return { success: true, message: 'Section and all registrations deleted successfully' };
};

// ============================================================================
// REGISTRATION OVERRIDE
// ============================================================================

/**
 * Override registration (force register student)
 */
const overrideRegistration = async (studentId, sectionId, hopId) => {
    const { registerForSection } = require('./registration.service');

    try {
        const result = await registerForSection(studentId, sectionId, 'manual', hopId);
        return result;
    } catch (error) {
        // Force registration even if there are errors (capacity, clash)
        return await transaction(async (client) => {
            await client.query(`
                INSERT INTO registrations (student_id, section_id, registration_type, approved_by)
                VALUES ($1, $2, 'manual', $3)
            `, [studentId, sectionId, hopId]);

            return {
                success: true,
                message: 'Registration overridden successfully (forced)',
                warning: error.message
            };
        });
    }
};

/**
 * Get all subjects
 */
const getAllSubjects = async (filters = {}) => {
    const { semester, programme, isActive } = filters;
    let queryText = 'SELECT * FROM subjects WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (semester) {
        queryText += ` AND semester = $${paramCount}`;
        params.push(semester);
        paramCount++;
    }

    if (programme) {
        queryText += ` AND programme = $${paramCount}`;
        params.push(programme);
        paramCount++;
    }

    if (isActive !== undefined && isActive !== null) {
        queryText += ` AND is_active = $${paramCount}`;
        params.push(isActive);
        paramCount++;
    }

    queryText += ' ORDER BY semester, code';

    const result = await query(queryText, params);
    return result.rows;
};

/**
 * Get all sections with their schedules
 */
const getAllSections = async (filters = {}) => {
    const { subjectId, lecturerId, isActive, semester } = filters;

    let queryText = `
        SELECT s.*, sub.code as subject_code, sub.name as subject_name, sub.semester, u.lecturer_name
        FROM sections s
        JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN users u ON s.lecturer_id = u.id
        WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (subjectId) {
        queryText += ` AND s.subject_id = $${paramCount}`;
        params.push(subjectId);
        paramCount++;
    }

    if (lecturerId) {
        queryText += ` AND s.lecturer_id = $${paramCount}`;
        params.push(lecturerId);
        paramCount++;
    }

    if (isActive !== undefined && isActive !== null) {
        queryText += ` AND s.is_active = $${paramCount}`;
        params.push(isActive);
        paramCount++;
    }

    if (semester) {
        queryText += ` AND sub.semester = $${paramCount}`;
        params.push(parseInt(semester));
        paramCount++;
    }

    queryText += ' ORDER BY sub.code, s.section_number';

    const result = await query(queryText, params);
    const sections = result.rows;

    // Fetch schedules for all sections (from section_schedules table)
    if (sections.length > 0) {
        const sectionIds = sections.map(s => s.id);
        const schedulesResult = await query(
            `SELECT * FROM section_schedules WHERE section_id = ANY($1) ORDER BY section_id, day, start_time`,
            [sectionIds]
        );

        // Group schedules by section_id
        const schedulesBySection = {};
        for (const schedule of schedulesResult.rows) {
            if (!schedulesBySection[schedule.section_id]) {
                schedulesBySection[schedule.section_id] = [];
            }
            schedulesBySection[schedule.section_id].push(schedule);
        }

        // Attach schedules to each section
        for (const section of sections) {
            section.schedules = schedulesBySection[section.id] || [];

            // For backward compatibility, if there's at least one schedule, 
            // populate the legacy day/start_time/end_time/room fields
            if (section.schedules.length > 0) {
                const firstSchedule = section.schedules[0];
                section.day = firstSchedule.day;
                section.start_time = firstSchedule.start_time;
                section.end_time = firstSchedule.end_time;
                section.room = firstSchedule.room;
            }
        }
    }

    return sections;
};

/**
 * Get registered students for a section
 */
const getSectionStudents = async (sectionId) => {
    const result = await query(`
        SELECT 
            u.id,
            u.student_id,
            u.student_name,
            u.email,
            u.semester,
            u.programme,
            r.registered_at,
            r.registration_type
        FROM registrations r
        JOIN users u ON r.student_id = u.id
        WHERE r.section_id = $1
        ORDER BY u.student_name
    `, [sectionId]);

    return result.rows;
};

/**
 * Delete all sections
 */
const deleteAllSections = async () => {
    // First delete all registrations that reference sections
    await query('DELETE FROM registrations WHERE section_id IS NOT NULL');

    // Then delete all sections
    const result = await query('DELETE FROM sections RETURNING id');

    return { deletedCount: result.rowCount };
};

/**
 * Delete all subjects (also deletes all sections and registrations)
 */
const deleteAllSubjects = async () => {
    // First delete all registrations
    await query('DELETE FROM registrations');

    // Then delete all sections
    await query('DELETE FROM sections');

    // Finally delete all subjects
    const result = await query('DELETE FROM subjects RETURNING id');

    return { deletedCount: result.rowCount };
};

module.exports = {
    createSubject,
    updateSubject,
    deleteSubject,
    deleteAllSubjects,
    createSection,
    updateSection,
    assignLecturerToSection,
    deleteSection,
    deleteAllSections,
    overrideRegistration,
    getAllSubjects,
    getAllSections,
    getSectionStudents
};
