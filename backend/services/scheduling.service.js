const { query } = require('../database/connection');
const { stringify } = require('csv-stringify/sync');

/**
 * Scheduling Service
 * Handles timetable viewing and CSV export functionality
 */

/**
 * Get student's personal timetable
 * @param {string} studentId - Student UUID
 * @returns {Promise<Object>} - Timetable organized by day
 */
const getStudentTimetable = async (studentId) => {
    const result = await query(`
        SELECT 
            sub.code,
            sub.name as subject_name,
            sub.credit_hours,
            s.section_number,
            s.day,
            s.start_time,
            s.end_time,
            s.room,
            s.building,
            u.lecturer_name
        FROM registrations r
        JOIN sections s ON r.section_id = s.id
        JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN users u ON s.lecturer_id = u.id
        WHERE r.student_id = $1
        ORDER BY 
            CASE s.day
                WHEN 'monday' THEN 1
                WHEN 'tuesday' THEN 2
                WHEN 'wednesday' THEN 3
                WHEN 'thursday' THEN 4
                WHEN 'friday' THEN 5
                WHEN 'saturday' THEN 6
                WHEN 'sunday' THEN 7
            END,
            s.start_time
    `, [studentId]);

    // Organize by day
    const timetable = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
    };

    result.rows.forEach(row => {
        timetable[row.day].push(row);
    });

    return timetable;
};

/**
 * Get lecturer's teaching timetable
 * @param {string} lecturerId - Lecturer UUID
 * @returns {Promise<Object>} - Timetable organized by day
 */
const getLecturerTimetable = async (lecturerId) => {
    const result = await query(`
        SELECT 
            sub.code,
            sub.name as subject_name,
            sub.semester,
            s.section_number,
            s.day,
            s.start_time,
            s.end_time,
            s.room,
            s.building,
            s.capacity,
            s.enrolled_count
        FROM sections s
        JOIN subjects sub ON s.subject_id = sub.id
        WHERE s.lecturer_id = $1 AND s.is_active = true
        ORDER BY 
            CASE s.day
                WHEN 'monday' THEN 1
                WHEN 'tuesday' THEN 2
                WHEN 'wednesday' THEN 3
                WHEN 'thursday' THEN 4
                WHEN 'friday' THEN 5
                WHEN 'saturday' THEN 6
                WHEN 'sunday' THEN 7
            END,
            s.start_time
    `, [lecturerId]);

    // Organize by day
    const timetable = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
    };

    result.rows.forEach(row => {
        timetable[row.day].push(row);
    });

    return timetable;
};

/**
 * Get global timetable (HOP view - all sections)
 * @param {Object} filters - Optional filters (semester, programme, day)
 * @returns {Promise<Array>} - All sections
 */
const getGlobalTimetable = async (filters = {}) => {
    const { semester, programme, day } = filters;

    let queryText = `
        SELECT 
            sub.code,
            sub.name as subject_name,
            sub.semester,
            sub.programme,
            s.section_number,
            s.day,
            s.start_time,
            s.end_time,
            s.room,
            s.building,
            s.capacity,
            s.enrolled_count,
            u.lecturer_name
        FROM sections s
        JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN users u ON s.lecturer_id = u.id
        WHERE s.is_active = true
    `;

    const params = [];
    let paramCount = 1;

    if (semester) {
        queryText += ` AND sub.semester = $${paramCount}`;
        params.push(semester);
        paramCount++;
    }

    if (programme) {
        queryText += ` AND sub.programme = $${paramCount}`;
        params.push(programme);
        paramCount++;
    }

    if (day) {
        queryText += ` AND s.day = $${paramCount}`;
        params.push(day);
        paramCount++;
    }

    queryText += `
        ORDER BY 
            sub.semester,
            sub.code,
            CASE s.day
                WHEN 'monday' THEN 1
                WHEN 'tuesday' THEN 2
                WHEN 'wednesday' THEN 3
                WHEN 'thursday' THEN 4
                WHEN 'friday' THEN 5
                WHEN 'saturday' THEN 6
                WHEN 'sunday' THEN 7
            END,
            s.start_time
    `;

    const result = await query(queryText, params);
    return result.rows;
};

/**
 * Export all registrations to CSV
 * @param {Object} filters - Optional filters (semester, programme, subject)
 * @returns {Promise<string>} - CSV string
 */
const exportRegistrationsToCSV = async (filters = {}) => {
    const { semester, programme, subjectCode } = filters;

    let queryText = `
        SELECT 
            student.student_id,
            student.student_name,
            student.semester,
            student.programme,
            sub.code as subject_code,
            sub.name as subject_name,
            s.section_number,
            s.day,
            s.start_time,
            s.end_time,
            s.room,
            r.registered_at,
            r.registration_type
        FROM registrations r
        JOIN users student ON r.student_id = student.id
        JOIN sections s ON r.section_id = s.id
        JOIN subjects sub ON s.subject_id = sub.id
        WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (semester) {
        queryText += ` AND student.semester = $${paramCount}`;
        params.push(semester);
        paramCount++;
    }

    if (programme) {
        queryText += ` AND student.programme = $${paramCount}`;
        params.push(programme);
        paramCount++;
    }

    if (subjectCode) {
        queryText += ` AND sub.code = $${paramCount}`;
        params.push(subjectCode);
        paramCount++;
    }

    queryText += `
        ORDER BY 
            student.semester,
            student.programme,
            sub.code,
            s.section_number,
            student.student_id
    `;

    const result = await query(queryText, params);

    // Convert to CSV
    const csv = stringify(result.rows, {
        header: true,
        columns: [
            { key: 'student_id', header: 'Student ID' },
            { key: 'student_name', header: 'Student Name' },
            { key: 'semester', header: 'Semester' },
            { key: 'programme', header: 'Programme' },
            { key: 'subject_code', header: 'Subject Code' },
            { key: 'subject_name', header: 'Subject Name' },
            { key: 'section_number', header: 'Section' },
            { key: 'day', header: 'Day' },
            { key: 'start_time', header: 'Start Time' },
            { key: 'end_time', header: 'End Time' },
            { key: 'room', header: 'Room' },
            { key: 'registered_at', header: 'Registration Date' },
            { key: 'registration_type', header: 'Type' }
        ]
    });

    return csv;
};

/**
 * Export section enrollment summary to CSV
 * @param {Object} filters - Optional filters (semester, programme)
 * @returns {Promise<string>} - CSV string
 */
const exportSectionSummaryToCSV = async (filters = {}) => {
    const { semester, programme } = filters;

    let queryText = `
        SELECT 
            sub.code as subject_code,
            sub.name as subject_name,
            sub.semester,
            sub.programme,
            s.section_number,
            s.day,
            s.start_time,
            s.end_time,
            s.room,
            s.capacity,
            s.enrolled_count,
            (s.capacity - s.enrolled_count) as available_seats,
            ROUND((s.enrolled_count::numeric / s.capacity) * 100, 2) as utilization_percentage,
            u.lecturer_name
        FROM sections s
        JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN users u ON s.lecturer_id = u.id
        WHERE s.is_active = true
    `;

    const params = [];
    let paramCount = 1;

    if (semester) {
        queryText += ` AND sub.semester = $${paramCount}`;
        params.push(semester);
        paramCount++;
    }

    if (programme) {
        queryText += ` AND sub.programme = $${paramCount}`;
        params.push(programme);
        paramCount++;
    }

    queryText += `
        ORDER BY sub.semester, sub.code, s.section_number
    `;

    const result = await query(queryText, params);

    // Convert to CSV
    const csv = stringify(result.rows, {
        header: true,
        columns: [
            { key: 'subject_code', header: 'Subject Code' },
            { key: 'subject_name', header: 'Subject Name' },
            { key: 'semester', header: 'Semester' },
            { key: 'programme', header: 'Programme' },
            { key: 'section_number', header: 'Section' },
            { key: 'day', header: 'Day' },
            { key: 'start_time', header: 'Start Time' },
            { key: 'end_time', header: 'End Time' },
            { key: 'room', header: 'Room' },
            { key: 'lecturer_name', header: 'Lecturer' },
            { key: 'capacity', header: 'Capacity' },
            { key: 'enrolled_count', header: 'Enrolled' },
            { key: 'available_seats', header: 'Available' },
            { key: 'utilization_percentage', header: 'Utilization %' }
        ]
    });

    return csv;
};

/**
 * Get enrollment statistics — programme-scoped for HOPs
 * @param {string} hopProgramme - The HOP's programme code (optional — if omitted returns global stats)
 * @returns {Promise<Object>} - Various enrollment statistics
 */
const getEnrollmentStatistics = async (hopProgramme) => {
    // Filter sections by programme_section_links
    const sectionFilter = hopProgramme ? `
        AND sec.id IN (
            SELECT psl.section_id FROM programme_section_links psl WHERE psl.programme = $1
        )
    ` : '';
    const params = hopProgramme ? [hopProgramme] : [];

    // Total students registered in this programme's sections
    const totalStudents = await query(`
        SELECT COUNT(DISTINCT r.student_id) as count
        FROM registrations r
        JOIN sections sec ON r.section_id = sec.id
        WHERE 1=1 ${sectionFilter}
    `, params);

    // Total sections for this programme
    const totalSections = await query(`
        SELECT COUNT(*) as count FROM sections sec
        WHERE sec.is_active = true ${sectionFilter}
    `, params);

    // Total registrations for this programme
    const totalRegistrations = await query(`
        SELECT COUNT(*) as count FROM registrations r
        JOIN sections sec ON r.section_id = sec.id
        WHERE 1=1 ${sectionFilter}
    `, params);

    // Sections at capacity
    const fullSections = await query(`
        SELECT COUNT(*) as count FROM sections sec
        WHERE sec.enrolled_count >= sec.capacity AND sec.is_active = true ${sectionFilter}
    `, params);

    // Average utilization
    const avgUtilization = await query(`
        SELECT 
            CASE 
                WHEN SUM(sec.capacity) > 0 
                THEN (SUM(sec.enrolled_count)::numeric / SUM(sec.capacity)) * 100
                ELSE 0
            END as avg_utilization,
            SUM(sec.enrolled_count) as total_enrolled,
            SUM(sec.capacity) as total_capacity,
            COUNT(*) as section_count
        FROM sections sec
        WHERE sec.is_active = true AND sec.capacity > 0 ${sectionFilter}
    `, params);

    // Pending requests (these remain global — or could be scoped later)
    const pendingSwaps = await query('SELECT COUNT(*) as count FROM swap_requests WHERE status = $1', ['pending']);
    const pendingManualJoins = await query('SELECT COUNT(*) as count FROM manual_join_requests WHERE status = $1', ['pending']);

    return {
        totalStudents: parseInt(totalStudents.rows[0].count),
        totalSections: parseInt(totalSections.rows[0].count),
        totalRegistrations: parseInt(totalRegistrations.rows[0].count),
        fullSections: parseInt(fullSections.rows[0].count),
        averageUtilization: Math.round(parseFloat(avgUtilization.rows[0].avg_utilization || 0)),
        pendingSwapRequests: parseInt(pendingSwaps.rows[0].count),
        pendingManualJoinRequests: parseInt(pendingManualJoins.rows[0].count)
    };
};

module.exports = {
    getStudentTimetable,
    getLecturerTimetable,
    getGlobalTimetable,
    exportRegistrationsToCSV,
    exportSectionSummaryToCSV,
    getEnrollmentStatistics
};
