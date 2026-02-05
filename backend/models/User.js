const { query } = require('../database/connection');
const bcrypt = require('bcryptjs');

class User {
    // Create a new user
    static async create(userData) {
        const {
            email,
            firebase_uid,
            role,
            student_id,
            student_name,
            semester,
            programme,
            lecturer_id,
            lecturer_name,
            department,
            password
        } = userData;

        let password_hash = null;
        if (password) {
            password_hash = await bcrypt.hash(password, 10);
        }

        const text = `
            INSERT INTO users (
                email, firebase_uid, role, student_id, student_name, semester, programme,
                lecturer_id, lecturer_name, department, password_hash
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, email, role, student_id, student_name, lecturer_id, lecturer_name, created_at
        `;

        const values = [
            email, firebase_uid, role, student_id, student_name, semester, programme,
            lecturer_id, lecturer_name, department, password_hash
        ];

        const result = await query(text, values);
        return result.rows[0];
    }

    // Find user by ID
    static async findById(id) {
        const text = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
        const result = await query(text, [id]);
        return result.rows[0];
    }

    // Find user by email
    static async findByEmail(email) {
        const text = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
        const result = await query(text, [email]);
        return result.rows[0];
    }

    // Find user by Firebase UID
    static async findByFirebaseUid(firebase_uid) {
        const text = 'SELECT * FROM users WHERE firebase_uid = $1 AND is_active = true';
        const result = await query(text, [firebase_uid]);
        return result.rows[0];
    }

    // Verify password
    static async verifyPassword(user, password) {
        if (!user.password_hash) return false;
        return await bcrypt.compare(password, user.password_hash);
    }

    // Update last login
    static async updateLastLogin(userId, ipAddress) {
        const text = `
            UPDATE users 
            SET last_login_at = NOW(), failed_login_attempts = 0
            WHERE id = $1
        `;
        await query(text, [userId]);
    }

    // Increment failed login attempts
    static async incrementFailedAttempts(userId) {
        const text = `
            UPDATE users 
            SET failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE 
                    WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
                    ELSE locked_until
                END
            WHERE id = $1
            RETURNING failed_login_attempts, locked_until
        `;
        const result = await query(text, [userId]);
        return result.rows[0];
    }

    // Check if user is locked
    static async isLocked(userId) {
        const text = 'SELECT locked_until FROM users WHERE id = $1';
        const result = await query(text, [userId]);
        const user = result.rows[0];

        if (!user || !user.locked_until) return false;
        return new Date(user.locked_until) > new Date();
    }

    // Get all users by role
    static async findByRole(role) {
        const text = 'SELECT * FROM users WHERE role = $1 AND is_active = true ORDER BY created_at DESC';
        const result = await query(text, [role]);
        return result.rows;
    }

    // Update user
    static async update(userId, updates) {
        const allowedFields = ['student_name', 'lecturer_name', 'email', 'semester', 'programme', 'department'];
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

        values.push(userId);
        const text = `
            UPDATE users 
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(text, values);
        return result.rows[0];
    }

    // Deactivate user (soft delete)
    static async deactivate(userId) {
        const text = 'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1';
        await query(text, [userId]);
    }
}

module.exports = User;
