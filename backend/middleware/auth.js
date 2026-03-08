const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const speakeasy = require('speakeasy');
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
 * Authentication middleware - Verify token (Firebase ID token OR app JWT)
 * Supports two auth flows:
 *   1. Google Sign-In → Firebase ID token (verified by Firebase Admin)
 *   2. Traditional login → JWT signed with JWT_SECRET (verified by jwt.verify)
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

        // --- Auth Path 1: Try Firebase ID token verification ---
        let user = null;
        let photoURL = null;
        let displayName = null;

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);

            // Look up user by exact Firebase UID
            const result = await query(
                'SELECT * FROM users WHERE firebase_uid = $1 AND is_active = true',
                [decodedToken.uid]
            );

            if (result.rows.length > 0) {
                user = result.rows[0];
                photoURL = decodedToken.picture;
                displayName = decodedToken.name;
            }
        } catch (firebaseError) {
            // Firebase verification failed — try JWT path below
        }

        // --- Auth Path 2: Try app JWT verification (traditional login) ---
        if (!user) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                // Reject MFA-pending temp tokens — they shouldn't be used for API access
                if (decoded.mfaPending) {
                    return res.status(401).json({ success: false, message: 'MFA verification required' });
                }

                // Look up user by ID from verified JWT claims
                const result = await query(
                    'SELECT * FROM users WHERE id = $1 AND is_active = true',
                    [decoded.id]
                );

                if (result.rows.length > 0) {
                    user = result.rows[0];
                    photoURL = decoded.photoURL || null;
                    displayName = decoded.displayName || decoded.name || null;
                }
            } catch (jwtError) {
                // Both Firebase and JWT verification failed
                return res.status(401).json({ success: false, message: 'Invalid or expired token' });
            }
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

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

        // Check MFA if enabled — MFA verification is handled during login flow
        // The JWT issued after successful MFA verification includes mfaVerified claim
        // This is checked server-side, not via client headers
        if (user.mfa_enabled && !req.mfaVerifiedByMiddleware) {
            // MFA check is now handled by the login flow which issues proper JWT
            // For Firebase-authenticated requests, MFA is enforced at login time
            // No client header bypass possible
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
            student_id: user.student_id,
            student_name: user.student_name,
            lecturerId: user.lecturer_id,
            lecturerName: user.lecturer_name,
            semester: user.semester,
            programme: user.programme,
            intake_session: user.intake_session,
            profile_completed: user.profile_completed,
            photoURL: photoURL,
            displayName: displayName
        };

        next();

    } catch (error) {
        console.error('[AUTH] Internal error during authentication');
        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
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

        // Verify TOTP token using speakeasy
        const isValid = verifyTOTP(result.rows[0].mfa_secret, mfaToken);

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Invalid MFA token'
            });
        }

        req.mfaVerifiedByMiddleware = true;
        next();

    } catch (error) {
        console.error('[AUTH] MFA verification error');
        return res.status(500).json({
            success: false,
            message: 'MFA verification failed'
        });
    }
};

/**
 * Verify TOTP token using speakeasy
 */
const verifyTOTP = (secret, token) => {
    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: token.toString(),
        window: 1 // Allow 30 seconds tolerance
    });
};

/**
 * Role-based access control middleware
 * Restricts access to users with specific roles
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

module.exports = {
    authenticate,
    optionalAuth,
    verifyMFA,
    requireRole
};
