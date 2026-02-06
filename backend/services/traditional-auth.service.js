const { query } = require('../database/connection');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Traditional email/password login (for demo accounts)
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User data and JWT token
 */
async function traditionalLogin(email, password) {
    try {
        // Find user by email
        const result = await query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (result.rows.length === 0) {
            throw new Error('Invalid email or password');
        }

        const user = result.rows[0];

        // Verify password
        if (!user.password_hash) {
            throw new Error('This account must use Google Sign-In');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // Update last login
        await query(
            'UPDATE users SET last_login_at = NOW() WHERE id = $1',
            [user.id]
        );

        // Generate JWT token
        const jwtToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                student_id: user.student_id,
                student_name: user.student_name,
                lecturer_id: user.lecturer_id,
                lecturer_name: user.lecturer_name,
                semester: user.semester,
                programme: user.programme,
                intake_session: user.intake_session
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return {
            success: true,
            token: jwtToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                studentId: user.student_id,
                studentName: user.student_name,
                lecturerId: user.lecturer_id,
                lecturerName: user.lecturer_name,
                semester: user.semester,
                programme: user.programme,
                department: user.department,
                intake_session: user.intake_session
            }
        };
    } catch (error) {
        console.error('Traditional login error:', error);
        throw error;
    }
}

module.exports = {
    traditionalLogin
};
