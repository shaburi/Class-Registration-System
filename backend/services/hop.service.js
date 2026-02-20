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
 * Delete subject — programme-scoped
 * If the subject is shared across programmes, only unlink from this HOP's programme structure.
 * If the subject belongs exclusively to this HOP's programme, hard-delete it.
 * @param {string} subjectId - UUID of the subject
 * @param {string} hopProgramme - The HOP's assigned programme (e.g. 'CT206')
 */
const deleteSubject = async (subjectId, hopProgramme) => {
    // Get the subject info
    const subjectResult = await query('SELECT * FROM subjects WHERE id = $1', [subjectId]);
    if (subjectResult.rows.length === 0) {
        throw new Error('Subject not found');
    }
    const subject = subjectResult.rows[0];

    // Check how many programme structures reference this subject
    const structureLinks = await query(
        `SELECT ps.programme FROM program_structure_courses psc
         JOIN program_structures ps ON psc.structure_id = ps.id
         WHERE psc.subject_id = $1`,
        [subjectId]
    );
    const linkedProgrammes = [...new Set(structureLinks.rows.map(r => r.programme))];

    // Is this subject shared with other programmes?
    const isShared = linkedProgrammes.length > 1 ||
        (linkedProgrammes.length === 1 && subject.programme !== hopProgramme && linkedProgrammes[0] !== hopProgramme);

    if (isShared && hopProgramme) {
        // Only remove this HOP's programme structure link, don't delete the actual subject
        const structureIds = await query(
            'SELECT id FROM program_structures WHERE programme = $1',
            [hopProgramme]
        );
        if (structureIds.rows.length > 0) {
            const ids = structureIds.rows.map(r => r.id);
            await query(
                'DELETE FROM program_structure_courses WHERE subject_id = $1 AND structure_id = ANY($2)',
                [subjectId, ids]
            );
        }
        return { success: true, message: `Subject unlinked from ${hopProgramme} (still used by other programmes)` };
    }

    // Subject is exclusive to this programme — safe to hard delete
    // Check if subject has sections first
    const sectionsCheck = await query(
        'SELECT COUNT(*) as count FROM sections WHERE subject_id = $1',
        [subjectId]
    );

    if (parseInt(sectionsCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete subject with existing sections. Delete all sections first.');
    }

    // Also remove any programme structure links
    await query('DELETE FROM program_structure_courses WHERE subject_id = $1', [subjectId]);

    const result = await query(`
        DELETE FROM subjects
        WHERE id = $1
        RETURNING *
    `, [subjectId]);

    return { success: true, message: 'Subject deleted successfully' };
};

// ============================================================================
// SECTION MANAGEMENT
// ============================================================================

/**
 * Create a new section
 * Also creates programme_section_links for all programmes that have this subject
 */
const createSection = async (subjectId, sectionNumber, capacity, day, startTime, endTime, room, building, lecturerId, hopProgramme) => {
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

    const newSection = result.rows[0];

    // Auto-link to all programmes that have this subject (by ID, code, or structure)
    const programmes = await query(`
        SELECT DISTINCT prog FROM (
            SELECT sub.programme AS prog FROM subjects sub WHERE sub.id = $1
            UNION
            SELECT sub2.programme AS prog FROM subjects sub2
            WHERE sub2.code = (SELECT code FROM subjects WHERE id = $1)
            UNION
            SELECT ps.programme AS prog FROM program_structure_courses psc
            JOIN program_structures ps ON psc.structure_id = ps.id
            WHERE psc.subject_id = $1
        ) all_progs
    `, [subjectId]);

    // Always include the creating HOP's programme
    const allProgrammes = new Set(programmes.rows.map(r => r.prog));
    if (hopProgramme) allProgrammes.add(hopProgramme);

    for (const prog of allProgrammes) {
        await query(`
            INSERT INTO programme_section_links (programme, section_id)
            VALUES ($1, $2)
            ON CONFLICT (programme, section_id) DO NOTHING
        `, [prog, newSection.id]);
    }

    return newSection;
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
 * Delete section — programme-scoped via links
 * Removes the link for this HOP's programme.
 * If no programmes remain linked, hard-deletes the section.
 */
const deleteSection = async (sectionId, hopProgramme) => {
    // Remove this programme's link
    if (hopProgramme) {
        await query(
            'DELETE FROM programme_section_links WHERE section_id = $1 AND programme = $2',
            [sectionId, hopProgramme]
        );
    }

    // Check if any other programmes still link to this section
    const remainingLinks = await query(
        'SELECT COUNT(*) as count FROM programme_section_links WHERE section_id = $1',
        [sectionId]
    );

    if (parseInt(remainingLinks.rows[0].count) === 0) {
        // No programmes link to this section anymore — safe to hard delete
        await query('DELETE FROM registrations WHERE section_id = $1', [sectionId]);
        await query('DELETE FROM sections WHERE id = $1', [sectionId]);
        return { success: true, message: 'Section deleted (no programmes were using it)' };
    }

    return { success: true, message: `Section unlinked from ${hopProgramme} (still visible to other programmes)` };
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
 * @param {Object} filters
 * @param {string} filters.semester - Filter by semester
 * @param {string} filters.programme - Filter by programme (from query params)
 * @param {string} filters.hopProgramme - HOP's assigned programme (for isolation)
 * @param {boolean} filters.isActive - Filter by active status
 */
const getAllSubjects = async (filters = {}) => {
    const { semester, programme, isActive, hopProgramme } = filters;
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

    // HOP programme isolation: only show subjects belonging to this HOP's programme
    // OR subjects whose code also appears in this HOP's programme (shared subjects)
    if (hopProgramme) {
        queryText += ` AND (
            programme = $${paramCount}
            OR code IN (
                SELECT DISTINCT sub2.code FROM subjects sub2
                WHERE sub2.programme = $${paramCount}
            )
            OR code IN (
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
 * @param {Object} filters
 * @param {string} filters.hopProgramme - HOP's assigned programme (for isolation)
 */
const getAllSections = async (filters = {}) => {
    const { subjectId, lecturerId, isActive, semester, hopProgramme } = filters;

    let queryText = `
        SELECT s.*, sub.code as subject_code, sub.name as subject_name, sub.semester, sub.programme as subject_programme, u.lecturer_name
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

    // HOP programme isolation: only show sections linked to this HOP's programme
    if (hopProgramme) {
        queryText += ` AND s.id IN (
            SELECT psl.section_id FROM programme_section_links psl
            WHERE psl.programme = $${paramCount}
        )`;
        params.push(hopProgramme);
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
 * Delete all sections — programme-scoped via links
 * Removes ALL programme_section_links for this HOP's programme.
 * Sections themselves stay alive for other programmes.
 * If a section has no remaining links, it gets hard-deleted.
 * @param {string} hopProgramme - The HOP's assigned programme
 */
const deleteAllSections = async (hopProgramme) => {
    if (!hopProgramme) {
        throw new Error('Programme is required for scoped deletion');
    }

    // Get all section IDs linked to this programme
    const linkedSections = await query(
        'SELECT section_id FROM programme_section_links WHERE programme = $1',
        [hopProgramme]
    );

    if (linkedSections.rows.length === 0) {
        return { unlinkedCount: 0, deletedOrphans: 0 };
    }

    // Remove all links for this programme
    await query(
        'DELETE FROM programme_section_links WHERE programme = $1',
        [hopProgramme]
    );
    const unlinkedCount = linkedSections.rows.length;

    // Clean up orphaned sections (no programme links remaining)
    let deletedOrphans = 0;
    for (const row of linkedSections.rows) {
        const remaining = await query(
            'SELECT COUNT(*) as count FROM programme_section_links WHERE section_id = $1',
            [row.section_id]
        );
        if (parseInt(remaining.rows[0].count) === 0) {
            // No programmes link to this section — hard delete
            await query('DELETE FROM registrations WHERE section_id = $1', [row.section_id]);
            await query('DELETE FROM sections WHERE id = $1', [row.section_id]);
            deletedOrphans++;
        }
    }

    return { unlinkedCount, deletedOrphans };
};

/**
 * Delete all subjects — programme-scoped
 * Only hard-deletes subjects exclusive to this HOP's programme.
 * Shared subjects are unlinked from the programme structure.
 * @param {string} hopProgramme - The HOP's assigned programme
 */
const deleteAllSubjects = async (hopProgramme) => {
    if (!hopProgramme) {
        throw new Error('Programme is required for scoped deletion');
    }

    // Get all subjects visible to this HOP
    const visibleSubjects = await query(`
        SELECT DISTINCT s.id, s.code, s.programme FROM subjects s
        WHERE s.programme = $1
           OR s.code IN (
               SELECT DISTINCT sub2.code FROM subjects sub2 WHERE sub2.programme = $1
           )
           OR s.id IN (
               SELECT psc.subject_id FROM program_structure_courses psc
               JOIN program_structures ps ON psc.structure_id = ps.id
               WHERE ps.programme = $1
           )
    `, [hopProgramme]);

    let deletedCount = 0;
    let unlinkedCount = 0;

    for (const subject of visibleSubjects.rows) {
        // Check if this subject is used by other programme structures
        const otherLinks = await query(`
            SELECT DISTINCT ps.programme FROM program_structure_courses psc
            JOIN program_structures ps ON psc.structure_id = ps.id
            WHERE psc.subject_id = $1 AND ps.programme != $2
        `, [subject.id, hopProgramme]);

        if (otherLinks.rows.length > 0) {
            // Shared — only unlink from this HOP's programme structure
            const structureIds = await query('SELECT id FROM program_structures WHERE programme = $1', [hopProgramme]);
            if (structureIds.rows.length > 0) {
                await query(
                    'DELETE FROM program_structure_courses WHERE subject_id = $1 AND structure_id = ANY($2)',
                    [subject.id, structureIds.rows.map(r => r.id)]
                );
            }
            unlinkedCount++;
        } else {
            // Exclusive — hard delete (registrations -> sections -> subject)
            await query('DELETE FROM registrations WHERE section_id IN (SELECT id FROM sections WHERE subject_id = $1)', [subject.id]);
            await query('DELETE FROM sections WHERE subject_id = $1', [subject.id]);
            await query('DELETE FROM program_structure_courses WHERE subject_id = $1', [subject.id]);
            await query('DELETE FROM subjects WHERE id = $1', [subject.id]);
            deletedCount++;
        }
    }

    return { deletedCount, unlinkedCount };
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
