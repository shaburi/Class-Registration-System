/**
 * Program Structure Service
 * Manages intake-based program structures and course mappings
 */


const { query } = require('../database/connection');

/**
 * Get intake type from session code (e.g., '0825' -> 'august')
 */
function getIntakeTypeFromSession(intakeSession) {
    if (!intakeSession || intakeSession.length < 4) return null;
    const month = intakeSession.substring(0, 2);
    switch (month) {
        case '05': return 'may';
        case '08': return 'august';
        case '12': return 'december';
        default: return null;
    }
}

/**
 * Get the active structure for a student based on their programme and intake
 */
async function getStructureForStudent(programme, intakeSession) {
    const intakeType = getIntakeTypeFromSession(intakeSession);
    if (!intakeType) return null;

    // Parse year from intake session (e.g., '0825' -> 2025)
    const yearCode = intakeSession.substring(2, 4);
    const fullYear = 2000 + parseInt(yearCode);

    // Find the most recent active structure that's effective for this student
    const result = await query(`
        SELECT id, name, programme, intake_type, effective_year, is_active
        FROM program_structures
        WHERE programme = $1 
          AND intake_type = $2 
          AND is_active = true
          AND effective_year <= $3
        ORDER BY effective_year DESC
        LIMIT 1
    `, [programme, intakeType, fullYear]);

    return result.rows[0] || null;
}

/**
 * Get courses for a student's specific semester based on their intake
 * @param {string} programme - Student's programme
 * @param {string} intakeSession - Student's intake session (e.g., '0825')
 * @param {number} semester - Semester number (ignored if getAllSemesters=true)
 * @param {boolean} getAllSemesters - If true, fetch courses from all semesters
 */
async function getCoursesForStudentSemester(programme, intakeSession, semester, getAllSemesters = false) {
    const intakeType = getIntakeTypeFromSession(intakeSession);
    if (!intakeType) {
        // Fallback to standard subject table if no intake session set
        let result;
        if (getAllSemesters) {
            result = await query(`
                SELECT id, code, name, credit_hours, semester
                FROM subjects 
                WHERE programme = $1 AND is_active = true
                ORDER BY semester, code
            `, [programme]);
        } else {
            result = await query(`
                SELECT id, code, name, credit_hours, semester
                FROM subjects 
                WHERE programme = $1 AND semester = $2 AND is_active = true
                ORDER BY code
            `, [programme, semester]);
        }
        return { source: 'default', courses: result.rows };
    }

    // Find the active structure for this intake
    const structure = await getStructureForStudent(programme, intakeSession);

    if (!structure) {
        // No structure defined, fallback to default
        let result;
        if (getAllSemesters) {
            result = await query(`
                SELECT id, code, name, credit_hours, semester
                FROM subjects 
                WHERE programme = $1 AND is_active = true
                ORDER BY semester, code
            `, [programme]);
        } else {
            result = await query(`
                SELECT id, code, name, credit_hours, semester
                FROM subjects 
                WHERE programme = $1 AND semester = $2 AND is_active = true
                ORDER BY code
            `, [programme, semester]);
        }
        return { source: 'default', courses: result.rows };
    }

    // Get courses from program structure
    let result;
    if (getAllSemesters) {
        result = await query(`
            SELECT s.id, s.code, s.name, s.credit_hours, psc.semester, psc.status, psc.prerequisite_codes
            FROM program_structure_courses psc
            JOIN subjects s ON psc.subject_id = s.id
            WHERE psc.structure_id = $1
            ORDER BY psc.semester, s.code
        `, [structure.id]);
    } else {
        result = await query(`
            SELECT s.id, s.code, s.name, s.credit_hours, psc.semester, psc.status, psc.prerequisite_codes
            FROM program_structure_courses psc
            JOIN subjects s ON psc.subject_id = s.id
            WHERE psc.structure_id = $1 AND psc.semester = $2
            ORDER BY s.code
        `, [structure.id, semester]);
    }

    return {
        source: 'structure',
        structureId: structure.id,
        structureName: structure.name,
        intakeType: structure.intake_type,
        courses: result.rows
    };
}

/**
 * Get all structures for a programme
 */
async function getStructuresForProgramme(programme) {
    const result = await query(`
        SELECT ps.*, 
               (SELECT COUNT(*) FROM program_structure_courses WHERE structure_id = ps.id) as total_courses
        FROM program_structures ps
        WHERE programme = $1
        ORDER BY effective_year DESC, intake_type
    `, [programme]);
    return result.rows;
}

/**
 * Get a specific structure with its courses
 */
async function getStructureWithCourses(structureId) {
    const structureResult = await query(`
        SELECT * FROM program_structures WHERE id = $1
    `, [structureId]);

    if (structureResult.rows.length === 0) return null;

    const coursesResult = await query(`
        SELECT psc.*, s.code AS subject_code, s.name AS subject_name, s.credit_hours
        FROM program_structure_courses psc
        JOIN subjects s ON psc.subject_id = s.id
        WHERE psc.structure_id = $1
        ORDER BY psc.semester, s.code
    `, [structureId]);

    return {
        ...structureResult.rows[0],
        courses: coursesResult.rows
    };
}

/**
 * Create a new program structure
 */
async function createStructure(programme, intakeType, effectiveYear, name, createdBy) {
    const result = await query(`
        INSERT INTO program_structures (programme, intake_type, effective_year, name, created_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (programme, intake_type, effective_year) 
        DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `, [programme, intakeType, effectiveYear, name || `${programme} ${intakeType} ${effectiveYear}`, createdBy]);

    return result.rows[0];
}

/**
 * Add or update courses in a structure
 */
async function bulkAddCourses(structureId, courses) {
    const results = { added: 0, updated: 0, errors: [] };

    for (const course of courses) {
        try {
            // Use subject_id if provided, otherwise look up by code
            let subjectId = course.subject_id;
            if (!subjectId && course.code) {
                const subjectResult = await query(
                    'SELECT id FROM subjects WHERE code = $1',
                    [course.code]
                );
                if (subjectResult.rows.length === 0) {
                    results.errors.push({ code: course.code, error: 'Subject not found' });
                    continue;
                }
                subjectId = subjectResult.rows[0].id;
            }
            if (!subjectId) {
                results.errors.push({ code: course.code, error: 'No subject_id or code provided' });
                continue;
            }

            // Upsert course
            const upsertResult = await query(`
                INSERT INTO program_structure_courses (structure_id, subject_id, semester, status, prerequisite_codes)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (structure_id, subject_id)
                DO UPDATE SET semester = $3, status = $4, prerequisite_codes = $5
                RETURNING (xmax = 0) as inserted
            `, [structureId, subjectId, course.semester, course.status || 'Core Computing', course.prerequisite_codes || []]);

            if (upsertResult.rows[0]?.inserted) {
                results.added++;
            } else {
                results.updated++;
            }
        } catch (err) {
            results.errors.push({ code: course.code, error: err.message });
        }
    }

    return results;
}

/**
 * Delete a structure
 */
async function deleteStructure(structureId) {
    await query('DELETE FROM program_structures WHERE id = $1', [structureId]);
}

/**
 * Toggle structure active status
 */
async function toggleStructureActive(structureId, isActive) {
    const result = await query(`
        UPDATE program_structures SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *
    `, [isActive, structureId]);
    return result.rows[0];
}

module.exports = {
    getIntakeTypeFromSession,
    getStructureForStudent,
    getCoursesForStudentSemester,
    getStructuresForProgramme,
    getStructureWithCourses,
    createStructure,
    bulkAddCourses,
    deleteStructure,
    toggleStructureActive
};
