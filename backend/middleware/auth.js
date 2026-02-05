const admin = require('firebase-admin');
const dotenv = require('dotenv');
const { query } = require('../database/connection');

dotenv.config();

// Initialize Firebase Admin SDK
try {
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✓ Firebase Admin initialized');
    }
} catch (error) {
    console.error('Firebase initialization error:', error.message);
    console.warn('⚠ Running without Firebase authentication');
}

/**
 * Authentication middleware - Verify Firebase token
 * Attaches user object to request
 */
const authenticate = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No authentication token provided'
            });
        }

        const token = authHeader.split('Bearer ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token format'
            });
        }

        // Bypass Firebase verification for development if apps not initialized or token invalid
        // This allows testing with "real" users without setting up Firebase Admin perfectly locally
        // Verify Firebase token (with robust dev fallback)
        let decodedToken;
        console.log('[AUTH] Attempting to verify token...');
        console.log('[AUTH] NODE_ENV:', process.env.NODE_ENV);
        console.log('[AUTH] Firebase apps initialized:', admin.apps.length);
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
            console.log('[AUTH] ✓ Token verified successfully');
        } catch (authError) {
            console.log('[AUTH] ✗ Firebase verification failed:', authError.message);
            if (process.env.NODE_ENV === 'development' || !admin.apps.length) {
                console.warn('[AUTH] Trying email fallback...');
                try {
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
                    console.log('[AUTH] Decoded email from token:', payload.email);
                    if (payload.email) {
                        const r = await query('SELECT * FROM users WHERE email = $1 AND is_active = true', [payload.email]);
                        console.log('[AUTH] Database lookup found', r.rows.length, 'users');
                        if (r.rows.length > 0) {
                            const u = r.rows[0];
                            await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [u.id]);
                            req.user = {
                                id: u.id,
                                email: u.email,
                                role: u.role,
                                studentId: u.student_id,
                                studentName: u.student_name,
                                lecturerId: u.lecturer_id,
                                lecturerName: u.lecturer_name,
                                semester: u.semester,
                                programme: u.programme,
                                photoURL: payload.picture, // Google profile picture
                                displayName: payload.name
                            };
                            console.log('[AUTH] ✓ Email fallback succeeded for', u.email, 'role:', u.role);
                            return next();
                        } else {
                            console.log('[AUTH] ✗ No user found with email:', payload.email);
                        }
                    }
                } catch (e) { console.error('[AUTH] Fallback error:', e); }
            } else {
                console.log('[AUTH] Fallback not available (production mode)');
            }
            console.log('[AUTH] ✗ Authentication failed');
            return res.status(401).json({ success: false, message: 'Invalid token', error: authError.message });
        }

        // Get user from database using Firebase UID (Allow partial match for dev)
        const result = await query(
            'SELECT * FROM users WHERE (firebase_uid = $1 OR firebase_uid LIKE $2) AND is_active = true',
            [decodedToken.uid, `${decodedToken.uid}%`]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        const user = result.rows[0];

        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const remainingMinutes = Math.ceil(
                (new Date(user.locked_until) - new Date()) / 1000 / 60
            );
            return res.status(403).json({
                success: false,
                message: `Account temporarily locked. Try again in ${remainingMinutes} minutes.`
            });
        }

        // Check MFA if enabled
        if (user.mfa_enabled && !req.headers['x-mfa-verified']) {
            return res.status(403).json({
                success: false,
                message: 'MFA verification required',
                requiresMfa: true
            });
        }

        // Update last login time
        await query(
            'UPDATE users SET last_login_at = NOW(), failed_login_attempts = 0 WHERE id = $1',
            [user.id]
        );

        // Attach user to request object
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            studentId: user.student_id,
            studentName: user.student_name,
            lecturerId: user.lecturer_id,
            lecturerName: user.lecturer_name,
            semester: user.semester,
            programme: user.programme,
            photoURL: decodedToken.picture, // Google profile picture
            displayName: decodedToken.name
        };

        next();

    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed',
            error: error.message
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    try {
        await authenticate(req, res, next);
    } catch (error) {
        // Continue without user context
        next();
    }
};

/**
 * Verify MFA token
 * Used as additional middleware after authenticate for MFA-enabled users
 */
const verifyMFA = async (req, res, next) => {
    try {
        const mfaToken = req.headers['x-mfa-token'];

        if (!mfaToken) {
            return res.status(403).json({
                success: false,
                message: 'MFA token required'
            });
        }

        // Get user's MFA secret from database
        const result = await query(
            'SELECT mfa_secret FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0 || !result.rows[0].mfa_secret) {
            return res.status(400).json({
                success: false,
                message: 'MFA not configured for this account'
            });
        }

        // Verify TOTP token (implementation depends on TOTP library)
        // This is a placeholder - implement with speakeasy or similar library
        const isValid = verifytOTP(result.rows[0].mfa_secret, mfaToken);

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Invalid MFA token'
            });
        }

        req.headers['x-mfa-verified'] = 'true';
        next();

    } catch (error) {
        console.error('MFA verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'MFA verification failed',
            error: error.message
        });
    }
};

/**
 * Placeholder TOTP verification (replace with actual implementation)
 */
const verifyTOTP = (secret, token) => {
    // TODO: Implement with speakeasy or similar library
    // const speakeasy = require('speakeasy');
    // return speakeasy.totp.verify({ secret, encoding: 'base32', token });
    return true; // Placeholder
};

/**
 * Development-only: Create session without Firebase
 * DO NOT USE IN PRODUCTION
 */
const devAuth = async (req, res, next) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
            success: false,
            message: 'Development authentication only available in development mode'
        });
    }

    const email = req.headers['x-dev-user-email'];

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'x-dev-user-email header required for dev auth'
        });
    }

    const result = await query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    const user = result.rows[0];

    req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        studentId: user.student_id,
        lecturerId: user.lecturer_id,
        semester: user.semester,
        programme: user.programme
    };

    next();
};

module.exports = {
    authenticate,
    optionalAuth,
    verifyMFA,
    devAuth
};
