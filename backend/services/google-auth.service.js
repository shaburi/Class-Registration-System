const { admin } = require('../config/firebase-admin');
const { query } = require('../database/connection');
const jwt = require('jsonwebtoken');

// List of HOP email addresses (can be moved to environment variables)
const HOP_EMAILS = (process.env.HOP_EMAILS || 'hop@uptm.edu.my').split(',').map(e => e.trim());

/**
 * Determine user role based on email pattern
 * @param {string} email - User's email address
 * @returns {string} - User role: 'student', 'lecturer', or 'hop'
 */
function determineRole(email) {
    if (!email) {
        throw new Error('Email is required');
    }

    // Check if email is from UPTM domains
    const isUPTMEmail = email.endsWith('@uptm.edu.my') || email.endsWith('@student.uptm.edu.my');

    if (!isUPTMEmail) {
        throw new Error('Only UPTM email addresses (@uptm.edu.my or @student.uptm.edu.my) are allowed');
    }

    // All @student.uptm.edu.my emails are students
    if (email.endsWith('@student.uptm.edu.my')) {
        return 'student';
    }

    // For @uptm.edu.my emails:
    if (HOP_EMAILS.includes(email.toLowerCase())) {
        return 'hop';
    }

    // Extract the local part (before @)
    const localPart = email.split('@')[0];

    // Check if student (starts with KL)
    if (localPart.toUpperCase().startsWith('KL')) {
        return 'student';
    }

    // Otherwise, it's a lecturer
    return 'lecturer';
}

/**
 * Verify Google ID token and create/update user
 * @param {string} idToken - Google ID token from Firebase client
 * @returns {Promise<Object>} - User data and JWT token
 */
async function verifyGoogleToken(idToken) {
    try {
        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        const { email, uid, name, picture } = decodedToken;

        if (!email) {
            throw new Error('Email not found in token');
        }

        // Determine role based on email
        const role = determineRole(email);

        // Check if user exists
        let user = await query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (user.rows.length === 0) {
            // Create new user
            user = await createUserFromGoogle(email, uid, name, picture, role);
        } else {
            // Update existing user's firebase_uid if needed
            user = user.rows[0];
            if (user.firebase_uid !== uid) {
                await query(
                    'UPDATE users SET firebase_uid = $1, last_login_at = NOW() WHERE id = $2',
                    [uid, user.id]
                );
            } else {
                // Just update last login
                await query(
                    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
                    [user.id]
                );
            }
        }

        // Generate JWT token for API authentication
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
                programme: user.programme
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
                photoURL: picture, // Google profile picture
                displayName: name
            }
        };
    } catch (error) {
        console.error('Google token verification error:', error);
        throw new Error(`Authentication failed: ${error.message}`);
    }
}

/**
 * Create a new user from Google sign-in
 * @param {string} email - User email
 * @param {string} firebaseUid - Firebase UID
 * @param {string} name - Display name
 * @param {string} picture - Profile picture URL
 * @param {string} role - User role
 * @returns {Promise<Object>} - Created user
 */
async function createUserFromGoogle(email, firebaseUid, name, picture, role) {
    let result;

    if (role === 'student') {
        // Extract student ID from email (e.g., KL123456@uptm.edu.my -> KL123456)
        const studentId = email.split('@')[0];

        // For students, we need semester and programme info
        // You may want to prompt for this during first login or have a default
        const defaultSemester = 1;
        const defaultProgramme = 'Computer Science';

        result = await query(`
            INSERT INTO users (email, firebase_uid, role, student_id, student_name, semester, programme)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [email, firebaseUid, role, studentId, name, defaultSemester, defaultProgramme]);
    } else if (role === 'lecturer') {
        // Generate lecturer ID (you may want a different strategy)
        const lecturerId = 'L' + Date.now().toString().slice(-6);
        const defaultDepartment = 'Computer Science';

        result = await query(`
            INSERT INTO users (email, firebase_uid, role, lecturer_id, lecturer_name, department)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [email, firebaseUid, role, lecturerId, name, defaultDepartment]);
    } else if (role === 'hop') {
        // HOP is a special lecturer
        const lecturerId = 'L' + Date.now().toString().slice(-6);
        const defaultDepartment = 'Computer Science';

        result = await query(`
            INSERT INTO users (email, firebase_uid, role, lecturer_id, lecturer_name, department)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [email, firebaseUid, role, lecturerId, name, defaultDepartment]);
    }

    return result.rows[0];
}

module.exports = {
    verifyGoogleToken,
    determineRole
};
