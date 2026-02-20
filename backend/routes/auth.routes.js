const express = require('express');
const router = express.Router();
const { verifyGoogleToken } = require('../services/google-auth.service');
const { traditionalLogin } = require('../services/traditional-auth.service');

/**
 * POST /api/auth/google
 * Verify Google ID token and authenticate user
 */
router.post('/google', async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: 'ID token is required'
            });
        }

        const result = await verifyGoogleToken(idToken);

        res.json(result);
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(401).json({
            success: false,
            message: error.message || 'Authentication failed'
        });
    }
});

/**
 * POST /api/auth/login
 * Traditional email/password login (for demo accounts)
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const result = await traditionalLogin(email, password);

        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({
            success: false,
            message: error.message || 'Login failed'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side should clear token)
 */
const { authenticate } = require('../middleware/auth');
const mfaService = require('../services/mfa.service');
const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');

/**
 * GET /api/auth/me
 * Get current authenticated user details
 */
router.get('/me', authenticate, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// ============================================================================
// MFA (Two-Factor Authentication) Routes
// ============================================================================

/**
 * GET /api/auth/mfa/status
 * Get current MFA status for the authenticated user
 */
router.get('/mfa/status', authenticate, async (req, res) => {
    try {
        const status = await mfaService.getMFAStatus(req.user.id);
        res.json({ success: true, ...status });
    } catch (error) {
        console.error('MFA status error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/auth/mfa/setup
 * Generate TOTP secret and QR code for setup
 * Requires authentication - user must be logged in
 */
router.post('/mfa/setup', authenticate, async (req, res) => {
    try {
        const result = await mfaService.generateSecret(req.user.email);
        res.json({
            success: true,
            secret: result.secret,
            qrCodeDataUrl: result.qrCodeDataUrl
        });
    } catch (error) {
        console.error('MFA setup error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/auth/mfa/enable
 * Enable MFA after verifying the TOTP token
 * Body: { secret, token }
 */
router.post('/mfa/enable', authenticate, async (req, res) => {
    try {
        const { secret, token } = req.body;

        if (!secret || !token) {
            return res.status(400).json({
                success: false,
                message: 'Secret and verification token are required'
            });
        }

        const result = await mfaService.enableMFA(req.user.id, secret, token);
        res.json({
            success: true,
            message: 'Two-factor authentication enabled successfully',
            backupCodes: result.backupCodes
        });
    } catch (error) {
        console.error('MFA enable error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/auth/mfa/disable
 * Disable MFA (requires current TOTP token for security)
 * Body: { token }
 */
router.post('/mfa/disable', authenticate, async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Current verification code is required to disable 2FA'
            });
        }

        await mfaService.disableMFA(req.user.id, token);
        res.json({
            success: true,
            message: 'Two-factor authentication disabled successfully'
        });
    } catch (error) {
        console.error('MFA disable error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/auth/mfa/verify
 * Verify MFA token during login flow
 * Body: { tempToken, mfaToken }
 */
router.post('/mfa/verify', async (req, res) => {
    try {
        const { tempToken, mfaToken } = req.body;

        if (!tempToken || !mfaToken) {
            return res.status(400).json({
                success: false,
                message: 'Temporary token and MFA code are required'
            });
        }

        // Verify the temp token
        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please login again.'
            });
        }

        if (!decoded.mfaPending) {
            return res.status(400).json({
                success: false,
                message: 'Invalid token type'
            });
        }

        // Verify the MFA token
        const mfaResult = await mfaService.verifyMFAToken(decoded.id, mfaToken);

        // MFA verified - now issue the full session token
        const userResult = await query(
            'SELECT * FROM users WHERE id = $1 AND is_active = true',
            [decoded.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        const user = userResult.rows[0];

        // Update last login
        await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

        // Generate full JWT token
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

        const response = {
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

        if (mfaResult.usedBackupCode) {
            response.warning = `Backup code used. ${mfaResult.remainingBackupCodes} codes remaining.`;
        }

        res.json(response);
    } catch (error) {
        console.error('MFA verify error:', error);
        res.status(401).json({ success: false, message: error.message });
    }
});

module.exports = router;
