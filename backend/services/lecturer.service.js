const { query } = require('../database/connection');

/**
 * Get all sections assigned to a lecturer
 * @param {string} lecturerId - Lecturer's database UUID
 * @returns {Promise<Array>} - List of sections with details
 */
const getLecturerSections = async (lecturerId) => {
    const result = await query(`
        SELECT 
            s.id,
            s.section_number,
            s.day,
            s.start_time,
            s.end_time,
            s.room,
            s.building,
            s.capacity,
            s.enrolled_count,
            sub.id as subject_id,
            sub.code as subject_code,
            sub.name as subject_name,
            sub.credit_hours
        FROM sections s
        JOIN subjects sub ON s.subject_id = sub.id
        WHERE s.lecturer_id = $1 AND s.is_active = true
        ORDER BY s.day, s.start_time
    `, [lecturerId]);

    return result.rows;
};

/**
 * Get all students in a section (with verification that lecturer owns the section)
 * @param {string} sectionId - Section UUID
 * @param {string} lecturerId - Lecturer's database UUID
 * @returns {Promise<Array>} - List of students
 */
const getSectionStudents = async (sectionId, lecturerId) => {
    // First verify lecturer owns this section
    const sectionCheck = await query(
        'SELECT id FROM sections WHERE id = $1 AND lecturer_id = $2',
        [sectionId, lecturerId]
    );

    if (sectionCheck.rows.length === 0) {
        throw new Error('Section not found or you do not have permission to view it');
    }

    // Get students
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
 * Get overall statistics for a lecturer
 * @param {string} lecturerId - Lecturer's database UUID
 * @returns {Promise<Object>} - Statistics object
 */
const getLecturerStats = async (lecturerId) => {
    // Get total sections
    const sectionsResult = await query(
        'SELECT COUNT(*) as total FROM sections WHERE lecturer_id = $1 AND is_active = true',
        [lecturerId]
    );

    // Get total students across all sections
    const studentsResult = await query(`
        SELECT COUNT(DISTINCT r.student_id) as total
        FROM registrations r
        JOIN sections s ON r.section_id = s.id
        WHERE s.lecturer_id = $1 AND s.is_active = true
    `, [lecturerId]);

    // Get total credit hours
    const creditHoursResult = await query(`
        SELECT SUM(DISTINCT sub.credit_hours) as total
        FROM sections s
        JOIN subjects sub ON s.subject_id = sub.id
        WHERE s.lecturer_id = $1 AND s.is_active = true
    `, [lecturerId]);

    return {
        totalSections: parseInt(sectionsResult.rows[0].total) || 0,
        totalStudents: parseInt(studentsResult.rows[0].total) || 0,
        totalCreditHours: parseInt(creditHoursResult.rows[0].total) || 0
    };
};

module.exports = {
    getLecturerSections,
    getSectionStudents,
    getLecturerStats
};
