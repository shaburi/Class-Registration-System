const { query, transaction } = require('../database/connection');

class Registration {
    // Create a new registration
    static async create(registrationData) {
        const { student_id, section_id, registration_type, approved_by } = registrationData;

        const text = `
            INSERT INTO registrations (student_id, section_id, registration_type, approved_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const values = [student_id, section_id, registration_type || 'normal', approved_by];
        const result = await query(text, values);
        return result.rows[0];
    }

    // Find registration by ID
    static async findById(id) {
        const text = `
            SELECT 
                r.*,
                sec.section_number,
                sec.day,
                sec.start_time,
                sec.end_time,
                sec.room,
                sub.code as subject_code,
                sub.name as subject_name,
                sub.credit_hours,
                u.lecturer_name
            FROM registrations r
            JOIN sections sec ON r.section_id = sec.id
            JOIN subjects sub ON sec.subject_id = sub.id
            LEFT JOIN users u ON sec.lecturer_id = u.id
            WHERE r.id = $1
        `;

        const result = await query(text, [id]);
        return result.rows[0];
    }

    // Get all registrations for a student
    static async findByStudent(studentId) {
        const text = `
            SELECT 
                r.*,
                sec.section_number,
                sec.day,
                sec.start_time,
                sec.end_time,
                sec.room,
                sub.code as subject_code,
                sub.name as subject_name,
                sub.credit_hours,
                u.lecturer_name
            FROM registrations r
            JOIN sections sec ON r.section_id = sec.id
            JOIN subjects sub ON sec.subject_id = sub.id
            LEFT JOIN users u ON sec.lecturer_id = u.id
            WHERE r.student_id = $1
            ORDER BY sec.day, sec.start_time
        `;

        const result = await query(text, [studentId]);
        return result.rows;
    }

    // Get all registrations for a section
    static async findBySection(sectionId) {
        const text = `
            SELECT 
                r.*,
                u.student_id,
                u.student_name,
                u.email,
                u.semester,
                u.programme
            FROM registrations r
            JOIN users u ON r.student_id = u.id
            WHERE r.section_id = $1
            ORDER BY u.student_name
        `;

        const result = await query(text, [sectionId]);
        return result.rows;
    }

    // Check if student is already registered for section
    static async exists(studentId, sectionId) {
        const text = 'SELECT id FROM registrations WHERE student_id = $1 AND section_id = $2';
        const result = await query(text, [studentId, sectionId]);
        return result.rows.length > 0;
    }

    // Check if student is registered for same subject (different section)
    static async existsForSubject(studentId, subjectId) {
        const text = `
            SELECT r.* FROM registrations r
            JOIN sections sec ON r.section_id = sec.id
            WHERE r.student_id = $1 AND sec.subject_id = $2
        `;
        const result = await query(text, [studentId, subjectId]);
        return result.rows[0];
    }

    // Delete a registration
    static async delete(id) {
        const text = 'DELETE FROM registrations WHERE id = $1 RETURNING *';
        const result = await query(text, [id]);
        return result.rows[0];
    }

    // Delete by student and section
    static async deleteByStudentAndSection(studentId, sectionId) {
        const text = 'DELETE FROM registrations WHERE student_id = $1 AND section_id = $2 RETURNING *';
        const result = await query(text, [studentId, sectionId]);
        return result.rows[0];
    }

    // Swap two students' sections (transaction)
    static async swap(student1Id, section1Id, student2Id, section2Id) {
        return await transaction(async (client) => {
            // Delete both existing registrations
            await client.query(
                'DELETE FROM registrations WHERE (student_id = $1 AND section_id = $2) OR (student_id = $3 AND section_id = $4)',
                [student1Id, section1Id, student2Id, section2Id]
            );

            // Create new registrations (swapped)
            await client.query(
                'INSERT INTO registrations (student_id, section_id, registration_type) VALUES ($1, $2, $3), ($4, $5, $6)',
                [student1Id, section2Id, 'swap', student2Id, section1Id, 'swap']
            );

            return true;
        });
    }

    // Get registration statistics
    static async getStatistics() {
        const text = `
            SELECT 
                COUNT(*) as total_registrations,
                COUNT(DISTINCT student_id) as total_students,
                COUNT(DISTINCT section_id) as unique_sections,
                COUNT(CASE WHEN registration_type = 'normal' THEN 1 END) as normal_registrations,
                COUNT(CASE WHEN registration_type = 'manual' THEN 1 END) as manual_registrations,
                COUNT(CASE WHEN registration_type = 'swap' THEN 1 END) as swap_registrations
            FROM registrations
        `;

        const result = await query(text);
        return result.rows[0];
    }
}

module.exports = Registration;
