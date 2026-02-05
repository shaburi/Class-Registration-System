const { query } = require('../database/connection');

class Subject {
    // Create a new subject
    static async create(subjectData) {
        const { code, name, credit_hours, semester, programme, description, prerequisites, created_by } = subjectData;

        const text = `
            INSERT INTO subjects (code, name, credit_hours, semester, programme, description, prerequisites, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [code, name, credit_hours, semester, programme, description, prerequisites, created_by];
        const result = await query(text, values);
        return result.rows[0];
    }

    // Find subject by ID
    static async findById(id) {
        const text = 'SELECT * FROM subjects WHERE id = $1 AND is_active = true';
        const result = await query(text, [id]);
        return result.rows[0];
    }

    // Find subject by code
    static async findByCode(code) {
        const text = 'SELECT * FROM subjects WHERE code = $1 AND is_active = true';
        const result = await query(text, [code]);
        return result.rows[0];
    }

    // Get all subjects with optional filters
    static async findAll(filters = {}) {
        let text = 'SELECT * FROM subjects WHERE is_active = true';
        const values = [];
        let paramCount = 1;

        if (filters.semester) {
            text += ` AND semester = $${paramCount}`;
            values.push(filters.semester);
            paramCount++;
        }

        if (filters.programme) {
            text += ` AND programme = $${paramCount}`;
            values.push(filters.programme);
            paramCount++;
        }

        text += ' ORDER BY code ASC';

        const result = await query(text, values);
        return result.rows;
    }

    // Update subject
    static async update(id, updates) {
        const allowedFields = ['name', 'credit_hours', 'description', 'prerequisites'];
        const setClauses = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
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
            UPDATE subjects 
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(text, values);
        return result.rows[0];
    }

    // Deactivate subject (soft delete)
    static async deactivate(id) {
        const text = 'UPDATE subjects SET is_active = false, updated_at = NOW() WHERE id = $1';
        await query(text, [id]);
    }

    // Get subject with sections
    static async getWithSections(id) {
        const text = `
            SELECT 
                s.*,
                json_agg(
                    json_build_object(
                        'id', sec.id,
                        'section_number', sec.section_number,
                        'capacity', sec.capacity,
                        'enrolled_count', sec.enrolled_count,
                        'day', sec.day,
                        'start_time', sec.start_time,
                        'end_time', sec.end_time,
                        'room', sec.room,
                        'lecturer_name', COALESCE(u.lecturer_name, u.student_name)
                    )
                ) FILTER (WHERE sec.id IS NOT NULL) as sections
            FROM subjects s
            LEFT JOIN sections sec ON s.id = sec.subject_id AND sec.is_active = true
            LEFT JOIN users u ON sec.lecturer_id = u.id
            WHERE s.id = $1 AND s.is_active = true
            GROUP BY s.id
        `;

        const result = await query(text, [id]);
        return result.rows[0];
    }
}

module.exports = Subject;
