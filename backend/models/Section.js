const { query, transaction } = require('../database/connection');

class Section {
    // Create a new section
    static async create(sectionData) {
        const {
            subject_id,
            section_number,
            capacity,
            day,
            start_time,
            end_time,
            room,
            building,
            lecturer_id
        } = sectionData;

        const text = `
            INSERT INTO sections (
                subject_id, section_number, capacity, day, start_time, end_time, 
                room, building, lecturer_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            subject_id, section_number, capacity, day, start_time, end_time,
            room, building, lecturer_id
        ];

        const result = await query(text, values);
        return result.rows[0];
    }

    // Find section by ID with full details
    static async findById(id) {
        const text = `
            SELECT 
                s.*,
                sub.code as subject_code,
                sub.name as subject_name,
                sub.credit_hours,
                u.lecturer_name,
                u.email as lecturer_email
            FROM sections s
            JOIN subjects sub ON s.subject_id = sub.id
            LEFT JOIN users u ON s.lecturer_id = u.id
            WHERE s.id = $1 AND s.is_active = true
        `;

        const result = await query(text, [id]);
        return result.rows[0];
    }

    // Get all sections with filters
    static async findAll(filters = {}) {
        let text = `
            SELECT 
                s.*,
                sub.code as subject_code,
                sub.name as subject_name,
                sub.credit_hours,
                u.lecturer_name
            FROM sections s
            JOIN subjects sub ON s.subject_id = sub.id
            LEFT JOIN users u ON s.lecturer_id = u.id
            WHERE s.is_active = true
        `;

        const values = [];
        let paramCount = 1;

        if (filters.subject_id) {
            text += ` AND s.subject_id = $${paramCount}`;
            values.push(filters.subject_id);
            paramCount++;
        }

        if (filters.lecturer_id) {
            text += ` AND s.lecturer_id = $${paramCount}`;
            values.push(filters.lecturer_id);
            paramCount++;
        }

        if (filters.day) {
            text += ` AND s.day = $${paramCount}`;
            values.push(filters.day);
            paramCount++;
        }

        if (filters.has_capacity !== undefined) {
            text += ` AND s.enrolled_count < s.capacity`;
        }

        text += ' ORDER BY sub.code, s.section_number ASC';

        const result = await query(text, values);
        return result.rows;
    }

    // Check for schedule clashes for a user
    static async checkClash(userId, sectionId) {
        const text = `
            SELECT s.* FROM sections s
            WHERE s.id != $2 AND s.is_active = true
            AND s.day = (SELECT day FROM sections WHERE id = $2)
            AND (
                (s.start_time, s.end_time) OVERLAPS (
                    SELECT start_time, end_time FROM sections WHERE id = $2
                )
            )
            AND (
                -- Check if user is registered in any of these sections
                s.id IN (SELECT section_id FROM registrations WHERE student_id = $1)
                OR
                -- Check if lecturer teaching these sections
                s.lecturer_id = $1
            )
        `;

        const result = await query(text, [userId, sectionId]);
        return result.rows;
    }

    // Update section
    static async update(id, updates) {
        const allowedFields = ['capacity', 'day', 'start_time', 'end_time', 'room', 'building', 'lecturer_id'];
        const setClauses = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key) && updates[key] !== undefined) {
                setClauses.push(`${key} = $${paramCount}`);
                values.push(updates[key]);
                paramCount++;
            }
        });

        if (setClauses.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(id);
        const text = `
            UPDATE sections 
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(text, values);
        return result.rows[0];
    }

    // Deactivate section
    static async deactivate(id) {
        const text = 'UPDATE sections SET is_active = false, updated_at = NOW() WHERE id = $1';
        await query(text, [id]);
    }

    // Get sections by lecturer
    static async findByLecturer(lecturerId) {
        return await this.findAll({ lecturer_id: lecturerId });
    }

    // Check if section has capacity
    static async hasCapacity(sectionId) {
        const text = 'SELECT (enrolled_count < capacity) as has_capacity FROM sections WHERE id = $1';
        const result = await query(text, [sectionId]);
        return result.rows[0]?.has_capacity || false;
    }
}

module.exports = Section;
