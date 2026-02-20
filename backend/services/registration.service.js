const { query, transaction } = require('../database/connection');
const Joi = require('joi');
const emailService = require('./email.service');
const programStructureService = require('./programStructure.service');

/**
 * Registration Service
 * Handles section registration with capacity enforcement and schedule clash detection
 */

/**
 * Register student for a section
 * @param {string} studentId - Student UUID
 * @param {string} sectionId - Section UUID
 * @param {string} registrationType - 'normal', 'manual', or 'swap'
 * @param {string} approvedBy - UUID of approver (for manual registrations)
 * @returns {Promise<Object>} - Registration result
 */
const registerForSection = async (studentId, sectionId, registrationType = 'normal', approvedBy = null) => {
    // Validate inputs
    const schema = Joi.object({
        studentId: Joi.string().uuid().required(),
        sectionId: Joi.string().uuid().required(),
        registrationType: Joi.string().valid('normal', 'manual', 'swap').default('normal'),
        approvedBy: Joi.string().uuid().allow(null)
    });

    const { error } = schema.validate({ studentId, sectionId, registrationType, approvedBy });
    if (error) {
        throw new Error(`Validation error: ${error.message}`);
    }

    return await transaction(async (client) => {

        // 1. Check if student is valid
        const studentCheck = await client.query(
            'SELECT id, semester, programme, student_id, student_name, email FROM users WHERE id = $1 AND role = $2 AND is_active = true',
            [studentId, 'student']
        );

        if (studentCheck.rows.length === 0) {
            throw new Error('Student not found or inactive');
        }

        const student = studentCheck.rows[0];

        // 2. Get section details with subject info
        const sectionCheck = await client.query(`
            SELECT 
                s.id, s.capacity, s.enrolled_count, s.day, s.start_time, s.end_time,
                s.is_active, s.section_number, sub.code, sub.name, sub.semester, sub.programme
            FROM sections s
            JOIN subjects sub ON s.subject_id = sub.id
            WHERE s.id = $1 AND s.is_active = true
        `, [sectionId]);

        if (sectionCheck.rows.length === 0) {
            throw new Error('Section not found or inactive');
        }

        const section = sectionCheck.rows[0];

        // 3. Check if subject is for student's semester or below (students can take repeat subjects)
        if (section.semester > student.semester) {
            throw new Error(`Cannot register for section. Subject is for semester ${section.semester}, but student is in semester ${student.semester}`);
        }

        // 3b. Check if subject belongs to student's programme (allow shared subjects)
        if (section.programme !== student.programme) {
            // Check if this subject is shared with the student's programme
            const sharedCheck = await client.query(`
                SELECT 1 FROM subjects WHERE code = $1 AND programme = $2
                UNION
                SELECT 1 FROM program_structure_courses psc
                JOIN program_structures ps ON psc.structure_id = ps.id
                WHERE psc.subject_id = (SELECT subject_id FROM sections WHERE id = $3)
                  AND ps.programme = $2
                LIMIT 1
            `, [section.code, student.programme, sectionId]);

            if (sharedCheck.rows.length === 0) {
                throw new Error(`Cannot register for section. Subject is for ${section.programme} programme`);
            }
        }

        // 4. Check if already registered for ANY section of this subject
        const existingSubjectRegistration = await client.query(`
            SELECT r.id, s.section_number
            FROM registrations r
            JOIN sections s ON r.section_id = s.id
            WHERE r.student_id = $1 
              AND s.subject_id = (SELECT subject_id FROM sections WHERE id = $2)
        `, [studentId, sectionId]);

        if (existingSubjectRegistration.rows.length > 0) {
            const existingSection = existingSubjectRegistration.rows[0].section_number;
            throw new Error(`Already registered for ${section.code} (Section ${existingSection}). Cannot register for multiple sections of the same subject.`);
        }

        // 5. Check if already registered for same subject (different section)
        const sameSubjectCheck = await client.query(`
            SELECT r.id, s.section_number
            FROM registrations r
            JOIN sections s ON r.section_id = s.id
            JOIN subjects sub ON s.subject_id = sub.id
            WHERE r.student_id = $1 AND sub.code = $2
        `, [studentId, section.code]);

        if (sameSubjectCheck.rows.length > 0) {
            throw new Error(`Student is already registered for ${section.code} (Section ${sameSubjectCheck.rows[0].section_number})`);
        }

        // 6. Check capacity (unless manual registration)
        if (registrationType !== 'manual' && section.enrolled_count >= section.capacity) {
            throw new Error('Section is at full capacity');
        }

        // 7. Check for schedule clashes using section_schedules table
        const hasClash = await detectScheduleClashBySectionId(client, studentId, sectionId);

        if (hasClash.hasClash) {
            throw new Error(`Schedule clash detected: ${hasClash.details}`);
        }

        // 8. Insert registration
        const registrationResult = await client.query(`
            INSERT INTO registrations (student_id, section_id, registration_type, approved_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [studentId, sectionId, registrationType, approvedBy]);

        // Trigger automatically updates enrolled_count

        // 9. Send confirmation email (async, don't wait)
        emailService.sendEmail(
            student.email,
            'registrationConfirmed',
            [student.student_name || 'Student', `${section.code} - ${section.name}`, section.section_number]
        ).catch(err => console.error('[EMAIL] Failed to send registration email:', err));

        return {
            success: true,
            message: 'Successfully registered for section',
            registration: registrationResult.rows[0]
        };
    });
};

/**
 * Unregister student from a section
 * @param {string} studentId - Student UUID
 * @param {string} registrationId - Registration UUID
 * @returns {Promise<Object>} - Unregistration result
 */
const unregisterFromSection = async (studentId, registrationId) => {
    return await transaction(async (client) => {

        // Check if registration exists and belongs to student
        const registrationCheck = await client.query(
            'SELECT * FROM registrations WHERE id = $1 AND student_id = $2',
            [registrationId, studentId]
        );

        if (registrationCheck.rows.length === 0) {
            throw new Error('Registration not found or does not belong to student');
        }

        // Delete registration
        await client.query('DELETE FROM registrations WHERE id = $1', [registrationId]);

        // Trigger automatically updates enrolled_count

        return {
            success: true,
            message: 'Successfully unregistered from section'
        };
    });
};

/**
 * Get student's current registrations
 * @param {string} studentId - Student UUID
 * @returns {Promise<Array>} - List of registrations with section details
 */
const getStudentRegistrations = async (studentId) => {
    const result = await query(`
        SELECT 
            r.id as registration_id,
            r.registered_at,
            r.registration_type,
            s.id as section_id,
            s.subject_id,
            sub.code as subject_code,
            sub.name as subject_name,
            sub.credit_hours,
            s.section_number,
            s.day,
            s.start_time,
            s.end_time,
            s.room,
            s.building,
            s.capacity,
            s.enrolled_count,
            u.lecturer_name
        FROM registrations r
        JOIN sections s ON r.section_id = s.id
        JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN users u ON s.lecturer_id = u.id
        WHERE r.student_id = $1
        ORDER BY sub.code, s.section_number
    `, [studentId]);

    const registrations = result.rows;

    // Fetch schedules from section_schedules table
    if (registrations.length > 0) {
        const sectionIds = [...new Set(registrations.map(r => r.section_id))];
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

        // Attach schedules and set first schedule as default day/time
        for (const reg of registrations) {
            reg.schedules = schedulesBySection[reg.section_id] || [];
            if (reg.schedules.length > 0) {
                const firstSchedule = reg.schedules[0];
                reg.day = firstSchedule.day;
                reg.start_time = firstSchedule.start_time;
                reg.end_time = firstSchedule.end_time;
                reg.room = firstSchedule.room || reg.room;
            }
        }
    }

    return registrations;
};

/**
 * Get available sections for a student's semester
 * @param {number} semester - Student's semester
 * @param {string} programme - Student's programme
 * @returns {Promise<Array>} - List of available sections
 */
const getAvailableSections = async (semester, programme) => {
    const result = await query(`
        SELECT 
            sub.id as subject_id,
            sub.code,
            sub.name,
            sub.credit_hours,
            sub.description,
            sub.prerequisites,
            sub.semester as subject_semester,
            s.id as section_id,
            s.section_number,
            s.capacity,
            s.enrolled_count,
            (s.capacity - s.enrolled_count) as available_seats,
            s.day,
            s.start_time,
            s.end_time,
            s.room,
            s.building,
            u.lecturer_name
        FROM subjects sub
        JOIN sections s ON sub.id = s.subject_id
        LEFT JOIN users u ON s.lecturer_id = u.id
        WHERE sub.semester = $1 
            AND sub.programme = $2 
            AND sub.is_active = true 
            AND s.is_active = true
        ORDER BY sub.semester, sub.code, s.section_number
    `, [semester, programme]);

    const sections = result.rows;

    // Fetch schedules from section_schedules table
    if (sections.length > 0) {
        const sectionIds = [...new Set(sections.map(s => s.section_id))];
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

        // Attach schedules to each section and set first schedule as default day/time
        for (const section of sections) {
            section.schedules = schedulesBySection[section.section_id] || [];

            // For backward compatibility - use first schedule for day/start_time/end_time
            if (section.schedules.length > 0) {
                const firstSchedule = section.schedules[0];
                section.day = firstSchedule.day;
                section.start_time = firstSchedule.start_time;
                section.end_time = firstSchedule.end_time;
                section.room = firstSchedule.room || section.room;
            }
        }
    }

    return sections;
};

/**
 * Get available sections using intake-based program structure
 * Falls back to standard semester-based filtering if no structure exists
 * @param {number} semester - Student's current semester (or null if getAllSemesters=true)
 * @param {string} programme - Student's programme
 * @param {string} intakeSession - Student's intake session (e.g., '0825')
 * @param {boolean} getAllSemesters - If true, fetch courses from all semesters
 * @returns {Promise<Object>} - List of available sections with source info
 */
const getAvailableSectionsWithIntake = async (semester, programme, intakeSession, getAllSemesters = false) => {
    // If no intake session, fall back to standard method
    if (!intakeSession) {
        const sections = await getAvailableSections(semester, programme);
        return { source: 'default', sections };
    }

    // Try to get courses from program structure
    const structureResult = await programStructureService.getCoursesForStudentSemester(
        programme,
        intakeSession,
        semester,
        getAllSemesters
    );

    // If using default (no structure found), use standard method
    if (structureResult.source === 'default') {
        const sections = await getAvailableSections(semester, programme);
        return { source: 'default', sections };
    }

    // Get subject IDs from the program structure
    const structureSubjectIds = structureResult.courses.map(c => c.id);

    if (structureSubjectIds.length === 0) {
        return {
            source: 'structure',
            structureId: structureResult.structureId,
            intakeType: structureResult.intakeType,
            sections: []
        };
    }

    // Fetch sections for these specific subjects
    const result = await query(`
        SELECT 
            sub.id as subject_id,
            sub.code,
            sub.name,
            sub.credit_hours,
            sub.description,
            sub.prerequisites,
            $2 as subject_semester,
            s.id as section_id,
            s.section_number,
            s.capacity,
            s.enrolled_count,
            (s.capacity - s.enrolled_count) as available_seats,
            s.day,
            s.start_time,
            s.end_time,
            s.room,
            s.building,
            u.lecturer_name
        FROM subjects sub
        JOIN sections s ON sub.id = s.subject_id
        LEFT JOIN users u ON s.lecturer_id = u.id
        WHERE sub.id = ANY($1)
            AND sub.is_active = true 
            AND s.is_active = true
        ORDER BY sub.code, s.section_number
    `, [structureSubjectIds, semester]);

    const sections = result.rows;

    // Fetch schedules from section_schedules table
    if (sections.length > 0) {
        const sectionIds = [...new Set(sections.map(s => s.section_id))];
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
            section.schedules = schedulesBySection[section.section_id] || [];
            if (section.schedules.length > 0) {
                const firstSchedule = section.schedules[0];
                section.day = firstSchedule.day;
                section.start_time = firstSchedule.start_time;
                section.end_time = firstSchedule.end_time;
                section.room = firstSchedule.room || section.room;
            }
        }
    }

    return {
        source: 'structure',
        structureId: structureResult.structureId,
        structureName: structureResult.structureName,
        intakeType: structureResult.intakeType,
        sections
    };
};

/**
 * Check real-time capacity for a section
 * @param {string} sectionId - Section UUID
 * @returns {Promise<Object>} - Capacity information
 */
const checkCapacity = async (sectionId) => {
    const result = await query(`
        SELECT 
            id,
            capacity,
            enrolled_count,
            (capacity - enrolled_count) as available_seats,
            CASE WHEN enrolled_count >= capacity THEN true ELSE false END as is_full
        FROM sections
        WHERE id = $1
    `, [sectionId]);

    if (result.rows.length === 0) {
        throw new Error('Section not found');
    }

    return result.rows[0];
};

/**
 * Detect schedule clash for a student by checking section_schedules
 * @param {Object} client - Database client (for transactions)
 * @param {string} studentId - Student UUID
 * @param {string} newSectionId - Section UUID to register for
 * @returns {Promise<Object>} - Clash detection result
 */
const detectScheduleClashBySectionId = async (client, studentId, newSectionId) => {
    // Get ALL schedules for the new section being registered
    const newSectionSchedules = await client.query(`
        SELECT ss.day, ss.start_time, ss.end_time, sub.code, sub.name, sec.section_number
        FROM section_schedules ss
        JOIN sections sec ON ss.section_id = sec.id
        JOIN subjects sub ON sec.subject_id = sub.id
        WHERE ss.section_id = $1
    `, [newSectionId]);

    // If no schedules found in section_schedules, fall back to sections table
    let schedulesToCheck = newSectionSchedules.rows;

    if (schedulesToCheck.length === 0) {
        const fallback = await client.query(`
            SELECT s.day, s.start_time, s.end_time, sub.code, sub.name, s.section_number
            FROM sections s
            JOIN subjects sub ON s.subject_id = sub.id
            WHERE s.id = $1 AND s.day IS NOT NULL AND s.start_time IS NOT NULL
        `, [newSectionId]);
        schedulesToCheck = fallback.rows;
    }

    // For each schedule of the new section, check for clashes with existing registrations
    for (const newSchedule of schedulesToCheck) {
        const result = await client.query(`
            SELECT 
                sub.code,
                sub.name,
                s.section_number,
                COALESCE(ss.day, s.day) as day,
                COALESCE(ss.start_time, s.start_time) as start_time,
                COALESCE(ss.end_time, s.end_time) as end_time
            FROM registrations r
            JOIN sections s ON r.section_id = s.id
            JOIN subjects sub ON s.subject_id = sub.id
            LEFT JOIN section_schedules ss ON ss.section_id = s.id
            WHERE r.student_id = $1
                AND COALESCE(ss.day, s.day) = $2
                AND (
                    -- New section starts during existing section
                    (COALESCE(ss.start_time, s.start_time) < $4 AND COALESCE(ss.end_time, s.end_time) > $3) OR
                    -- Existing section starts during new section
                    ($3 < COALESCE(ss.end_time, s.end_time) AND $4 > COALESCE(ss.start_time, s.start_time))
                )
        `, [studentId, newSchedule.day, newSchedule.start_time, newSchedule.end_time]);

        if (result.rows.length > 0) {
            const clash = result.rows[0];
            return {
                hasClash: true,
                details: `${newSchedule.code} (${newSchedule.day} ${newSchedule.start_time}-${newSchedule.end_time}) clashes with ${clash.code} ${clash.name} (Section ${clash.section_number}) on ${clash.day} ${clash.start_time}-${clash.end_time}`
            };
        }
    }

    return { hasClash: false };
};

/**
 * Detect schedule clash for a student (legacy - kept for backwards compatibility)
 * @param {Object} client - Database client (for transactions)
 * @param {string} studentId - Student UUID
 * @param {string} day - Day of week
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {Promise<Object>} - Clash detection result
 */
const detectScheduleClash = async (client, studentId, day, startTime, endTime) => {
    if (!day || !startTime || !endTime) {
        return { hasClash: false }; // Skip if no schedule data
    }

    const result = await client.query(`
        SELECT 
            sub.code,
            sub.name,
            s.section_number,
            COALESCE(ss.day, s.day) as day,
            COALESCE(ss.start_time, s.start_time) as start_time,
            COALESCE(ss.end_time, s.end_time) as end_time
        FROM registrations r
        JOIN sections s ON r.section_id = s.id
        JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN section_schedules ss ON ss.section_id = s.id
        WHERE r.student_id = $1
            AND COALESCE(ss.day, s.day) = $2
            AND (
                (COALESCE(ss.start_time, s.start_time) < $4 AND COALESCE(ss.end_time, s.end_time) > $3) OR
                ($3 < COALESCE(ss.end_time, s.end_time) AND $4 > COALESCE(ss.start_time, s.start_time))
            )
    `, [studentId, day, startTime, endTime]);

    if (result.rows.length > 0) {
        const clash = result.rows[0];
        return {
            hasClash: true,
            details: `Clashes with ${clash.code} ${clash.name} (Section ${clash.section_number}) on ${clash.day} ${clash.start_time}-${clash.end_time}`
        };
    }

    return { hasClash: false };
};

module.exports = {
    registerForSection,
    unregisterFromSection,
    getStudentRegistrations,
    getAvailableSections,
    getAvailableSectionsWithIntake,
    checkCapacity,
    detectScheduleClash,
    detectScheduleClashBySectionId
};
